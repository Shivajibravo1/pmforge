"""Interview mock practice: question bank shape, access, self score, optional AI feedback and its limits."""
import re

import pytest

from app import content
from app.config import get_settings
from app.db import SessionLocal
from app.models import MockAttempt, UsageLog
from tests.conftest import auth
from tests.test_interview_email import PAID, make_paid  # noqa: F401

H = auth("f1", "f1@example.com")
ANSWER = "In a past project I protected the sprint goal, met the product owner and offered the sponsor three options."
BASE = "/api/v1/practice"


def test_bank_is_complete_plain_and_balanced():
    bank = content.interview_bank()
    roles = {r["id"] for r in bank["roles"]}
    assert roles == {"agile-pm", "functional-pm", "ai-pm"}
    ids = [q["id"] for q in bank["questions"]]
    assert len(ids) == len(set(ids)) >= 24
    for r in roles:
        mine = [q for q in bank["questions"] if q["role"] == r]
        assert len(mine) >= 8 and sum(q["free"] for q in mine) == 1  # one free question per role
    for q in bank["questions"]:
        assert re.fullmatch(r"[a-z]+(-[a-z]+)*-\d\d", q["id"])
        assert 60 <= q["time_seconds"] <= 300 and 3 <= len(q["rubric"]) <= 6
        assert len(q["model_answer"].split()) >= 40
        text = repr(q)
        assert "—" not in text and "–" not in text
        assert not re.search(r"\d+\s?%", text)  # no invented statistics


def test_free_member_sees_all_questions_but_opens_only_free(client):
    client.get("/api/v1/me", headers=H)
    items = client.get(f"{BASE}/questions?role=agile-pm", headers=H).json()["items"]
    assert len(items) >= 8 and sum(not i["locked"] for i in items) == 1
    open_one = next(i for i in items if not i["locked"])
    shut_one = next(i for i in items if i["locked"])
    q = client.get(f"{BASE}/questions/{open_one['id']}", headers=H).json()
    assert "model_answer" not in q and len(q["rubric"]) >= 3
    assert client.get(f"{BASE}/questions/{shut_one['id']}", headers=H).status_code == 402
    assert client.get(f"{BASE}/questions?role=nope", headers=H).status_code == 404
    assert client.get(f"{BASE}/roles").status_code == 401


def test_attempt_scores_from_ticks_and_reveals_model_answer_afterwards(client):
    client.get("/api/v1/me", headers=H)
    qid = "agile-pm-01"
    n = len(content.interview_bank()["questions"][0]["rubric"])
    r = client.post(f"{BASE}/questions/{qid}/attempt", headers=H,
                    json={"answer": ANSWER, "seconds_used": 95, "ticks": [True] * (n - 1) + [False]})
    assert r.status_code == 201
    body = r.json()
    assert body["self_score"] == round(100 * (n - 1) / n) and len(body["model_answer"]) > 100
    assert client.post(f"{BASE}/questions/{qid}/attempt", headers=H,
                       json={"answer": ANSWER, "seconds_used": 5, "ticks": [True]}).status_code == 422
    hist = client.get(f"{BASE}/history", headers=H).json()["items"]
    assert hist[0]["self_score"] == body["self_score"] and hist[0]["ai_score"] is None
    best = client.get(f"{BASE}/questions?role=agile-pm", headers=H).json()["items"][0]["best_score"]
    assert best == body["self_score"]


def _attempt(client, h=H, qid="agile-pm-01"):
    n = len(content.interview_bank()["questions"][0]["rubric"])
    return client.post(f"{BASE}/questions/{qid}/attempt", headers=h,
                       json={"answer": ANSWER, "seconds_used": 60, "ticks": [True] * n}).json()["attempt_id"]


def test_ai_feedback_is_optional_reused_and_counts_against_the_review_allowance(client, fake_ai):
    client.get("/api/v1/me", headers=H)
    a = _attempt(client)
    first = client.post(f"{BASE}/attempts/{a}/feedback", headers=H)
    assert first.status_code == 200 and "gaps" in first.json()
    again = client.post(f"{BASE}/attempts/{a}/feedback", headers=H).json()
    assert again["reused"] is True and again["score"] == first.json()["score"]
    with SessionLocal() as db:
        assert db.query(UsageLog).filter(UsageLog.kind == "review").count() == 1  # the repeat cost nothing
        assert db.get(MockAttempt, a).ai_score == first.json()["score"]
    cap = get_settings().max_free_reviews_per_day
    for _ in range(cap - 1):
        assert client.post(f"{BASE}/attempts/{_attempt(client)}/feedback", headers=H).status_code == 200
    assert client.post(f"{BASE}/attempts/{_attempt(client)}/feedback", headers=H).status_code == 429


def test_feedback_only_for_own_attempts(client):
    client.get("/api/v1/me", headers=H)
    make_paid(client)
    a = _attempt(client)
    assert client.post(f"{BASE}/attempts/{a}/feedback", headers=PAID).status_code == 404


def test_paid_member_opens_everything(client):
    make_paid(client)
    items = client.get(f"{BASE}/questions?role=ai-pm", headers=PAID).json()["items"]
    assert all(not i["locked"] for i in items)
    assert client.get(f"{BASE}/questions/ai-pm-05", headers=PAID).status_code == 200


@pytest.mark.parametrize("n", [1])
def test_daily_answer_storage_cap(client, n, monkeypatch):
    from app.routes import practice
    monkeypatch.setattr(practice, "MAX_ATTEMPTS_PER_DAY", 2)
    client.get("/api/v1/me", headers=H)
    _attempt(client)
    _attempt(client)
    nq = len(content.interview_bank()["questions"][0]["rubric"])
    r = client.post(f"{BASE}/questions/agile-pm-01/attempt", headers=H,
                    json={"answer": ANSWER, "seconds_used": 1, "ticks": [True] * nq})
    assert r.status_code == 429
