from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Certificate, Progress, Review, UsageLog, User
from app.security import require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])


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


class TierIn(BaseModel):
    tier: str


@router.put("/users/{user_id}/tier")
def set_tier(user_id: str, body: TierIn, db: Session = Depends(get_db)):
    """Phase A test entitlement. Replaced by the SuperProfile purchase webhook in Phase B."""
    if body.tier not in ("free", "paid"):
        raise HTTPException(422, "tier must be free or paid")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    user.tier = body.tier
    db.commit()
    return {"id": user.id, "tier": user.tier}
