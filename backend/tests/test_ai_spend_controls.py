"""AI spend controls: the slot and worst-case cost are reserved before the model runs (security review F3)."""
import pytest
from sqlalchemy import func, select

from app import ai
from app.config import get_settings
from app.db import SessionLocal
from app.models import UsageLog
from tests.conftest import auth
from tests.test_api import _artifact


def _rows():
    with SessionLocal() as db:
        return list(db.scalars(select(UsageLog)))


def _review(client, h, aid):
    return client.post(f"/api/v1/artifacts/{aid}/review", headers=h)


def test_parallel_request_cannot_slip_past_the_daily_cap(client, fake_ai, monkeypatch):
    """A second request that arrives while the first is still inside the model call must be refused at cap 1."""
    monkeypatch.setattr(get_settings(), "max_reviews_per_day", 1)
    h = auth()
    aid = _artifact(client, h)
    nested = {}
    real = fake_ai.complete

    def complete_with_race(**kw):
        nested["r"] = _review(client, h, aid)  # arrives while the reservation is held
        return real(**kw)

    fake_ai.complete = complete_with_race
    assert _review(client, h, aid).status_code == 200
    assert nested["r"].status_code == 429 and nested["r"].json()["detail"] == "daily_limit_reached"
    assert len(_rows()) == 1  # the refused request removed its own reservation


def test_output_refused_after_completion_still_counts_and_is_billed(client, fake_ai):
    h = auth()
    aid = _artifact(client, h)
    fake_ai.text = "not json at all"
    assert _review(client, h, aid).status_code == 502
    rows = _rows()
    assert len(rows) == 1 and rows[0].cost_usd == pytest.approx(
        ai.cost_usd(get_settings(), "review", ai.Completion("", 1000, 300)))


def test_repeated_failures_exhaust_the_daily_cap(client, fake_ai):
    h = auth()
    aid = _artifact(client, h)
    fake_ai.text = "not json at all"
    for _ in range(get_settings().max_reviews_per_day):
        assert _review(client, h, aid).status_code == 502
    r = _review(client, h, aid)
    assert r.status_code == 429 and r.json()["detail"] == "daily_limit_reached"


def test_upstream_failure_before_completion_releases_the_slot(client, fake_ai):
    h = auth()
    aid = _artifact(client, h)

    def boom(**kw):
        raise ai.AIError("timeout")

    fake_ai.complete = boom
    assert _review(client, h, aid).status_code == 502
    assert _rows() == []


def test_moderation_block_counts_toward_cap_with_zero_cost(client, fake_ai):
    h = auth()
    aid = _artifact(client, h)
    fake_ai.flag = True
    assert _review(client, h, aid).status_code == 422
    rows = _rows()
    assert len(rows) == 1 and rows[0].cost_usd == 0


def test_chat_failure_after_completion_is_billed(client, fake_ai):
    h = auth()
    fake_ai.text = ""
    r = client.post("/api/v1/mentor/chat", json={"day": 1, "message": "hi"}, headers=h)
    assert r.status_code == 502
    rows = _rows()
    assert len(rows) == 1 and rows[0].cost_usd > 0


def test_global_daily_ceiling_blocks_every_user(client, fake_ai, monkeypatch):
    monkeypatch.setattr(get_settings(), "global_daily_ai_budget_usd", 0.0001)
    r = client.post("/api/v1/mentor/chat", json={"day": 1, "message": "hi"}, headers=auth("u7", "u7@example.com"))
    assert r.status_code == 429 and r.json()["detail"] == "ai_capacity_reached"
    assert fake_ai.calls == [] and _rows() == []


def test_global_monthly_ceiling_blocks_every_user(client, fake_ai, monkeypatch):
    monkeypatch.setattr(get_settings(), "global_monthly_ai_budget_usd", 0.0001)
    r = client.post("/api/v1/mentor/chat", json={"day": 1, "message": "hi"}, headers=auth("u8", "u8@example.com"))
    assert r.status_code == 429 and r.json()["detail"] == "ai_capacity_reached"


def test_success_settles_to_actual_cost_not_the_estimate(client, fake_ai):
    h = auth()
    assert client.post("/api/v1/mentor/chat", json={"day": 1, "message": "hi"}, headers=h).status_code == 200
    with SessionLocal() as db:
        total = db.scalar(select(func.sum(UsageLog.cost_usd)))
    assert total == pytest.approx(ai.cost_usd(get_settings(), "chat", ai.Completion("", 1000, 300)))
