"""Paid access: granting a purchased plan, ending it when it runs out, and claiming purchases made before sign-up."""
import logging
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import Settings
from app.interview import today_ist
from app.models import Payment, User

log = logging.getLogger("pmforge.billing")


def plan_days(settings: Settings) -> dict[str, int]:
    return {"monthly": settings.plan_monthly_days, "yearly": settings.plan_yearly_days}


def grant(user: User, days: int, today: date) -> None:
    """Adds `days` of access. A renewal bought early extends the current end date instead of overlapping it.
    A paid user with no end date (set by the admin) keeps no end date."""
    if user.tier == "paid" and user.paid_until is None:
        return
    start = user.paid_until + timedelta(days=1) if user.tier == "paid" and user.paid_until and \
        user.paid_until >= today else today
    user.paid_until = start + timedelta(days=days - 1)
    user.tier = "paid"


def expire_if_due(user: User, today: date | None = None) -> bool:
    """Called on every authenticated request. Returns True when the plan ended and the user went back to free."""
    today = today or today_ist()
    if user.tier == "paid" and user.paid_until is not None and user.paid_until < today:
        log.info("Plan ended for user %s on %s", user.id, user.paid_until)
        user.tier = "free"
        return True
    return False


def expire_due(db: Session, today: date | None = None) -> int:
    """Bulk version for background jobs, so lists and the email job never count an ended plan as paid."""
    today = today or today_ist()
    n = db.execute(update(User).where(User.tier == "paid", User.paid_until.is_not(None), User.paid_until < today)
                   .values(tier="free")).rowcount
    db.commit()
    return n or 0


def claim_pending(db: Session, user: User, days_for: dict[str, int], today: date | None = None) -> int:
    """Applies purchases made with this email before the account existed."""
    if user.role == "admin" or not user.email:
        return 0
    today = today or today_ist()
    rows = db.scalars(select(Payment).where(Payment.status == "pending",
                                            Payment.buyer_email == user.email.lower())
                      .order_by(Payment.received_at)).all()
    for p in rows:
        grant(user, days_for[p.plan], today)
        p.status, p.user_id, p.applied_at = "applied", user.id, datetime.now(UTC)
    if rows:
        db.commit()
    return len(rows)
