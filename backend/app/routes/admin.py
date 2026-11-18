from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AdminAudit, Artifact, Certificate, Progress, Review, UsageLog, User
from app.security import require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def plan_of(user: User) -> str:
    """What the console shows: admin, paid or free. Admins are not on a plan."""
    return "admin" if user.role == "admin" else ("paid" if user.tier == "paid" else "free")


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    first = date.today().replace(day=1)
    return {
        "users": db.scalar(select(func.count()).select_from(User)),
        "lessons_completed": db.scalar(select(func.count()).select_from(Progress)),
        "reviews": db.scalar(select(func.count()).select_from(Review)),
        "certificates": db.scalar(select(func.count()).select_from(Certificate)),
        "ai_cost_month_usd": round(db.scalar(select(func.coalesce(func.sum(UsageLog.cost_usd), 0.0))
                                             .where(UsageLog.day >= first)) or 0.0, 4),
    }


@router.get("/users")
def list_users(q: str = Query("", max_length=100), limit: int = Query(50, ge=1, le=100),
               offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    """Newest first. `q` matches part of an email, case-insensitively."""
    term = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    where = [User.email.ilike(f"%{term}%", escape="\\")] if term else []
    prog = (select(Progress.user_id.label("uid"), func.count().label("lessons"),
                   func.coalesce(func.sum(Progress.xp), 0).label("xp"),
                   func.max(Progress.completed_on).label("last"))
            .group_by(Progress.user_id).subquery())
    rows = db.execute(select(User, prog.c.lessons, prog.c.xp, prog.c.last)
                      .outerjoin(prog, prog.c.uid == User.id).where(*where)
                      .order_by(User.created_at.desc(), User.id).limit(limit).offset(offset)).all()
    total = db.scalar(select(func.count()).select_from(User).where(*where))
    return {
        "total": total,
        "items": [{
            "id": u.id, "email": u.email, "role": u.role, "tier": u.tier, "plan": plan_of(u),
            "created_at": u.created_at.isoformat(),
            "lessons_done": lessons or 0, "total_xp": int(xp or 0),
            "last_active": last.isoformat() if last else None,
        } for u, lessons, xp, last in rows],
    }


@router.get("/users/{user_id}")
def user_detail(user_id: str, db: Session = Depends(get_db)):
    """Learning record only. Artifact text is deliberately not returned."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    first = date.today().replace(day=1)
    progress = db.execute(select(Progress.day, Progress.xp, Progress.completed_on)
                          .where(Progress.user_id == user_id).order_by(Progress.day)).all()
    reviews = db.execute(select(Artifact.day, Review.score, Review.created_at)
                         .join(Artifact, Artifact.id == Review.artifact_id)
                         .where(Review.user_id == user_id).order_by(Review.created_at.desc()).limit(50)).all()
    certs = db.execute(select(Certificate.level, Certificate.issued_at)
                       .where(Certificate.user_id == user_id).order_by(Certificate.level)).all()
    usage = db.execute(select(UsageLog.kind, func.count(), func.coalesce(func.sum(UsageLog.cost_usd), 0.0))
                       .where(UsageLog.user_id == user_id, UsageLog.day >= first)
                       .group_by(UsageLog.kind)).all()
    audit = db.scalars(select(AdminAudit).where(AdminAudit.target_user_id == user_id)
                       .order_by(AdminAudit.created_at.desc()).limit(20)).all()
    return {
        "id": user.id, "email": user.email, "role": user.role, "tier": user.tier, "plan": plan_of(user),
        "created_at": user.created_at.isoformat(),
        "progress": [{"day": d, "xp": xp, "completed_on": on.isoformat()} for d, xp, on in progress],
        "reviews": [{"day": d, "score": sc, "created_at": at.isoformat()} for d, sc, at in reviews],
        "certificates": [{"level": lv, "issued_at": at.isoformat()} for lv, at in certs],
        "ai_usage_month": [{"kind": k, "calls": n, "cost_usd": round(float(c), 4)} for k, n, c in usage],
        "audit": [{"action": a.action, "detail": a.detail, "admin_id": a.admin_id,
                   "created_at": a.created_at.isoformat()} for a in audit],
    }


class TierIn(BaseModel):
    tier: str


@router.put("/users/{user_id}/tier")
def set_tier(user_id: str, body: TierIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Phase A test entitlement. Replaced by the SuperProfile purchase webhook in Phase B."""
    if body.tier not in ("free", "paid"):
        raise HTTPException(422, "tier must be free or paid")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(409, "Admins are not on a plan")
    if user.tier != body.tier:
        db.add(AdminAudit(admin_id=admin.id, target_user_id=user.id, action="set_tier",
                          detail={"from": user.tier, "to": body.tier}))
        user.tier = body.tier
        db.commit()
    return {"id": user.id, "tier": user.tier, "plan": plan_of(user)}
