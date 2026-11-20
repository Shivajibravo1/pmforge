"""SuperProfile purchases. SuperProfile has no webhook, so the n8n bridge reads its "You made a sale" email,
checks it really came from SuperProfile, and posts the order here signed with PAYMENT_WEBHOOK_SECRET.

Signature: X-PMForge-Timestamp (Unix seconds) and X-PMForge-Signature = "sha256=" + hex HMAC-SHA256 of
"{timestamp}." + raw body. Requests older than PAYMENT_WEBHOOK_MAX_AGE_SECONDS are refused (replay protection);
a repeated transaction_id is acknowledged and changes nothing (idempotency)."""
import hashlib
import hmac
import json
import logging
import re
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import billing
from app.config import Settings, get_settings
from app.db import get_db
from app.interview import today_ist
from app.models import Payment, User
from app.security import require_admin

log = logging.getLogger("pmforge.payments")
public = APIRouter(prefix="/public/payments", tags=["payments"])
admin = APIRouter(prefix="/api/v1/admin/payments", tags=["admin"], dependencies=[Depends(require_admin)])

_EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,63}$")


class PurchaseIn(BaseModel):
    transaction_id: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    buyer_email: str = Field(min_length=6, max_length=320)
    product_title: str = Field(min_length=1, max_length=200)
    amount: float = Field(ge=0, le=1_000_000)
    currency: str = Field(default="INR", pattern=r"^[A-Z]{3}$")


def _norm(title: str) -> str:
    return " ".join(title.split()).casefold()


def _plan_for(title: str, settings: Settings) -> tuple[str, float] | None:
    t = _norm(title)
    for plan, cfg_title, price in (("monthly", settings.superprofile_monthly_title, settings.plan_monthly_inr),
                                   ("yearly", settings.superprofile_yearly_title, settings.plan_yearly_inr)):
        if cfg_title and t == _norm(cfg_title):
            return plan, price
    return None


def _verify(request: Request, body: bytes, settings: Settings) -> None:
    if not settings.payment_webhook_secret:
        log.error("Payment relay refused: PAYMENT_WEBHOOK_SECRET is not set")
        raise HTTPException(503, "payments_not_configured")
    ts = request.headers.get("x-pmforge-timestamp", "")
    sig = request.headers.get("x-pmforge-signature", "")
    if not ts.isdigit() or abs(time.time() - int(ts)) > settings.payment_webhook_max_age_seconds:
        raise HTTPException(401, "invalid_signature")
    expected = "sha256=" + hmac.new(settings.payment_webhook_secret.encode(), ts.encode() + b"." + body,
                                    hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(401, "invalid_signature")


@public.post("/superprofile")
async def superprofile_purchase(request: Request, db: Session = Depends(get_db),
                                settings: Settings = Depends(get_settings)):
    body = await request.body()
    _verify(request, body, settings)
    try:
        data = PurchaseIn.model_validate(json.loads(body))
    except (ValueError, ValidationError):
        raise HTTPException(422, "invalid_payload") from None
    email = data.buyer_email.strip().lower()
    if not _EMAIL.match(email):
        raise HTTPException(422, "invalid_payload")

    if db.scalar(select(Payment.id).where(Payment.transaction_id == data.transaction_id)):
        return {"status": "duplicate"}

    match = _plan_for(data.product_title, settings)
    pay = Payment(transaction_id=data.transaction_id, buyer_email=email, product_title=data.product_title[:200],
                  amount=data.amount, currency=data.currency, plan=match[0] if match else None)
    if match is None:
        pay.status = "ignored"
    elif data.currency != "INR" or data.amount < match[1]:
        pay.status = "review"  # discount, partial or foreign-currency payment: a person decides
        log.warning("Payment %s needs review: %s %s for %s", data.transaction_id, data.amount, data.currency,
                    match[0])
    else:
        user = db.scalar(select(User).where(func.lower(User.email) == email, User.role != "admin"))
        if user is None:
            pay.status = "pending"  # applied when this email signs in
        else:
            billing.grant(user, billing.plan_days(settings)[match[0]], today_ist())
            pay.status, pay.user_id, pay.applied_at = "applied", user.id, datetime.now(UTC)
    db.add(pay)
    try:
        db.commit()
    except IntegrityError:  # two relays of the same order at the same moment
        db.rollback()
        return {"status": "duplicate"}
    log.info("Payment %s recorded: %s", data.transaction_id, pay.status)
    return {"status": pay.status}


@admin.get("")
def list_payments(db: Session = Depends(get_db)):
    rows = db.scalars(select(Payment).order_by(Payment.received_at.desc()).limit(200)).all()
    return {"items": [{"transaction_id": p.transaction_id, "buyer_email": p.buyer_email, "plan": p.plan,
                       "amount": p.amount, "currency": p.currency, "status": p.status, "user_id": p.user_id,
                       "received_at": p.received_at.isoformat()} for p in rows]}
