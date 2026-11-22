from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app import push
from app.config import get_settings
from app.db import get_db
from app.models import MarketingConsent, PushSubscription, User
from app.security import current_user

router = APIRouter(prefix="/api/v1/push", tags=["push"])
MAX_DEVICES = 5  # per member


@router.get("")
def status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = get_settings()
    consent = db.get(MarketingConsent, user.id)
    devices = db.scalars(select(PushSubscription.endpoint).where(PushSubscription.user_id == user.id)).all()
    return {
        "available": push.enabled(s),
        "public_key": s.vapid_public_key if push.enabled(s) else "",
        "needs_consent": not (consent and consent.opted_out_at is None),
        "endpoints": list(devices),
    }


class Keys(BaseModel):
    p256dh: str = Field(min_length=20, max_length=200)
    auth: str = Field(min_length=8, max_length=100)


class SubscribeIn(BaseModel):
    endpoint: str = Field(min_length=20, max_length=600)
    keys: Keys


@router.post("/subscribe")
def subscribe(body: SubscribeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not push.enabled(get_settings()):
        raise HTTPException(424, "push_not_configured")
    consent = db.get(MarketingConsent, user.id)
    if not (consent and consent.opted_out_at is None):
        raise HTTPException(422, "consent_required")
    if not push.endpoint_ok(body.endpoint):
        raise HTTPException(422, "endpoint_not_allowed")
    row = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    if row and row.user_id != user.id:  # a shared browser: the device now belongs to whoever is signed in
        db.delete(row)
        db.flush()
        row = None
    if row is None:
        have = db.scalars(select(PushSubscription).where(PushSubscription.user_id == user.id)
                          .order_by(PushSubscription.created_at)).all()
        for old in have[: max(0, len(have) - MAX_DEVICES + 1)]:
            db.delete(old)
        db.add(PushSubscription(user_id=user.id, endpoint=body.endpoint, p256dh=body.keys.p256dh, auth=body.keys.auth))
    else:
        row.p256dh, row.auth = body.keys.p256dh, body.keys.auth
    db.commit()
    return {"subscribed": True}


class UnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=20, max_length=600)


@router.post("/unsubscribe")
def unsubscribe(body: UnsubscribeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(PushSubscription).where(PushSubscription.user_id == user.id,
                                             PushSubscription.endpoint == body.endpoint))
    db.commit()
    return {"subscribed": False}
