"""Browser push: device sign-up needs consent and an allowed push service, and the send button reaches only agreed members."""
import base64

import pytest

from app import push
from app.config import get_settings
from app.db import SessionLocal
from app.models import MarketingConsent, PushDelivery, PushSubscription
from tests.conftest import auth
from tests.test_campaigns import URL, mk
from tests.test_interview_email import PAID, make_paid  # noqa: F401
from tests.test_marketing import agree
from tests.test_resources import ADMIN, USER

FREE = auth("f1", "f1@example.com")
GOOD = "https://fcm.googleapis.com/fcm/send/" + "a" * 40
KEYS = {"p256dh": "B" * 40, "auth": "c" * 16}


@pytest.fixture(autouse=True)
def vapid(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "vapid_public_key", "pub")
    monkeypatch.setattr(s, "vapid_private_key", "priv")
    monkeypatch.setattr(s, "vapid_subject", "mailto:a@b.c")


class Pusher:
    def __init__(self, gone=(), fail=()):
        self.calls, self.gone, self.fail = [], set(gone), set(fail)

    def __call__(self, s, **kw):
        if kw["endpoint"] in self.gone:
            raise push.PushGone("410")
        if kw["endpoint"] in self.fail:
            raise push.PushError("500")
        self.calls.append(kw)


def device(client, headers, endpoint=GOOD):
    return client.post("/api/v1/push/subscribe", headers=headers, json={"endpoint": endpoint, "keys": KEYS})


def test_endpoint_allowlist():
    assert push.endpoint_ok(GOOD)
    assert push.endpoint_ok("https://updates.push.services.mozilla.com/wpush/v2/abc")
    assert push.endpoint_ok("https://web.push.apple.com/abc")
    for bad in ("http://fcm.googleapis.com/x", "https://evil.example.com/x", "https://169.254.169.254/x",
                "https://fcm.googleapis.com.evil.com/x", "https://user@fcm.googleapis.com/x",
                "https://fcm.googleapis.com:8443/x"):
        assert not push.endpoint_ok(bad), bad


def test_device_signup_needs_consent_and_an_allowed_service(client):
    client.get("/api/v1/me", headers=FREE)
    assert device(client, FREE).status_code == 422  # no consent yet
    agree(client, FREE)
    assert device(client, FREE, "https://evil.example.com/" + "a" * 30).status_code == 422
    assert device(client, FREE).json() == {"subscribed": True}
    assert device(client, FREE).status_code == 200  # same device again updates, no duplicate
    st = client.get("/api/v1/push", headers=FREE).json()
    assert st["available"] and st["endpoints"] == [GOOD] and st["needs_consent"] is False


def test_signup_refused_when_push_is_not_configured(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "vapid_private_key", "")
    client.get("/api/v1/me", headers=FREE)
    agree(client, FREE)
    assert device(client, FREE).status_code == 424
    assert client.get("/api/v1/push", headers=FREE).json()["public_key"] == ""


def test_turning_off_tips_and_offers_removes_devices(client):
    client.get("/api/v1/me", headers=FREE)
    agree(client, FREE)
    device(client, FREE)
    client.post("/api/v1/marketing-email/unsubscribe", headers=FREE)
    with SessionLocal() as db:
        assert db.query(PushSubscription).count() == 0


def test_unsubscribe_link_removes_devices_too(client):
    client.get("/api/v1/me", headers=FREE)
    agree(client, FREE)
    device(client, FREE)
    with SessionLocal() as db:
        token = db.get(MarketingConsent, "f1").unsubscribe_token
    client.post(f"/public/interview/unsubscribe/{token}")
    with SessionLocal() as db:
        assert db.query(PushSubscription).count() == 0


def test_shared_browser_moves_to_the_signed_in_member(client):
    for h in (FREE, PAID):
        client.get("/api/v1/me", headers=h)
        agree(client, h)
    device(client, FREE)
    device(client, PAID)
    with SessionLocal() as db:
        rows = db.query(PushSubscription).all()
        assert [r.user_id for r in rows] == ["p1"]


def test_send_reaches_only_agreed_members_with_a_device_and_only_once(client, monkeypatch):
    client.get("/api/v1/me", headers=FREE)
    client.get("/api/v1/me", headers=USER)
    make_paid(client)
    for h in (FREE, PAID):
        agree(client, h)
    device(client, FREE)
    device(client, PAID, GOOD + "b")
    p = Pusher()
    monkeypatch.setattr("app.push.send_push", p)
    cid = mk(client, subject="Big offer", blocks=[{"type": "text", "text": "Save   20%\n\nthis week"}]).json()["id"]
    counts = client.get(f"{URL}/audience", headers=ADMIN).json()
    assert counts["push_available"] and counts["push"] == {"all": 2, "paid": 1, "free": 1}
    r = client.post(f"{URL}/{cid}/push", headers=ADMIN, json={"audience": "free"}).json()
    assert r == {"sent": 1, "failed": 0, "remaining": 0}
    assert p.calls[0]["title"] == "Big offer" and p.calls[0]["body"] == "Save 20% this week"
    again = client.post(f"{URL}/{cid}/push", headers=ADMIN, json={"audience": "all"}).json()
    assert again["sent"] == 1  # the paid member only
    assert len(p.calls) == 2


def test_dead_devices_are_forgotten_and_failures_not_retried(client, monkeypatch):
    client.get("/api/v1/me", headers=FREE)
    agree(client, FREE)
    device(client, FREE)
    monkeypatch.setattr("app.push.send_push", Pusher(gone={GOOD}))
    cid = mk(client).json()["id"]
    r = client.post(f"{URL}/{cid}/push", headers=ADMIN, json={"audience": "all"}).json()
    assert r["sent"] == 0 and r["failed"] == 1
    with SessionLocal() as db:
        assert db.query(PushSubscription).count() == 0
        assert db.query(PushDelivery).count() == 1


def test_push_guards(client, monkeypatch):
    cid = mk(client).json()["id"]
    assert client.post(f"{URL}/{cid}/push", headers=USER, json={"audience": "all"}).status_code == 403
    assert client.post(f"{URL}/{cid}/push", headers=ADMIN, json={"audience": "x"}).status_code == 422
    monkeypatch.setattr(get_settings(), "vapid_private_key", "")
    assert client.post(f"{URL}/{cid}/push", headers=ADMIN, json={"audience": "all"}).status_code == 424


def test_generated_keys_have_the_expected_shape():
    from cryptography.hazmat.primitives import serialization
    from py_vapid import Vapid
    v = Vapid()
    v.generate_keys()
    pub = v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    assert len(pub) == 65 and len(base64.urlsafe_b64encode(pub).rstrip(b"=")) == 87
