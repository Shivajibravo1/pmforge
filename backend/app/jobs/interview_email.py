"""Sends the daily interview question. Run as: python -m app.jobs.interview_email  (add --once for a single pass)."""
import hashlib
import logging
import sys
import time
from collections.abc import Callable
from datetime import UTC, date, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app import billing, emailer, interview
from app.config import Settings, get_settings
from app.db import SessionLocal
from app.models import CampaignDelivery, EmailCampaign, InterviewQuestion, InterviewSubscription, Resource, User

log = logging.getLogger("pmforge.interview_email")
IST = interview.IST
MAX_FAILURES = 5

Sender = Callable[..., None]


def _uid(user_id: str) -> str:
    return hashlib.sha256(user_id.encode()).hexdigest()[:8]


def run_once(db: Session, settings: Settings, sender: Sender = emailer.send_email, now: datetime | None = None,
             only: set[str] | None = None, ignore_hour: bool = False) -> dict:
    """`only` restricts a pass to those user ids (the admin's manual send). People who opted in are the only ones
    ever emailed; a manual send still claims today's slot, so nobody gets two emails in a day."""
    now = (now or datetime.now(UTC)).astimezone(IST)
    stats = {"sent": 0, "failed": 0, "skipped": 0}
    today: date = now.date()
    billing.expire_due(db, today)  # an ended plan must not receive the paid email
    # An email that was scheduled for an earlier day and never finished is closed so it cannot send late.
    for old in db.scalars(select(EmailCampaign).where(EmailCampaign.status == "scheduled",
                                                      EmailCampaign.send_on < today)).all():
        old.status = "partial"
    db.commit()
    campaign = db.scalar(select(EmailCampaign).where(EmailCampaign.status == "scheduled",
                                                     EmailCampaign.send_on == today))
    if not ignore_hour and now.hour < (campaign.send_hour if campaign else settings.interview_email_send_hour_ist):
        return stats
    sent_today = db.scalar(select(func.count()).select_from(InterviewSubscription)
                           .where(InterviewSubscription.last_sent_on == today)) or 0
    room = settings.interview_email_daily_cap - sent_today
    if room <= 0:
        return stats
    due = db.execute(
        select(InterviewSubscription, User).join(User, User.id == InterviewSubscription.user_id)
        .where(InterviewSubscription.opted_out_at.is_(None), User.email != "",
               InterviewSubscription.failures < MAX_FAILURES,
               or_(InterviewSubscription.last_sent_on.is_(None), InterviewSubscription.last_sent_on < today),
               *([InterviewSubscription.user_id.in_(only)] if only is not None else [User.tier == "paid"]))
        .order_by(InterviewSubscription.last_sent_on.asc().nulls_first())
        .limit(room)).all()
    # Today's composed email beats a written question, which beats the rotation. None of them break the
    # one-email-a-day promise: a subscriber is claimed once per day whichever is used.
    scheduled = campaign or db.get(InterviewQuestion, today)
    for sub, user in due:
        prev_index, prev_sent = sub.next_index, sub.last_sent_on
        uid, email, token = sub.user_id, user.email, sub.unsubscribe_token
        # Claim the slot first. Another run that reaches the same row finds it already taken and skips it.
        claimed = db.execute(
            update(InterviewSubscription)
            .where(InterviewSubscription.user_id == uid, InterviewSubscription.opted_out_at.is_(None),
                   or_(InterviewSubscription.last_sent_on.is_(None), InterviewSubscription.last_sent_on < today))
            .values(last_sent_on=today,
                    next_index=InterviewSubscription.next_index + (0 if scheduled else 1))).rowcount
        db.commit()
        if claimed != 1:
            stats["skipped"] += 1
            continue
        if campaign and db.get(CampaignDelivery, (campaign.id, uid)):  # already got this email by another route
            stats["skipped"] += 1
            continue
        base = settings.public_base_url.rstrip("/")
        unsub = f"{base}/public/interview/unsubscribe/{token}"  # one-click POST for mail apps (header)
        unsub_page = f"{base}/unsubscribe/{token}"  # page a person lands on when they click the link
        if campaign:
            from app.routes.campaigns import build  # imported here: routes import the job's helpers elsewhere
            subject, text, html, attachments = build(db, campaign, base, unsub_page,
                                                     postal_address=settings.mailing_address)
            q = None
        else:
            attachments = None
            q = ({"day": scheduled.lesson_day, "question": scheduled.question, "tips": list(scheduled.tips or [])}
                 if scheduled else interview.question_for(prev_index))
        if q and scheduled and scheduled.resource_id:
            res = db.get(Resource, scheduled.resource_id)
            if res and res.kind == "image" and res.in_email:
                q["image_url"], q["image_alt"] = f"{base}/public/files/{res.id}", res.title
        if q:
            lesson_url = f"{base}/app/lesson/{q['day']}" if q["day"] else f"{base}/app"
            subject, text, html = interview.compose(q, lesson_url=lesson_url, unsubscribe_url=unsub_page)
        try:
            sender(settings, to=email, subject=subject, text=text, html=html, unsubscribe_url=unsub,
                   idempotency_key=f"interview-{uid}-{today.isoformat()}", attachments=attachments)
        except emailer.EmailError as exc:
            db.execute(update(InterviewSubscription).where(InterviewSubscription.user_id == uid)
                       .values(last_sent_on=prev_sent, next_index=prev_index,
                               failures=InterviewSubscription.failures + 1))
            db.commit()
            stats["failed"] += 1
            log.warning("send failed for %s: %s", _uid(uid), exc)
            continue
        db.execute(update(InterviewSubscription).where(InterviewSubscription.user_id == uid).values(failures=0))
        if campaign:
            db.add(CampaignDelivery(campaign_id=campaign.id, user_id=uid, source="job"))
        db.commit()
        stats["sent"] += 1
    if campaign:
        left = db.scalar(select(func.count()).select_from(InterviewSubscription).join(
            User, User.id == InterviewSubscription.user_id).where(
            InterviewSubscription.opted_out_at.is_(None), User.tier == "paid", User.email != "",
            InterviewSubscription.failures < MAX_FAILURES,
            or_(InterviewSubscription.last_sent_on.is_(None), InterviewSubscription.last_sent_on < today))) or 0
        if left == 0:
            campaign.status = "sent"
            db.commit()
    return stats


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    settings = get_settings()
    once = "--once" in sys.argv
    while True:
        try:
            with SessionLocal() as db:
                stats = run_once(db, settings)
            if stats["sent"] or stats["failed"]:
                log.info("pass done: %s", stats)
        except Exception:  # keep the loop alive; the next pass retries
            log.exception("interview email pass failed")
        if once:
            return
        time.sleep(600)


if __name__ == "__main__":
    main()
