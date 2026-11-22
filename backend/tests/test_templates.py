"""PM templates: content shape, plain-language rules and who may open what."""
import re

from app import content
from tests.conftest import auth
from tests.test_interview_email import PAID, make_paid  # noqa: F401

FREE = auth("f1", "f1@example.com")


def test_every_template_is_complete_and_plain():
    items = content.templates()
    ids = [i["id"] for i in items]
    assert len(ids) == len(set(ids)) >= 8
    assert {"raid-log", "risk-register", "project-charter", "raci-matrix"} <= set(ids)
    assert 3 <= sum(i["free"] for i in items) < len(items)
    for i in items:
        keys = [c["key"] for c in i["columns"]]
        assert len(keys) == len(set(keys)) >= 2
        assert i["layout"] in ("table", "doc") and len(i["example"]) >= 3
        for row in i["example"]:
            assert set(row) <= set(keys), (i["id"], set(row) - set(keys))
        for c in i["columns"]:
            if c["kind"].startswith("product:"):
                assert set(c["kind"][8:].split(",")) <= set(keys)
        assert len(i["tips"]) >= 3 and len(i["mistakes"]) >= 3 and i["purpose"] and i["when"]
        text = repr(i)
        assert "—" not in text and "–" not in text and not re.search(r"\d+\s?%", text), i["id"]
        if i["layout"] == "doc":
            assert i.get("fixed_rows") and keys[0] == "section"


def test_free_sees_all_opens_free_only(client):
    client.get("/api/v1/me", headers=FREE)
    items = client.get("/api/v1/templates", headers=FREE).json()["items"]
    assert len(items) == len(content.templates())
    ok = next(i for i in items if not i["locked"])
    shut = next(i for i in items if i["locked"])
    assert client.get(f"/api/v1/templates/{ok['id']}", headers=FREE).status_code == 200
    assert client.get(f"/api/v1/templates/{shut['id']}", headers=FREE).status_code == 402
    assert client.get("/api/v1/templates/nope", headers=FREE).status_code == 404
    assert client.get("/api/v1/templates").status_code == 401


def test_paid_opens_everything(client):
    make_paid(client)
    assert all(not i["locked"] for i in client.get("/api/v1/templates", headers=PAID).json()["items"])
    assert client.get("/api/v1/templates/raci-matrix", headers=PAID).status_code == 200
