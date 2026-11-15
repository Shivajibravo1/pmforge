from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import content
from app.config import Settings, get_settings
from app.db import get_db
from app.models import Progress, User
from app.security import current_user

router = APIRouter(prefix="/api/v1", tags=["learning"])


def completed_days(db: Session, user_id: str) -> set[int]:
    return set(db.scalars(select(Progress.day).where(Progress.user_id == user_id)))


def require_access(day: int, user: User, done: set[int], settings: Settings) -> dict:
    meta = content.get_day(day)
    if meta is None:
        raise HTTPException(404, "Lesson not found")
    if user.tier == "free" and day > settings.free_lessons:
        raise HTTPException(402, "upgrade_required")
    if day > 1 and (day - 1) not in done and day not in done:
        raise HTTPException(409, "previous_lesson_incomplete")
    return meta


def streak(dates: set[date], today: date) -> int:
    cursor = today if today in dates else today - timedelta(days=1)
    n = 0
    while cursor in dates:
        n += 1
        cursor -= timedelta(days=1)
    return n


@router.get("/curriculum")
def get_curriculum(settings: Settings = Depends(get_settings)):
    """Public outline: titles only, no lesson bodies."""
    return {
        "free_lessons": settings.free_lessons,
        "levels": [
            {"id": lv["id"], "title": lv["title"],
             "days": [{k: d[k] for k in ("day", "type", "title", "phase")} for d in lv["days"]]}
            for lv in content.curriculum()["levels"]
        ],
    }


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "role": user.role, "tier": user.tier}


@router.get("/lessons/{day}")
def get_lesson(day: int, user: User = Depends(current_user), db: Session = Depends(get_db),
               settings: Settings = Depends(get_settings)):
    meta = require_access(day, user, completed_days(db, user.id), settings)
    return {**{k: meta[k] for k in ("day", "type", "title", "phase", "level")},
            "rubric": meta.get("rubric", []), "body": content.lesson_body(day),
            "completed": day in completed_days(db, user.id)}


class CompleteOut(BaseModel):
    day: int
    xp_awarded: int
    total_xp: int
    streak: int
    newly_completed: bool = False


@router.post("/lessons/{day}/complete", response_model=CompleteOut)
def complete_lesson(day: int, user: User = Depends(current_user), db: Session = Depends(get_db),
                    settings: Settings = Depends(get_settings)):
    done = completed_days(db, user.id)
    meta = require_access(day, user, done, settings)
    newly = day not in done
    if newly:
        db.add(Progress(user_id=user.id, day=day, xp=content.XP.get(meta["type"], 10),
                        completed_on=date.today()))
        db.commit()
    rows = db.scalars(select(Progress).where(Progress.user_id == user.id)).all()
    mine = next(r for r in rows if r.day == day)
    return CompleteOut(day=day, xp_awarded=mine.xp, total_xp=sum(r.xp for r in rows),
                       streak=streak({r.completed_on for r in rows}, date.today()),
                       newly_completed=newly)


@router.get("/progress")
def get_progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Progress).where(Progress.user_id == user.id)).all()
    return {"completed": sorted(r.day for r in rows), "total_xp": sum(r.xp for r in rows),
            "streak": streak({r.completed_on for r in rows}, date.today())}
