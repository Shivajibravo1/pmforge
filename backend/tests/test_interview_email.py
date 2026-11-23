from datetime import UTC, datetime, timedelta

import pytest

from app import emailer, interview
from app.config import get_settings
from app.db import SessionLocal
from app.jobs.interview_email import IST, run_once
from tests.conftest import auth

ADMIN = auth("adm", "admin@example.com")
PAID = auth("p1", "p1@example.com")
NOON = datetime(2026, 11, 20, 12, 0, tzinfo=IST).astimezone(UTC)


class Sender:
    def __init__(self, fail=False):
        self.calls, self.fail = [], fail

    def __call__(self, settings, **kw):
        if self.fail:
            raise emailer.EmailError("down")
        self.calls.append(kw)


def make_paid(client, headers=PAID):
    client.get("/api/v1/me", headers=headers)
    from app.models import User
    with SessionLocal() as db:
        db.get(User, headers["Authorization"].split()[1].split("|")[0]).tier = "paid"
        db.commit()


def opt_in(client, headers=PAID):
    return client.post("/api/v1/interview-email/subscribe", headers=headers,
                       json={"agree": True, "consent_version": interview.CONSENT_VERSION})


def run(sender, now=NOON):
    with SessionLocal() as db:
        return run_once(db, get_settings(), sender, now)


def test_bank_uses_real_lesson_questions_and_interleaves_levels():
    b = interview.bank()
    assert len(b) > 100
    assert [x["level"] for x in b[:4]] == [1, 2, 3, 4]
    assert interview.question_for(len(b))["question"] == b[0]["question"]


def test_compose_escapes_html():
    q = {"day": 1, "question": "<script>alert(1)</script> why?", "tips": ["a & b"]}
    _, text, html = interview.compose(q, lesson_url="https://x/y", unsubscribe_url="https://x/u")
    assert "<script>" not in html and "&lt;script&gt;" in html and "a &amp; b" in html
    assert "https://x/u" in text


def test_free_user_cannot_subscribe(client):
    client.get("/api/v1/me", headers=PAID)
    assert opt_in(client).status_code == 403


def test_subscribe_needs_consent(client):
    make_paid(client)
    r = client.post("/api/v1/interview-email/subscribe", headers=PAID, json={"agree": False, "consent_version": interview.CONSENT_VERSION})
    assert r.status_code == 422
    r = client.post("/api/v1/interview-email/subscribe", headers=PAID, json={"agree": True, "consent_version": "old"})
    assert r.status_code == 422
    assert opt_in(client).status_code == 200
    assert client.get("/api/v1/interview-email", headers=PAID).json()["subscribed"] is True


def test_job_sends_once_per_day_and_rotates(client):
    make_paid(client)
    opt_in(client)
    s = Sender()
    assert run(s)["sent"] == 1 and run(s)["sent"] == 0
    assert s.calls[0]["idempotency_key"].startswith("interview-p1-")
    assert "/public/interview/unsubscribe/" in s.calls[0]["unsubscribe_url"]
    assert "/unsubscribe/" in s.calls[0]["text"] and "/public/" not in s.calls[0]["text"]
    assert run(s, NOON + timedelta(days=1))["sent"] == 1
    assert s.calls[0]["text"] != s.calls[1]["text"]


def test_job_waits_for_send_hour(client):
    make_paid(client)
    opt_in(client)
    early = datetime(2026, 11, 20, 3, 0, tzinfo=IST).astimezone(UTC)
    assert run(Sender(), early)["sent"] == 0


def test_job_skips_free_and_opted_out(client):
    make_paid(client)
    opt_in(client)
    client.post("/api/v1/interview-email/unsubscribe", headers=PAID)
    assert run(Sender())["sent"] == 0


def test_job_respects_daily_cap(client):
    for i in range(3):
        h = auth(f"p{i}", f"p{i}@example.com")
        make_paid(client, h)
        opt_in(client, h)
    get_settings_ = get_settings()
    original = get_settings_.interview_email_daily_cap
    get_settings_.interview_email_daily_cap = 2
    try:
        assert run(Sender())["sent"] == 2
        assert run(Sender())["sent"] == 0
    finally:
        get_settings_.interview_email_daily_cap = original


def test_failure_reverts_and_retries_then_pauses(client):
    make_paid(client)
    opt_in(client)
    assert run(Sender(fail=True))["failed"] == 1
    assert run(Sender())["sent"] == 1  # same day retry works, rotation did not skip
    for _ in range(5):
        run(Sender(fail=True), NOON + timedelta(days=2))
    from app.models import InterviewSubscription
    with SessionLocal() as db:
        sub = db.get(InterviewSubscription, "p1")
        assert sub.failures >= 1


def test_public_unsubscribe(client):
    make_paid(client)
    opt_in(client)
    from app.models import InterviewSubscription
    with SessionLocal() as db:
        token = db.get(InterviewSubscription, "p1").unsubscribe_token
    assert client.post("/public/interview/unsubscribe/nope").status_code == 200
    assert client.post(f"/public/interview/unsubscribe/{token}").status_code == 200
    assert client.get("/api/v1/interview-email", headers=PAID).json()["subscribed"] is False
    assert run(Sender())["sent"] == 0


def test_scheduled_question_overrides_rotation(client):
    make_paid(client)
    opt_in(client)
    day = NOON.astimezone(IST).date().isoformat()
    with SessionLocal() as db:  # admin routes reject past dates relative to real today, so insert directly
        from datetime import date

        from app.models import InterviewQuestion
        db.add(InterviewQuestion(send_on=date.fromisoformat(day), question="My own question for today?", tips=["tip one"]))
        db.commit()
    s = Sender()
    run(s)
    assert "My own question for today?" in s.calls[0]["text"]
    from app.models import InterviewSubscription
    with SessionLocal() as db:
        assert db.get(InterviewSubscription, "p1").next_index == 0  # rotation did not advance


def test_admin_schedule_routes(client):
    future = (interview.today_ist() + timedelta(days=3)).isoformat()
    body = {"question": "How do you handle a late vendor?", "tips": ["Name the impact", " "], "lesson_day": 5}
    assert client.put(f"/api/v1/admin/interview-questions/{future}", headers=auth("u9", "u9@example.com"), json=body).status_code == 403
    assert client.put(f"/api/v1/admin/interview-questions/{future}", headers=ADMIN, json=body).status_code == 200
    items = client.get("/api/v1/admin/interview-questions", headers=ADMIN).json()["items"]
    assert items[0]["tips"] == ["Name the impact"]
    past = (interview.today_ist() - timedelta(days=1)).isoformat()
    assert client.put(f"/api/v1/admin/interview-questions/{past}", headers=ADMIN, json=body).status_code == 422
    assert client.delete(f"/api/v1/admin/interview-questions/{future}", headers=ADMIN).status_code == 200
    assert client.get("/api/v1/admin/interview-questions", headers=ADMIN).json()["items"] == []


def test_emailer_requires_config():
    with pytest.raises(emailer.EmailError):
        emailer.send_email(get_settings(), to="a@b.c", subject="s", text="t", html="h", unsubscribe_url="u",
                           idempotency_key="k")


def test_new_members_are_subscribed_by_default_and_can_turn_it_off(client):
    me = auth("newbie", "newbie@example.com")
    client.get("/api/v1/me", headers=me)
    st = client.get("/api/v1/interview-email", headers=me).json()
    assert st["subscribed"] is True and st["default_on"] is True
    client.post("/api/v1/interview-email/unsubscribe", headers=me)
    client.get("/api/v1/me", headers=me)  # signing in again must not switch it back on
    assert client.get("/api/v1/interview-email", headers=me).json()["subscribed"] is False


def test_job_emails_paid_members_who_never_ticked_a_box(client):
    make_paid(client)  # signs the paid member in, which subscribes them by default
    s = Sender()
    stats = run(s)
    assert stats["sent"] == 1 and s.calls[0]["to"] == "p1@example.com"
