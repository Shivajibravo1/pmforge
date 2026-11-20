"""SuperProfile purchases relayed by the n8n bridge: signature, idempotency, plan mapping, expiry and claiming."""
import hashlib
import hmac
import json
import secrets
import time
from datetime import date, timedelta

import pytest

from app import billing
from app.config import get_settings
from app.db import SessionLocal
from app.models import Payment, User
from tests.conftest import auth

SECRET = secrets.token_hex(16)  # random per run, so the secrets scanner sees no literal key
URL = "/public/payments/superprofile"


@pytest.fixture(autouse=True)
def payment_settings(monkeypatch):
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", SECRET)
    monkeypatch.setenv("SUPERPROFILE_MONTHLY_TITLE", "PMForge Monthly")
    monkeypatch.setenv("SUPERPROFILE_YEARLY_TITLE", "PMForge Yearly")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def order(**kw):
    base = {"transaction_id": "6486690386", "buyer_email": "Buyer@Example.com", "product_title": "PMForge Monthly",
            "amount": 699, "currency": "INR"}
    base.update(kw)
    return base


def post(client, payload, secret=SECRET, ts=None, raw=None):
    body = raw if raw is not None else json.dumps(payload).encode()
    ts = str(int(time.time()) if ts is None else ts)
    sig = "sha256=" + hmac.new(secret.encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()
    return client.post(URL, content=body, headers={"Content-Type": "application/json",
                                                   "X-PMForge-Timestamp": ts, "X-PMForge-Signature": sig})


def user(uid):
    with SessionLocal() as db:
        return db.get(User, uid)


def test_signed_purchase_unlocks_existing_user(client):
    client.get("/api/v1/me", headers=auth("u1", "buyer@example.com"))
    r = post(client, order())
    assert r.status_code == 200 and r.json() == {"status": "applied"}
    u = user("u1")
    assert u.tier == "paid" and u.paid_until is not None
    assert client.get("/api/v1/lessons/8", headers=auth("u1", "buyer@example.com")).status_code != 402


def test_bad_or_missing_signature_and_old_timestamp_are_refused(client):
    assert post(client, order(), secret="wrong").status_code == 401
    assert client.post(URL, json=order()).status_code == 401
    assert post(client, order(), ts=int(time.time()) - 3600).status_code == 401
    with SessionLocal() as db:
        assert db.query(Payment).count() == 0


def test_no_secret_configured_fails_closed(client, monkeypatch):
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "")
    get_settings.cache_clear()
    assert post(client, order(), secret="").status_code == 503


def test_repeated_transaction_is_idempotent(client):
    client.get("/api/v1/me", headers=auth("u1", "buyer@example.com"))
    post(client, order())
    first = user("u1").paid_until
    assert post(client, order()).json() == {"status": "duplicate"}
    assert user("u1").paid_until == first


def test_purchase_before_signup_is_claimed_at_first_sign_in(client):
    assert post(client, order(product_title="PMForge Yearly", amount=3499)).json() == {"status": "pending"}
    me = client.get("/api/v1/me", headers=auth("u9", "buyer@example.com")).json()
    assert me["tier"] == "paid"
    assert date.fromisoformat(me["paid_until"]) - date.today() >= timedelta(days=363)


def test_other_products_are_ignored_and_underpayment_goes_to_review(client):
    client.get("/api/v1/me", headers=auth("u1", "buyer@example.com"))
    assert post(client, order(product_title="Speak with Impact Book 1 & 2", amount=499)).json()["status"] == "ignored"
    assert post(client, order(transaction_id="t-0002", amount=1)).json()["status"] == "review"
    assert post(client, order(transaction_id="t-0003", currency="USD")).json()["status"] == "review"
    assert user("u1").tier == "free"


def test_invalid_payload_is_rejected(client):
    assert post(client, None, raw=b"not json").status_code == 422
    assert post(client, order(buyer_email="nobody")).status_code == 422
    assert post(client, order(transaction_id="bad id;drop")).status_code == 422


def test_admin_accounts_are_never_changed_by_a_purchase(client):
    client.get("/api/v1/me", headers=auth("a1", "admin@example.com"))
    assert post(client, order(buyer_email="admin@example.com")).json()["status"] == "pending"
    assert user("a1").tier == "free"


def test_early_renewal_extends_from_current_end_date():
    u = User(id="x", email="x@example.com", tier="free")
    today = date(2026, 11, 20)
    billing.grant(u, 30, today)
    assert u.paid_until == date(2026, 12, 19)
    billing.grant(u, 30, today)
    assert u.paid_until == date(2027, 1, 18)


def test_plan_ends_and_user_returns_to_free(client):
    client.get("/api/v1/me", headers=auth("u1", "buyer@example.com"))
    with SessionLocal() as db:
        u = db.get(User, "u1")
        u.tier, u.paid_until = "paid", date.today() - timedelta(days=2)
        db.commit()
    assert client.get("/api/v1/me", headers=auth("u1", "buyer@example.com")).json()["tier"] == "free"


def test_bulk_expiry_for_background_jobs():
    with SessionLocal() as db:
        db.add_all([User(id="p1", email="p1@example.com", tier="paid", paid_until=date(2026, 1, 1)),
                    User(id="p2", email="p2@example.com", tier="paid", paid_until=None)])
        db.commit()
        assert billing.expire_due(db, date(2026, 2, 1)) == 1
        assert db.get(User, "p2").tier == "paid"


def test_payments_list_is_admin_only(client):
    assert client.get("/api/v1/admin/payments", headers=auth()).status_code == 403
    client.get("/api/v1/me", headers=auth("a1", "admin@example.com"))
    post(client, order())
    items = client.get("/api/v1/admin/payments", headers=auth("a1", "admin@example.com")).json()["items"]
    assert items[0]["transaction_id"] == "6486690386"
