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


def estimate_cost(settings: Settings, kind: str) -> float:
    """Worst-case cost of one call, used to reserve budget before the model runs."""
    if kind == "review":
        c = ai.Completion("", settings.max_artifact_chars + 1500, 700)
    else:
        c = ai.Completion("", settings.max_chat_chars + 800, ai.CHAT_MAX_OUTPUT_TOKENS)
    return ai.cost_usd(settings, kind, c)


def _too_many(code: str) -> HTTPException:
    return HTTPException(429, code)


def reserve_usage(db: Session, user: User, kind: str, settings: Settings) -> UsageLog:
    """Claim a slot and the worst-case cost BEFORE calling the model.

    The row is committed first and the limits are counted afterwards, with this row included. Two requests
    racing for the last slot both see each other, so at least one is refused and the caps cannot be exceeded
    by parallel calls. A refused request removes its own row.
    """
    today = date.today()
    row = UsageLog(user_id=user.id, kind=kind, day=today, cost_usd=estimate_cost(settings, kind))
    db.add(row)
    db.commit()
    try:
        used = db.scalar(select(func.count()).select_from(UsageLog).where(
            UsageLog.user_id == user.id, UsageLog.kind == kind, UsageLog.day == today)) or 0
        cap = settings.max_reviews_per_day if kind == "review" else settings.max_messages_per_day
        if used > cap:
            raise _too_many("daily_limit_reached")
        month_start = today.replace(day=1)
        month_cost = db.scalar(select(func.coalesce(func.sum(UsageLog.cost_usd), 0.0)).where(
            UsageLog.user_id == user.id, UsageLog.day >= month_start)) or 0.0
        if month_cost > settings.monthly_ai_budget_usd:
            raise _too_many("monthly_budget_reached")
        day_cost = db.scalar(select(func.coalesce(func.sum(UsageLog.cost_usd), 0.0)).where(
            UsageLog.day == today)) or 0.0
        all_month = db.scalar(select(func.coalesce(func.sum(UsageLog.cost_usd), 0.0)).where(
            UsageLog.day >= month_start)) or 0.0
        if day_cost > settings.global_daily_ai_budget_usd or all_month > settings.global_monthly_ai_budget_usd:
            log.error("global AI budget reached")
            raise _too_many("ai_capacity_reached")
    except HTTPException:
        db.delete(row)
        db.commit()
        raise
    return row


def settle_usage(db: Session, row: UsageLog, cost: float | None) -> None:
    """Replace the reservation with the real cost. None means the call never reached the model: release the slot."""
    if cost is None:
        db.delete(row)
    else:
        row.cost_usd = cost
    db.commit()


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
    usage = reserve_usage(db, user, "review", settings)
    try:
        result, cost, redacted = ai.review_artifact(client, settings, user_id=user.id, rubric=rubric,
                                                    lesson_title=meta["title"], content=art.content, prompt=prompt)
    except ai.AIRefused:
        settle_usage(db, usage, 0.0)  # moderation is not billed, but the attempt still counts toward the daily cap
        raise HTTPException(422, "content_not_allowed") from None
    except ai.AIError as exc:
        settle_usage(db, usage, exc.cost)  # a completed but refused call is billed and counted; a timeout is not
        log.exception("review failed")
        raise HTTPException(502, "Review is unavailable, please retry") from None
    row = Review(artifact_id=art.id, user_id=user.id, score=result.score, feedback=result.model_dump())
    db.add(row)
    settle_usage(db, usage, cost)
    return {"review_id": row.id, **result.model_dump(), "redacted": redacted}


class ChatIn(BaseModel):
    day: int
    message: str = Field(min_length=1, max_length=1500)


@router.post("/mentor/chat")
def mentor_chat(body: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db),
                settings: Settings = Depends(get_settings), client: ai.AIClient = Depends(get_ai_client)):
    meta = require_access(body.day, user, completed_days(db, user.id), settings)
    usage = reserve_usage(db, user, "chat", settings)
    try:
        reply, cost, redacted = ai.chat(
            client, settings, user_id=user.id, lesson_title=meta["title"], message=body.message)
    except ai.AIRefused:
        settle_usage(db, usage, 0.0)
        raise HTTPException(422, "content_not_allowed") from None
    except ai.AIError as exc:
        settle_usage(db, usage, exc.cost)
        log.exception("chat failed")
        raise HTTPException(502, "Mentor is unavailable, please retry") from None
    settle_usage(db, usage, cost)
    return {"reply": reply, "redacted": redacted}
