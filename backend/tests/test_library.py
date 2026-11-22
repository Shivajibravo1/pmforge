"""Architecture Library: content shape, plain-language rules, and who may open what."""
import re

from app import content
from tests.conftest import auth
from tests.test_interview_email import PAID, make_paid  # noqa: F401
from tests.test_resources import ADMIN

FREE = auth("f1", "f1@example.com")
FIELDS = ("business", "analogy", "arch", "pm_cost", "goes_wrong", "ask", "interview")


def test_every_explainer_is_complete_and_plain():
    items = content.architecture()
    assert len(items) >= 14 and len({i["id"] for i in items}) == len(items)
    assert any(i["free"] for i in items) and any(not i["free"] for i in items)
    for i in items:
        assert re.fullmatch(r"[a-z0-9-]+", i["id"])
        for f in FIELDS:
            assert i[f], (i["id"], f)
        for f in ("pm_cost", "goes_wrong", "ask"):
            assert 3 <= len(i[f]) <= 6, (i["id"], f)
        rows = [r for r in i["arch"].splitlines() if not r.startswith("#")]
        assert len(rows) >= 4 and all("|" in r for r in rows), i["id"]
        assert any(r.startswith("~") for r in rows), i["id"]
        text = repr(i)
        assert "—" not in text and "–" not in text, i["id"]  # no em or en dashes
        assert not re.search(r"\d+\s?%", text), i["id"]  # no invented statistics


def test_free_member_sees_all_but_opens_only_free(client):
    client.get("/api/v1/me", headers=FREE)
    items = client.get("/api/v1/library/architecture", headers=FREE).json()["items"]
    assert len(items) == len(content.architecture())
    free_one = next(i for i in items if not i["locked"])
    locked_one = next(i for i in items if i["locked"])
    assert "business" not in free_one  # the list carries only a summary
    assert client.get(f"/api/v1/library/architecture/{free_one['id']}", headers=FREE).status_code == 200
    assert client.get(f"/api/v1/library/architecture/{locked_one['id']}", headers=FREE).status_code == 402


def test_paid_and_admin_open_everything_and_auth_is_required(client):
    make_paid(client)
    client.get("/api/v1/me", headers=ADMIN)
    for h in (PAID, ADMIN):
        assert all(not i["locked"] for i in client.get("/api/v1/library/architecture", headers=h).json()["items"])
    assert client.get("/api/v1/library/architecture/rag-assistant", headers=PAID).json()["title"].startswith("RAG")
    assert client.get("/api/v1/library/architecture/nope", headers=PAID).status_code == 404
    assert client.get("/api/v1/library/architecture").status_code == 401
