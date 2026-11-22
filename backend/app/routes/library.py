from fastapi import APIRouter, Depends, HTTPException

from app import content
from app.models import User
from app.security import current_user

router = APIRouter(prefix="/api/v1/library", tags=["library"])

SUMMARY = ("id", "title", "tagline", "category", "free")


def _open(item: dict, user: User) -> bool:
    return bool(item["free"]) or user.role == "admin" or user.tier == "paid"


@router.get("/architecture")
def list_architecture(user: User = Depends(current_user)):
    """Every explainer is listed so free members can see what paid unlocks. Only the free ones can be opened."""
    return {"items": [{**{k: i[k] for k in SUMMARY}, "locked": not _open(i, user)} for i in content.architecture()]}


@router.get("/architecture/{item_id}")
def get_architecture(item_id: str, user: User = Depends(current_user)):
    item = next((i for i in content.architecture() if i["id"] == item_id), None)
    if item is None:
        raise HTTPException(404, "Not found")
    if not _open(item, user):
        raise HTTPException(402, "upgrade_required")
    return item
