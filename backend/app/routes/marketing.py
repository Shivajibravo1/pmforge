from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app import interview
from app.db import get_db
from app.models import MarketingConsent, PushSubscription, User
from app.security import current_user

router = APIRouter(prefix="/api/v1/marketing-email", tags=["marketing-email"])


@router.get("")
def status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(MarketingConsent, user.id)
    return {
        "subscribed": bool(row and row.opted_out_at is None),
        "default_on": bool(row and row.opted_out_at is None and row.consent_version == interview.DEFAULT_ON_VERSION),
        "email": user.email,
        "consent_version": interview.MARKETING_CONSENT_VERSION,
        "consent_text": interview.marketing_consent_text(user.email),
    }


class SubscribeIn(BaseModel):
    agree: bool
    consent_version: str


@router.post("/subscribe")
def subscribe(body: SubscribeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.email:
        raise HTTPException(422, "email_missing")
    if not body.agree or body.consent_version != interview.MARKETING_CONSENT_VERSION:
        raise HTTPException(422, "consent_required")
    row = db.get(MarketingConsent, user.id)
    now = datetime.now(UTC)
    if row is None:
        db.add(MarketingConsent(user_id=user.id, consent_version=interview.MARKETING_CONSENT_VERSION, opted_in_at=now))
    else:  # opting back in keeps the same unsubscribe link
        row.opted_out_at, row.opted_in_at, row.consent_version = None, now, interview.MARKETING_CONSENT_VERSION
    db.commit()
    return {"subscribed": True}


@router.post("/unsubscribe")
def unsubscribe(user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(MarketingConsent, user.id)
    if row and row.opted_out_at is None:
        row.opted_out_at = datetime.now(UTC)
    db.execute(delete(PushSubscription).where(PushSubscription.user_id == user.id))
    db.commit()
    return {"subscribed": False}
