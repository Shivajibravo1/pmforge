import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import content
from app.db import get_db
from app.models import Artifact, Certificate, Progress, Review, User
from app.security import current_user

router = APIRouter(prefix="/api/v1", tags=["portfolio"])
public = APIRouter(prefix="/public", tags=["public"])


def _items(db: Session, user_id: str) -> list[dict]:
    """Latest reviewed artifact per lesson, best score first within a day."""
    rows = db.execute(
        select(Artifact, Review).join(Review, Review.artifact_id == Artifact.id)
        .where(Artifact.user_id == user_id).order_by(Artifact.day, Review.score.desc())).all()
    seen: dict[int, dict] = {}
    for art, rev in rows:
        if art.day not in seen:
            seen[art.day] = {"day": art.day, "title": (content.get_day(art.day) or {}).get("title", ""),
                             "score": rev.score, "content": art.content}
    return list(seen.values())


@router.get("/portfolio")
def my_portfolio(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {"public": user.portfolio_public, "slug": user.portfolio_slug, "items": _items(db, user.id)}


class VisibilityIn(BaseModel):
    public: bool


@router.put("/portfolio/visibility")
def set_visibility(body: VisibilityIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.public and not user.portfolio_slug:
        user.portfolio_slug = secrets.token_urlsafe(8).lower().replace("_", "x").replace("-", "y")
    user.portfolio_public = body.public
    db.commit()
    return {"public": user.portfolio_public, "slug": user.portfolio_slug}


@public.get("/portfolio/{slug}")
def public_portfolio(slug: str, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.portfolio_slug == slug, User.portfolio_public.is_(True)))
    if user is None:
        raise HTTPException(404, "Portfolio not found")
    # No email or user id is exposed.
    return {"slug": slug, "items": _items(db, user.id)}


@router.post("/certificates/{level}", status_code=201)
def issue_certificate(level: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    needed = set(content.level_days(level))
    if not needed:
        raise HTTPException(404, "Level not found")
    done = set(db.scalars(select(Progress.day).where(Progress.user_id == user.id)))
    if not needed <= done:
        raise HTTPException(409, "level_incomplete")
    cert = db.scalar(select(Certificate).where(Certificate.user_id == user.id, Certificate.level == level))
    if cert is None:
        cert = Certificate(user_id=user.id, level=level)
        db.add(cert)
        db.commit()
    return {"code": cert.code, "level": level}


@public.get("/certificates/{code}")
def verify_certificate(code: str, db: Session = Depends(get_db)):
    cert = db.get(Certificate, code)
    if cert is None:
        raise HTTPException(404, "Certificate not found")
    title = next((lv["title"] for lv in content.curriculum()["levels"] if lv["id"] == cert.level), "")
    return {"valid": True, "level": cert.level, "level_title": title, "issued_at": cert.issued_at.date().isoformat()}
