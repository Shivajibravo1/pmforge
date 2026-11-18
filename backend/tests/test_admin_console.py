from tests.conftest import auth

ADMIN = "admin@example.com"


def admin_headers(client):
    h = auth("a1", ADMIN)
    client.get("/api/v1/me", headers=h)
    return h


def make_user(client, uid, email):
    h = auth(uid, email)
    client.get("/api/v1/me", headers=h)
    return h


def test_console_endpoints_require_admin(client):
    learner = auth()
    for path in ("/api/v1/admin/users", "/api/v1/admin/users/u1"):
        assert client.get(path, headers=learner).status_code == 403
        assert client.get(path).status_code == 401
    assert client.put("/api/v1/admin/users/u1/tier", json={"tier": "paid"}, headers=learner).status_code == 403


def test_list_shows_free_paid_and_admin_plans(client):
    admin = admin_headers(client)
    make_user(client, "u1", "free.user@example.com")
    make_user(client, "u2", "paid.user@example.com")
    assert client.put("/api/v1/admin/users/u2/tier", json={"tier": "paid"}, headers=admin).status_code == 200
    items = {i["email"]: i for i in client.get("/api/v1/admin/users", headers=admin).json()["items"]}
    assert items["free.user@example.com"]["plan"] == "free"
    assert items["paid.user@example.com"]["plan"] == "paid"
    assert items[ADMIN]["plan"] == "admin" and items[ADMIN]["role"] == "admin"


def test_list_includes_progress_search_and_paging(client):
    admin = admin_headers(client)
    h = make_user(client, "u1", "alice@example.com")
    make_user(client, "u2", "bob@example.com")
    assert client.post("/api/v1/lessons/1/complete", headers=h).status_code == 200
    body = client.get("/api/v1/admin/users?q=ALICE", headers=admin).json()
    assert body["total"] == 1
    row = body["items"][0]
    assert row["lessons_done"] == 1 and row["total_xp"] > 0 and row["last_active"]
    bob = client.get("/api/v1/admin/users?q=bob", headers=admin).json()["items"][0]
    assert bob["lessons_done"] == 0 and bob["last_active"] is None
    assert client.get("/api/v1/admin/users?limit=1", headers=admin).json()["total"] == 3
    assert len(client.get("/api/v1/admin/users?limit=1&offset=2", headers=admin).json()["items"]) == 1
    assert client.get("/api/v1/admin/users?limit=0", headers=admin).status_code == 422


def test_search_treats_wildcards_as_text(client):
    admin = admin_headers(client)
    make_user(client, "u1", "alice@example.com")
    assert client.get("/api/v1/admin/users?q=%25", headers=admin).json()["total"] == 0
    assert client.get("/api/v1/admin/users?q=_", headers=admin).json()["total"] == 0


def test_tier_change_is_audited_and_no_op_is_not(client):
    admin = admin_headers(client)
    make_user(client, "u1", "alice@example.com")
    r = client.put("/api/v1/admin/users/u1/tier", json={"tier": "paid"}, headers=admin)
    assert r.json() == {"id": "u1", "tier": "paid", "plan": "paid"}
    client.put("/api/v1/admin/users/u1/tier", json={"tier": "paid"}, headers=admin)  # no change
    audit = client.get("/api/v1/admin/users/u1", headers=admin).json()["audit"]
    assert len(audit) == 1
    assert audit[0]["action"] == "set_tier" and audit[0]["detail"] == {"from": "free", "to": "paid"}
    assert audit[0]["admin_id"] == "a1"


def test_admin_tier_cannot_be_changed(client):
    admin = admin_headers(client)
    r = client.put("/api/v1/admin/users/a1/tier", json={"tier": "paid"}, headers=admin)
    assert r.status_code == 409
    assert client.get("/api/v1/admin/users/a1", headers=admin).json()["plan"] == "admin"


def test_detail_has_learning_record_and_no_artifact_text(client, fake_ai):
    admin = admin_headers(client)
    h = make_user(client, "u1", "alice@example.com")
    client.post("/api/v1/lessons/1/complete", headers=h)
    d = client.get("/api/v1/admin/users/u1", headers=admin).json()
    assert d["email"] == "alice@example.com" and d["plan"] == "free"
    assert [p["day"] for p in d["progress"]] == [1]
    assert d["reviews"] == [] and d["certificates"] == [] and d["ai_usage_month"] == []
    assert "content" not in str(d)
    assert client.get("/api/v1/admin/users/ghost", headers=admin).status_code == 404


def test_admin_role_is_revoked_when_email_leaves_admin_list(client, monkeypatch):
    from app.config import get_settings
    assert client.get("/api/v1/me", headers=auth("u9", "admin@example.com")).json()["role"] == "admin"
    monkeypatch.setattr(get_settings(), "admin_emails", "someone-else@example.com")
    assert client.get("/api/v1/me", headers=auth("u9", "admin@example.com")).json()["role"] == "user"
    assert client.get("/api/v1/admin/stats", headers=auth("u9", "admin@example.com")).status_code == 403
