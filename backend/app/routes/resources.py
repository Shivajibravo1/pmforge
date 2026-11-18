import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, undefer

from app.config import get_settings
from app.db import get_db
from app.models import EmailCampaign, InterviewQuestion, Resource, User
from app.security import current_user, require_admin

router = APIRouter(prefix="/api/v1/resources", tags=["resources"])
admin = APIRouter(prefix="/api/v1/admin/resources", tags=["admin"], dependencies=[Depends(require_admin)])
public = APIRouter(prefix="/public/files", tags=["public"])

# Type is decided from the file's own first bytes, never from the name or the type the browser claims.
SIGNATURES = (
    (b"%PDF-", "pdf", "application/pdf", "pdf"),
    (b"\x89PNG\r\n\x1a\n", "image", "image/png", "png"),
    (b"\xff\xd8\xff", "image", "image/jpeg", "jpg"),
)


def sniff(data: bytes) -> tuple[str, str, str] | None:
    for sig, kind, mime, ext in SIGNATURES:
        if data.startswith(sig):
            return kind, mime, ext
    return None


def _view(r: Resource) -> dict:
    return {"id": r.id, "kind": r.kind, "title": r.title, "size": r.size, "in_email": r.in_email,
            "created_at": r.created_at.isoformat()}


def _get(db: Session, rid: str) -> Resource:
    try:
        UUID(rid)
    except ValueError:
        raise HTTPException(404, "not_found") from None
    r = db.scalar(select(Resource).where(Resource.id == rid).options(undefer(Resource.data)))
    if not r:
        raise HTTPException(404, "not_found")
    return r


def _file_name(r: Resource) -> str:
    ext = {"application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg"}[r.content_type]
    name = re.sub(r"[^A-Za-z0-9]+", "-", r.title).strip("-").lower()[:60] or "resource"
    return f"{name}.{ext}"


def _file_response(r: Resource) -> Response:
    return Response(r.data, media_type=r.content_type,
                    headers={"Content-Disposition": f'inline; filename="{_file_name(r)}"'})


@router.get("")
def list_resources(_: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Resource).order_by(Resource.created_at.desc()).limit(200)).all()
    return {"items": [_view(r) for r in rows]}


@router.get("/{rid}/file")
def get_file(rid: str, _: User = Depends(current_user), db: Session = Depends(get_db)):
    return _file_response(_get(db, rid))


@admin.post("")
async def upload(request: Request, title: str = Query(min_length=3, max_length=120), in_email: bool = False,
                 db: Session = Depends(get_db)):
    """Raw file bytes as the request body. The admin check runs before the body is read."""
    data = await request.body()
    if not data:
        raise HTTPException(422, "empty_file")
    if len(data) > get_settings().max_upload_bytes:
        raise HTTPException(413, "request_too_large")
    found = sniff(data)
    if not found:
        raise HTTPException(422, "unsupported_file_type")
    kind, mime, _ext = found
    if in_email and kind != "image":
        raise HTTPException(422, "only_images_in_email")
    r = Resource(kind=kind, title=title.strip(), content_type=mime, size=len(data), data=data, in_email=in_email)
    db.add(r)
    db.commit()
    return _view(r)


@admin.delete("/{rid}")
def delete(rid: str, db: Session = Depends(get_db)):
    r = _get(db, rid)
    if db.scalar(select(InterviewQuestion.send_on).where(InterviewQuestion.resource_id == rid).limit(1)):
        raise HTTPException(409, "resource_in_use")
    for c in db.scalars(select(EmailCampaign).where(EmailCampaign.status.in_(("draft", "scheduled")))):
        if c.attachment_id == rid or any(b.get("resource_id") == rid for b in c.blocks):
            raise HTTPException(409, "resource_in_use")
    db.delete(r)
    db.commit()
    return {"deleted": rid}


@public.get("/{rid}")
def public_image(rid: str, db: Session = Depends(get_db)):
    """Email images only. The id is random, and a file is public only if the admin marked it for email."""
    r = _get(db, rid)
    if not (r.in_email and r.kind == "image"):
        raise HTTPException(404, "not_found")
    return _file_response(r)
