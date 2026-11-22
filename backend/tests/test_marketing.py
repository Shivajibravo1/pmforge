"""Tips and offers consent, and the Send to all / paid / free buttons under the email composer."""
from app import interview
from app.config import get_settings
from app.db import SessionLocal
from app.models import CampaignDelivery
from tests.conftest import auth
from tests.test_campaigns import URL, mk
from tests.test_interview_email import PAID, Sender, make_paid, opt_in  # noqa: F401
from tests.test_resources import ADMIN, USER

FREE = auth("f1", "f1@example.com")
MURL = "/api/v1/marketing-email"


def agree(client, headers):
    return client.post(f"{MURL}/subscribe", headers=headers,
                       json={"agree": True, "consent_version": interview.MARKETING_CONSENT_VERSION})


def configure(monkeypatch, cap=80):
    s = Sender()
    monkeypatch.setattr("app.emailer.send_email", s)
    monkeypatch.setattr(get_settings(), "resend_api_key", "k")
    monkeypatch.setattr(get_settings(), "email_from", "PMForge <a@b.c>")
    monkeypatch.setattr(get_settings(), "interview_email_daily_cap", cap)
    return s


def test_consent_needs_a_clear_yes_and_the_current_wording(client):
    client.get("/api/v1/me", headers=FREE)
    assert client.get(MURL, headers=FREE).json()["subscribed"] is False
    bad = client.post(f"{MURL}/subscribe", headers=FREE, json={"agree": False, "consent_version": "x"})
    assert bad.status_code == 422
    stale = client.post(f"{MURL}/subscribe", headers=FREE, json={"agree": True, "consent_version": "old"})
    assert stale.status_code == 422
    assert agree(client, FREE).json() == {"subscribed": True}
    assert client.get(MURL, headers=FREE).json()["subscribed"] is True
    assert client.post(f"{MURL}/unsubscribe", headers=FREE).json() == {"subscribed": False}
    assert client.get(MURL, headers=FREE).json()["subscribed"] is False


def test_audience_counts_only_agreed_members_and_never_admins(client):
    client.get("/api/v1/me", headers=ADMIN)
    client.get("/api/v1/me", headers=FREE)
    client.get("/api/v1/me", headers=USER)
    make_paid(client)
    agree(client, FREE)
    agree(client, PAID)
    agree(client, ADMIN)
    r = client.get(f"{URL}/audience", headers=ADMIN).json()
    assert r["paid"] == 1 and r["free"] == 1 and r["all"] == 2  # USER did not agree, admin is excluded
    assert client.get(f"{URL}/audience", headers=USER).status_code == 403


def test_broadcast_reaches_chosen_plan_only_and_only_once(client, monkeypatch):
    client.get("/api/v1/me", headers=FREE)
    make_paid(client)
    agree(client, FREE)
    agree(client, PAID)
    s = configure(monkeypatch)
    cid = mk(client).json()["id"]
    r = client.post(f"{URL}/{cid}/broadcast", headers=ADMIN, json={"audience": "free"}).json()
    assert r["sent"] == 1 and r["remaining"] == 0
    assert [c["to"] for c in s.calls] == ["f1@example.com"]
    assert "/unsubscribe/" in s.calls[0]["unsubscribe_url"] or "/public/" in s.calls[0]["unsubscribe_url"]
    again = client.post(f"{URL}/{cid}/broadcast", headers=ADMIN, json={"audience": "all"}).json()
    assert again["sent"] == 1  # the paid member only: the free one already has it
    assert [c["to"] for c in s.calls] == ["f1@example.com", "p1@example.com"]
    with SessionLocal() as db:
        assert db.query(CampaignDelivery).count() == 2


def test_unsubscribed_members_are_skipped(client, monkeypatch):
    client.get("/api/v1/me", headers=FREE)
    agree(client, FREE)
    client.post(f"{MURL}/unsubscribe", headers=FREE)
    s = configure(monkeypatch)
    cid = mk(client).json()["id"]
    assert client.post(f"{URL}/{cid}/broadcast", headers=ADMIN, json={"audience": "all"}).json()["sent"] == 0
    assert s.calls == []


def test_daily_limit_pauses_sending(client, monkeypatch):
    client.get("/api/v1/me", headers=FREE)
    agree(client, FREE)
    s = configure(monkeypatch, cap=0)
    cid = mk(client).json()["id"]
    r = client.post(f"{URL}/{cid}/broadcast", headers=ADMIN, json={"audience": "all"}).json()
    assert r["sent"] == 0 and r["remaining"] == 1 and r["limit_reached"] is True
    assert s.calls == []


def test_broadcast_guards(client, monkeypatch):
    cid = mk(client).json()["id"]
    assert client.post(f"{URL}/{cid}/broadcast", headers=USER, json={"audience": "all"}).status_code == 403
    monkeypatch.setattr(get_settings(), "resend_api_key", "")
    assert client.post(f"{URL}/{cid}/broadcast", headers=ADMIN, json={"audience": "all"}).status_code == 424
    configure(monkeypatch)
    assert client.post(f"{URL}/{cid}/broadcast", headers=ADMIN, json={"audience": "nobody"}).status_code == 422


def test_one_click_unsubscribe_link_opts_out_marketing(client):
    client.get("/api/v1/me", headers=FREE)
    agree(client, FREE)
    from app.models import MarketingConsent
    with SessionLocal() as db:
        token = db.get(MarketingConsent, "f1").unsubscribe_token
    assert client.post(f"/public/interview/unsubscribe/{token}").status_code == 200
    assert client.get(MURL, headers=FREE).json()["subscribed"] is False
