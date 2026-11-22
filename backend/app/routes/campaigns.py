import logging
from datetime import UTC, date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, undefer

from app import emailer, interview
from app.config import get_settings
from app.db import get_db
from app.models import CampaignDelivery, EmailCampaign, InterviewSubscription, MarketingConsent, Resource, User
from app.security import require_admin

log = logging.getLogger("pmforge.campaigns")
router = APIRouter(prefix="/api/v1/admin/emails", tags=["admin"])


class Block(BaseModel):
    type: Literal["text", "image"]
    text: str = Field(default="", max_length=5000)
    resource_id: str | None = Field(default=None, max_length=36)


class CampaignIn(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    blocks: list[Block] = Field(default_factory=list, max_length=30)
    attachment_id: str | None = Field(default=None, max_length=36)
    send_on: date | None = None
    send_hour: int = Field(default=7, ge=0, le=23)


def _view(c: EmailCampaign) -> dict:
    return {"id": c.id, "subject": c.subject, "blocks": c.blocks, "attachment_id": c.attachment_id,
            "send_on": c.send_on.isoformat() if c.send_on else None, "send_hour": c.send_hour, "status": c.status,
            "updated_at": c.updated_at.isoformat()}


def _get(db: Session, cid: str) -> EmailCampaign:
    c = db.get(EmailCampaign, cid)
    if not c:
        raise HTTPException(404, "not_found")
    return c


def _check_assets(db: Session, blocks: list[dict], attachment_id: str | None) -> None:
    for b in blocks:
        if b["type"] == "image":
            r = db.get(Resource, b.get("resource_id") or "")
            if not r or r.kind != "image":
                raise HTTPException(422, "resource_not_found")
            if not r.in_email:
                raise HTTPException(422, "image_not_email_ready")
    if attachment_id:
        r = db.get(Resource, attachment_id)
        if not r or r.kind != "pdf":
            raise HTTPException(422, "attachment_must_be_pdf")


def _can_schedule(db: Session, c: EmailCampaign) -> None:
    if not c.send_on:
        raise HTTPException(422, "send_date_required")
    if c.send_on < interview.today_ist():
        raise HTTPException(422, "date_in_past")
    if not any(b.get("type") == "image" or str(b.get("text", "")).strip() for b in c.blocks):
        raise HTTPException(422, "body_required")
    other = db.scalar(select(EmailCampaign.id).where(EmailCampaign.send_on == c.send_on,
                                                     EmailCampaign.status == "scheduled", EmailCampaign.id != c.id))
    if other:
        raise HTTPException(409, "date_taken")


def build(db: Session, c: EmailCampaign, base: str, unsubscribe_url: str, subject_prefix: str = "",
          postal_address: str = ""):
    """Returns (subject, text, html, attachments) for one campaign. Used by the job and by test sends."""
    images = {}
    for b in c.blocks:
        if b.get("type") == "image":
            r = db.get(Resource, b.get("resource_id") or "")
            if r and r.kind == "image" and r.in_email:
                images[r.id] = (f"{base}/public/files/{r.id}", r.title)
    pdf, attachments = None, None
    if c.attachment_id:
        from app.routes.resources import _file_name  # one place decides the downloadable name
        r = db.scalar(select(Resource).where(Resource.id == c.attachment_id).options(undefer(Resource.data)))
        if r and r.kind == "pdf":
            pdf = f"{_file_name(r)}"
            attachments = [{"filename": pdf, "content": r.data}]
    subject, text, html = interview.compose_campaign(subject_prefix + c.subject, c.blocks, images=images,
                                                     pdf_name=pdf, unsubscribe_url=unsubscribe_url,
                                                     postal_address=postal_address)
    return subject, text, html, attachments


@router.get("")
def list_emails(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.scalars(select(EmailCampaign).order_by(EmailCampaign.updated_at.desc()).limit(200)).all()
    return {"items": [_view(c) for c in rows]}


@router.post("")
def create(body: CampaignIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    blocks = [b.model_dump() for b in body.blocks]
    _check_assets(db, blocks, body.attachment_id)
    c = EmailCampaign(subject=body.subject.strip(), blocks=blocks, attachment_id=body.attachment_id or None,
                      send_on=body.send_on, send_hour=body.send_hour, status="draft")
    db.add(c)
    db.commit()
    return _view(c)


@router.put("/{cid}")
def update(cid: str, body: CampaignIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status in ("sent", "partial"):
        raise HTTPException(409, "already_sent")
    blocks = [b.model_dump() for b in body.blocks]
    _check_assets(db, blocks, body.attachment_id)
    c.subject, c.blocks, c.attachment_id = body.subject.strip(), blocks, body.attachment_id or None
    c.send_on, c.send_hour = body.send_on, body.send_hour
    if c.status == "scheduled":  # an edit must still be a valid scheduled email
        _can_schedule(db, c)
    db.commit()
    return _view(c)


@router.post("/{cid}/schedule")
def schedule(cid: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status in ("sent", "partial"):
        raise HTTPException(409, "already_sent")
    _can_schedule(db, c)
    c.status = "scheduled"
    db.commit()
    log.info("admin %s scheduled email %s for %s at %s IST", admin.id, c.id, c.send_on, c.send_hour)
    return _view(c)


@router.post("/{cid}/unschedule")
def unschedule(cid: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status == "scheduled":
        c.status = "draft"
        db.commit()
        log.info("admin %s unscheduled email %s", admin.id, c.id)
    return _view(c)


@router.delete("/{cid}")
def delete(cid: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status == "scheduled":
        raise HTTPException(409, "unschedule_first")
    db.delete(c)
    db.commit()
    log.info("admin %s deleted email %s", admin.id, cid)
    return {"deleted": cid}


@router.post("/{cid}/test")
def send_test(cid: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Sends this email to the admin's own address only. Counts toward the Resend daily limit."""
    c = _get(db, cid)
    s = get_settings()
    base = s.public_base_url.rstrip("/")
    subject, text, html, attachments = build(db, c, base, f"{base}/app/you", "[Test] ")
    try:
        emailer.send_email(s, to=admin.email, subject=subject, text=text, html=html, unsubscribe_url=f"{base}/app/you",
                           idempotency_key=f"test-{c.id}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
                           attachments=attachments)
    except emailer.EmailError as exc:
        log.warning("test send failed: %s", exc)
        # 424, not 502: Cloudflare replaces a 502 from the origin with its own page and hides our message.
        code = "email_not_configured" if "not configured" in str(exc) else "email_send_failed"
        raise HTTPException(424, code) from exc
    return {"sent_to": admin.email}


Audience = Literal["all", "paid", "free"]
BROADCAST_BATCH = 50  # one request stays well inside the proxy's time limit; the page asks again until done


def _audience_query(audience: str):
    """Members who agreed to tips and offers emails, on the chosen plan. Admins are never in an audience."""
    q = (select(User.id, User.email, MarketingConsent.unsubscribe_token)
         .join(MarketingConsent, MarketingConsent.user_id == User.id)
         .where(MarketingConsent.opted_out_at.is_(None), User.email != "", User.role != "admin"))
    if audience != "all":
        q = q.where(User.tier == audience)
    return q


@router.get("/audience")
def audience_counts(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """How many members each send button would reach. Only people who turned on tips and offers are counted."""
    def n(audience: str) -> int:
        return db.scalar(select(func.count()).select_from(_audience_query(audience).subquery())) or 0
    s = get_settings()
    return {"all": n("all"), "paid": n("paid"), "free": n("free"), "daily_limit": s.interview_email_daily_cap,
            "mailing_address_set": bool(s.mailing_address.strip())}


class BroadcastIn(BaseModel):
    audience: Audience


@router.post("/{cid}/broadcast")
def broadcast(cid: str, body: BroadcastIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Sends this email now to members on the chosen plan who agreed to tips and offers. Safe to press again: nobody
    gets the same email twice, and the daily limit (shared with all other email) just pauses it until tomorrow."""
    s = get_settings()
    if not s.resend_api_key or not s.email_from:
        raise HTTPException(424, "email_not_configured")
    c = _get(db, cid)
    if not any(b.get("type") == "image" or str(b.get("text", "")).strip() for b in c.blocks):
        raise HTTPException(422, "body_required")
    today = interview.today_ist()
    start = datetime.combine(today, datetime.min.time(), tzinfo=interview.IST)
    used = (db.scalar(select(func.count()).select_from(InterviewSubscription)
                      .where(InterviewSubscription.last_sent_on == today)) or 0) + (
        db.scalar(select(func.count()).select_from(CampaignDelivery)
                  .where(CampaignDelivery.source == "broadcast", CampaignDelivery.sent_at >= start)) or 0)
    room = max(0, s.interview_email_daily_cap - used)
    done = select(CampaignDelivery.user_id).where(CampaignDelivery.campaign_id == c.id)
    pending = _audience_query(body.audience).where(User.id.not_in(done)).order_by(User.created_at, User.id)
    todo = db.execute(pending.limit(min(room, BROADCAST_BATCH))).all()
    base = s.public_base_url.rstrip("/")
    sent = failed = 0
    for uid, email, token in todo:
        subject, text, html, attachments = build(db, c, base, f"{base}/unsubscribe/{token}",
                                                 postal_address=s.mailing_address)
        try:
            emailer.send_email(s, to=email, subject=subject, text=text, html=html,
                               unsubscribe_url=f"{base}/public/interview/unsubscribe/{token}",
                               idempotency_key=f"broadcast-{c.id}-{uid}", attachments=attachments)
        except emailer.EmailError as exc:
            failed += 1
            log.warning("broadcast send failed for user %s: %s", uid, exc)
            continue
        db.add(CampaignDelivery(campaign_id=c.id, user_id=uid, source="broadcast"))
        db.commit()
        sent += 1
    remaining = db.scalar(select(func.count()).select_from(pending.subquery())) or 0
    log.info("admin %s broadcast email %s to %s: sent %d, failed %d, remaining %d", admin.id, c.id, body.audience,
             sent, failed, remaining)
    return {"sent": sent, "failed": failed, "remaining": remaining, "limit_reached": room - sent <= 0 and remaining > 0}
