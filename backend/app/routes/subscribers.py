import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import emailer
from app.config import Settings, get_settings
from app.db import get_db
from app.jobs.interview_email import MAX_FAILURES, run_once
from app.models import InterviewSubscription, User
from app.security import require_admin

log = logging.getLogger("pmforge.admin")
router = APIRouter(prefix="/api/v1/admin/subscribers", tags=["admin"])
SHOWN = 200  # one screen; use the search box to narrow a longer list
SEND_BATCH = 50  # one request stays well inside the proxy's time limit


@router.get("")
def list_subscribers(tier: Literal["paid", "free"], q: str = Query("", max_length=100),
                     _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Every member on one plan, with whether they opted in to the interview email. Admins are not on a plan."""
    term = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    where = [User.role != "admin", User.tier == tier]
    if term:
        where.append(User.email.ilike(f"%{term}%", escape="\\"))
    rows = db.execute(select(User, InterviewSubscription)
                      .outerjoin(InterviewSubscription, InterviewSubscription.user_id == User.id)
                      .where(*where).order_by(User.created_at.desc(), User.id).limit(SHOWN)).all()
    total = db.scalar(select(func.count()).select_from(User).where(*where)) or 0
    counts = dict(db.execute(select(User.tier, func.count()).where(User.role != "admin").group_by(User.tier)).all())
    return {
        "total": total, "shown": len(rows), "counts": {"paid": counts.get("paid", 0), "free": counts.get("free", 0)},
        "items": [{
            "id": u.id, "email": u.email, "opted_in": bool(sub and sub.opted_out_at is None),
            "paused": bool(sub and sub.failures >= MAX_FAILURES),
            "last_sent_on": sub.last_sent_on.isoformat() if sub and sub.last_sent_on else None,
        } for u, sub in rows],
    }


class SendIn(BaseModel):
    user_ids: list[str] = Field(min_length=1, max_length=SEND_BATCH)


@router.post("/send")
def send_now(body: SendIn, admin: User = Depends(require_admin), db: Session = Depends(get_db),
             settings: Settings = Depends(get_settings)):
    """Sends today's interview email now to the chosen people who opted in. Anyone else in the list is skipped."""
    if not settings.resend_api_key or not settings.email_from:
        raise HTTPException(424, "email_not_configured")
    ids = set(body.user_ids)
    stats = run_once(db, settings, emailer.send_email, only=ids, ignore_hour=True)
    out = {"requested": len(ids), "sent": stats["sent"], "failed": stats["failed"],
           "skipped": len(ids) - stats["sent"] - stats["failed"]}
    log.info("admin %s sent the interview email to %d of %d chosen members", admin.id, out["sent"], out["requested"])
    return out
