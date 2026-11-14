import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import ai, content
from app.config import Settings, get_settings
from app.db import get_db
from app.models import Artifact, Review, UsageLog, User
from app.routes.learning import completed_days, require_access
from app.security import current_user

log = logging.getLogger("pmforge.mentor")
router = APIRouter(prefix="/api/v1", tags=["mentor"])


def get_ai_client(settings: Settings = Depends(get_settings)) -> ai.AIClient:
    if not settings.openai_api_key:
        raise HTTPException(503, "Mentor is not configured")
    return ai.OpenAIClient(settings.openai_api_key)


def enforce_limits(db: Session, user: User, kind: str, settings: Settings) -> None:
    today = date.today()
    used = db.scalar(select(func.count()).select_from(UsageLog).where(
        UsageLog.user_id == user.id, UsageLog.kind == kind, UsageLog.day == today)) or 0
    cap = settings.max_reviews_per_day if kind == "review" else settings.max_messages_per_day
    if used >= cap:
        raise HTTPException(429, "daily_limit_reached")
    month_cost = db.scalar(select(func.coalesce(func.sum(UsageLog.cost_usd), 0.0)).where(
        UsageLog.user_id == user.id, UsageLog.day >= today.replace(day=1))) or 0.0
    if month_cost >= settings.monthly_ai_budget_usd:
        raise HTTPException(429, "monthly_budget_reached")


def record_usage(db: Session, user: User, kind: str, cost: float) -> None:
    db.add(UsageLog(user_id=user.id, kind=kind, day=date.today(), cost_usd=cost))


JOURNAL_RUBRIC = [
    "Answers the question that was asked, in the learner's own words",
    "Is specific to a real or realistic organisation, with named roles or systems",
    "Uses the ideas from the lesson correctly",
    "Names evidence, owners or next actions rather than general statements",
]


class ArtifactIn(BaseModel):
    content: str = Field(min_length=20, max_length=8000)


@router.post("/lessons/{day}/artifact", status_code=201)
def submit_artifact(day: int, body: ArtifactIn, user: User = Depends(current_user),
                    db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    meta = require_access(day, user, completed_days(db, user.id), settings)
    if meta["type"] not in ("B", "S", "K", "P", "A") and not content.journal_prompt(day):
        raise HTTPException(422, "This lesson does not take an artifact")
    art = Artifact(user_id=user.id, day=day, content=body.content)
    db.add(art)
    db.commit()
    return {"artifact_id": art.id}


@router.post("/artifacts/{artifact_id}/review")
def review(artifact_id: str, user: User = Depends(current_user), db: Session = Depends(get_db),
           settings: Settings = Depends(get_settings), client: ai.AIClient = Depends(get_ai_client)):
    art = db.get(Artifact, artifact_id)
    if art is None or art.user_id != user.id:  # ownership check: same answer for missing and foreign
        raise HTTPException(404, "Artifact not found")
    meta = content.get_day(art.day) or {}
    prompt = content.journal_prompt(art.day)
    rubric = meta.get("rubric") or JOURNAL_RUBRIC
    enforce_limits(db, user, "review", settings)
    try:
        result, cost, redacted = ai.review_artifact(client, settings, user_id=user.id, rubric=rubric,
                                                    lesson_title=meta["title"], content=art.content, prompt=prompt)
    except ai.AIRefused:
        raise HTTPException(422, "content_not_allowed") from None
    except ai.AIError:
        log.exception("review failed")
        raise HTTPException(502, "Review is unavailable, please retry") from None
    record_usage(db, user, "review", cost)
    row = Review(artifact_id=art.id, user_id=user.id, score=result.score, feedback=result.model_dump())
    db.add(row)
    db.commit()
    return {"review_id": row.id, **result.model_dump(), "redacted": redacted}


class ChatIn(BaseModel):
    day: int
    message: str = Field(min_length=1, max_length=1500)


@router.post("/mentor/chat")
def mentor_chat(body: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db),
                settings: Settings = Depends(get_settings), client: ai.AIClient = Depends(get_ai_client)):
    meta = require_access(body.day, user, completed_days(db, user.id), settings)
    enforce_limits(db, user, "chat", settings)
    try:
        reply, cost, redacted = ai.chat(
            client, settings, user_id=user.id, lesson_title=meta["title"], message=body.message)
    except ai.AIRefused:
        raise HTTPException(422, "content_not_allowed") from None
    except ai.AIError:
        log.exception("chat failed")
        raise HTTPException(502, "Mentor is unavailable, please retry") from None
    record_usage(db, user, "chat", cost)
    db.commit()
    return {"reply": reply, "redacted": redacted}
