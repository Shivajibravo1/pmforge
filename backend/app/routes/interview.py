from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app import interview
from app.db import get_db
from app.models import InterviewSubscription, MarketingConsent, PushSubscription, User
from app.security import current_user

router = APIRouter(prefix="/api/v1/interview-email", tags=["interview-email"])
public = APIRouter(prefix="/public/interview", tags=["public"])


def _sub(db: Session, user_id: str) -> InterviewSubscription | None:
    return db.get(InterviewSubscription, user_id)


@router.get("")
def status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    sub = _sub(db, user.id)
    return {
        "eligible": user.tier == "paid",
        "subscribed": bool(sub and sub.opted_out_at is None),
        "default_on": bool(sub and sub.consent_version == interview.DEFAULT_ON_VERSION and sub.opted_out_at is None),
        "email": user.email,
        "consent_version": interview.CONSENT_VERSION,
        "consent_text": interview.consent_text(user.email),
    }


class SubscribeIn(BaseModel):
    agree: bool
    consent_version: str


@router.post("/subscribe")
def subscribe(body: SubscribeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.tier != "paid":
        raise HTTPException(403, "upgrade_required")
    if not user.email:
        raise HTTPException(422, "email_missing")
    if not body.agree or body.consent_version != interview.CONSENT_VERSION:
        raise HTTPException(422, "consent_required")
    sub = _sub(db, user.id)
    now = datetime.now(UTC)
    if sub is None:
        db.add(InterviewSubscription(user_id=user.id, consent_version=interview.CONSENT_VERSION, opted_in_at=now,
                                     next_index=0, failures=0))
    else:  # opting back in keeps the position in the rotation and the same unsubscribe link
        sub.opted_out_at, sub.opted_in_at, sub.consent_version, sub.failures = None, now, interview.CONSENT_VERSION, 0
    db.commit()
    return {"subscribed": True}


@router.post("/unsubscribe")
def unsubscribe(user: User = Depends(current_user), db: Session = Depends(get_db)):
    sub = _sub(db, user.id)
    if sub and sub.opted_out_at is None:
        sub.opted_out_at = datetime.now(UTC)
        db.commit()
    return {"subscribed": False}


@public.post("/unsubscribe/{token}")
def unsubscribe_by_token(token: str, db: Session = Depends(get_db)):
    """No login: the unguessable token in the email is the proof. Answers the same for unknown tokens."""
    token = token[:64]
    now = datetime.now(UTC)
    for model in (InterviewSubscription, MarketingConsent):  # each email type carries its own token
        row = db.scalar(select(model).where(model.unsubscribe_token == token))
        if row and row.opted_out_at is None:
            row.opted_out_at = now
            if model is MarketingConsent:  # no tips and offers means no notifications either
                db.execute(delete(PushSubscription).where(PushSubscription.user_id == row.user_id))
    db.commit()
    return {"status": "ok"}
