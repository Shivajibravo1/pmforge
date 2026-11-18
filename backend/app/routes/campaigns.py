import logging
from datetime import UTC, date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, undefer

from app import emailer, interview
from app.config import get_settings
from app.db import get_db
from app.models import EmailCampaign, Resource, User
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


def build(db: Session, c: EmailCampaign, base: str, unsubscribe_url: str, subject_prefix: str = ""):
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
                                                     pdf_name=pdf, unsubscribe_url=unsubscribe_url)
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
def schedule(cid: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status in ("sent", "partial"):
        raise HTTPException(409, "already_sent")
    _can_schedule(db, c)
    c.status = "scheduled"
    db.commit()
    return _view(c)


@router.post("/{cid}/unschedule")
def unschedule(cid: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status == "scheduled":
        c.status = "draft"
        db.commit()
    return _view(c)


@router.delete("/{cid}")
def delete(cid: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = _get(db, cid)
    if c.status == "scheduled":
        raise HTTPException(409, "unschedule_first")
    db.delete(c)
    db.commit()
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
