import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import ai, content
from app.config import Settings, get_settings
from app.db import get_db
from app.models import MockAttempt, User
from app.routes.mentor import get_ai_client, reserve_usage, settle_usage
from app.security import current_user

log = logging.getLogger("pmforge.practice")
router = APIRouter(prefix="/api/v1/practice", tags=["practice"])
MAX_ATTEMPTS_PER_DAY = 40  # stored answers, so storage cannot be filled for free (the AI allowance is separate)


def _bank() -> dict:
    return content.interview_bank()


def _question(qid: str) -> dict:
    q = next((x for x in _bank()["questions"] if x["id"] == qid), None)
    if q is None:
        raise HTTPException(404, "Not found")
    return q


def _open(q: dict, user: User) -> bool:
    return bool(q["free"]) or user.role == "admin" or user.tier == "paid"


def _require_open(q: dict, user: User) -> None:
    if not _open(q, user):
        raise HTTPException(402, "upgrade_required")


@router.get("/roles")
def roles(user: User = Depends(current_user)):
    qs = _bank()["questions"]
    return {"roles": [{**r, "questions": sum(1 for q in qs if q["role"] == r["id"]),
                       "free": sum(1 for q in qs if q["role"] == r["id"] and q["free"])} for r in _bank()["roles"]]}


@router.get("/questions")
def questions(role: str = Query(max_length=30), user: User = Depends(current_user), db: Session = Depends(get_db)):
    qs = [q for q in _bank()["questions"] if q["role"] == role]
    if not qs:
        raise HTTPException(404, "Not found")
    best = dict(db.execute(select(MockAttempt.question_id, func.max(MockAttempt.self_score)).where(
        MockAttempt.user_id == user.id, MockAttempt.question_id.in_([q["id"] for q in qs]))
        .group_by(MockAttempt.question_id)).all())
    return {"items": [{"id": q["id"], "type": q["type"], "question": q["question"], "time_seconds": q["time_seconds"],
                       "locked": not _open(q, user), "best_score": best.get(q["id"])} for q in qs]}


@router.get("/questions/{qid}")
def get_question(qid: str, user: User = Depends(current_user)):
    q = _question(qid)
    _require_open(q, user)
    # never the model answer here: it is shown only after the member has written their own
    return {k: q[k] for k in ("id", "role", "type", "question", "time_seconds", "rubric")}


class AttemptIn(BaseModel):
    answer: str = Field(min_length=10, max_length=4000)
    seconds_used: int = Field(ge=0, le=3600)
    ticks: list[bool] = Field(max_length=10)  # the member's own rubric check, one tick per rubric line


@router.post("/questions/{qid}/attempt", status_code=201)
def attempt(qid: str, body: AttemptIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = _question(qid)
    _require_open(q, user)
    if len(body.ticks) != len(q["rubric"]):
        raise HTTPException(422, "ticks_mismatch")
    since = datetime.now(UTC) - timedelta(days=1)
    stored = db.scalar(select(func.count()).select_from(MockAttempt).where(
        MockAttempt.user_id == user.id, MockAttempt.created_at >= since)) or 0
    if stored >= MAX_ATTEMPTS_PER_DAY:
        raise HTTPException(429, "daily_limit_reached")
    score = round(100 * sum(body.ticks) / len(body.ticks))
    row = MockAttempt(user_id=user.id, question_id=qid, answer=body.answer, seconds_used=body.seconds_used,
                      self_score=score)
    db.add(row)
    db.commit()
    return {"attempt_id": row.id, "self_score": score, "model_answer": q["model_answer"]}


@router.post("/attempts/{attempt_id}/feedback")
def feedback(attempt_id: str, user: User = Depends(current_user), db: Session = Depends(get_db),
             settings: Settings = Depends(get_settings), client: ai.AIClient = Depends(get_ai_client)):
    """Optional AI feedback on one answer. Uses the member's review allowance, and asking twice costs nothing."""
    row = db.get(MockAttempt, attempt_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(404, "Not found")
    if row.ai_feedback is not None:
        return {**row.ai_feedback, "score": row.ai_score, "reused": True}
    q = _question(row.question_id)
    usage = reserve_usage(db, user, "review", settings)
    try:
        result, cost, redacted = ai.review_artifact(
            client, settings, user_id=user.id, rubric=q["rubric"], lesson_title=f"Interview practice, {q['type']}",
            content=row.answer, prompt=q["question"])
    except ai.AIRefused:
        settle_usage(db, usage, 0.0)
        raise HTTPException(422, "content_not_allowed") from None
    except ai.AIError as exc:
        settle_usage(db, usage, exc.cost)
        log.exception("practice feedback failed")
        raise HTTPException(502, "Feedback is unavailable, please retry") from None
    row.ai_score, row.ai_feedback = result.score, result.model_dump()
    settle_usage(db, usage, cost)
    return {**result.model_dump(), "redacted": redacted}


@router.get("/history")
def history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(MockAttempt).where(MockAttempt.user_id == user.id)
                      .order_by(MockAttempt.created_at.desc()).limit(30)).all()
    return {"items": [{"id": r.id, "question_id": r.question_id, "self_score": r.self_score, "ai_score": r.ai_score,
                       "seconds_used": r.seconds_used, "created_at": r.created_at.isoformat()} for r in rows]}
