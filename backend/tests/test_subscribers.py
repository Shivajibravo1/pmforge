"""Admin list of members by plan, and the manual send of today's interview email to chosen members."""
from app.config import get_settings
from tests.conftest import auth
from tests.test_interview_email import PAID, Sender, make_paid, opt_in  # noqa: F401

ADMIN = auth("adm", "admin@example.com")
FREE = auth("f1", "f1@example.com")
URL = "/api/v1/admin/subscribers"


def setup_members(client):
    client.get("/api/v1/me", headers=ADMIN)
    client.get("/api/v1/me", headers=FREE)
    make_paid(client)
    opt_in(client)


def test_only_admin_can_list_or_send(client):
    assert client.get(f"{URL}?tier=paid", headers=PAID).status_code == 403
    assert client.post(f"{URL}/send", json={"user_ids": ["p1"]}, headers=PAID).status_code == 403
    assert client.get(f"{URL}?tier=paid").status_code == 401


def test_tabs_split_paid_and_free_and_show_opt_in(client):
    setup_members(client)
    paid = client.get(f"{URL}?tier=paid", headers=ADMIN).json()
    free = client.get(f"{URL}?tier=free", headers=ADMIN).json()
    p1 = next(i for i in paid["items"] if i["id"] == "p1")
    assert p1["opted_in"] is True and p1["email"] == "p1@example.com"
    f1 = next(i for i in free["items"] if i["id"] == "f1")
    assert f1["opted_in"] is True  # members are subscribed by default at first sign-in
    assert all(i["id"] != "adm" for i in paid["items"] + free["items"])  # admins are not on a plan
    assert paid["counts"]["paid"] >= 1 and free["counts"]["free"] >= 1


def test_search_narrows_the_list(client):
    setup_members(client)
    r = client.get(f"{URL}?tier=paid&q=p1@", headers=ADMIN).json()
    assert [i["id"] for i in r["items"]] == ["p1"]


def test_send_reaches_subscribed_members_and_only_once_a_day(client, monkeypatch):
    setup_members(client)
    s = Sender()
    monkeypatch.setattr("app.emailer.send_email", s)
    monkeypatch.setattr(get_settings(), "resend_api_key", "k")
    monkeypatch.setattr(get_settings(), "email_from", "PMForge <a@b.c>")
    r = client.post(f"{URL}/send", json={"user_ids": ["p1", "f1"]}, headers=ADMIN).json()
    assert r == {"requested": 2, "sent": 2, "failed": 0, "skipped": 0}
    assert sorted(c["to"] for c in s.calls) == ["f1@example.com", "p1@example.com"]
    client.post("/api/v1/interview-email/unsubscribe", headers=FREE)
    assert client.post(f"{URL}/send", json={"user_ids": ["f1"]}, headers=ADMIN).json()["sent"] == 0
    again = client.post(f"{URL}/send", json={"user_ids": ["p1"]}, headers=ADMIN).json()
    assert again["sent"] == 0 and again["skipped"] == 1  # one email a day, even when sent by hand


def test_send_needs_email_setup_and_a_choice(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "resend_api_key", "")
    assert client.post(f"{URL}/send", json={"user_ids": ["p1"]}, headers=ADMIN).status_code == 424
    assert client.post(f"{URL}/send", json={"user_ids": []}, headers=ADMIN).status_code == 422
    assert client.post(f"{URL}/send", json={"user_ids": [str(i) for i in range(51)]}, headers=ADMIN).status_code == 422
