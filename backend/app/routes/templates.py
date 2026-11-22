from fastapi import APIRouter, Depends, HTTPException

from app import content
from app.models import User
from app.security import current_user

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


def _open(item: dict, user: User) -> bool:
    return bool(item["free"]) or user.role == "admin" or user.tier == "paid"


@router.get("")
def list_templates(user: User = Depends(current_user)):
    return {"items": [{"id": i["id"], "title": i["title"], "tagline": i["tagline"], "layout": i["layout"],
                       "free": i["free"], "locked": not _open(i, user)} for i in content.templates()]}


@router.get("/{item_id}")
def get_template(item_id: str, user: User = Depends(current_user)):
    item = next((i for i in content.templates() if i["id"] == item_id), None)
    if item is None:
        raise HTTPException(404, "Not found")
    if not _open(item, user):
        raise HTTPException(402, "upgrade_required")
    return item
