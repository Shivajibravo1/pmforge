from datetime import timedelta

from app import interview
from app.config import get_settings
from app.db import SessionLocal
from app.jobs.interview_email import run_once
from tests.test_interview_email import NOON, Sender, make_paid, opt_in
from tests.test_resources import ADMIN, PDF, PNG, USER, up

URL = "/api/v1/admin/emails"
SEND_DAY = "2026-11-20"  # the date NOON falls on in India


def image(client, in_email="true"):
    return up(client, PNG, title="Diagram", in_email=in_email).json()["id"]


def mk(client, **over):
    body = {"subject": "Your weekly PM brief", "send_on": SEND_DAY, "send_hour": 7,
            "blocks": [{"type": "text", "text": "Hello team.\n\n- point one\n- point two"}], **over}
    return client.post(URL, headers=ADMIN, json=body)


def future(days=2):
    return (interview.today_ist() + timedelta(days=days)).isoformat()


def test_only_admin(client):
    assert client.get(URL, headers=USER).status_code == 403
    assert client.get(URL).status_code == 401


def test_draft_save_edit_delete(client):
    c = mk(client).json()
    assert c["status"] == "draft"
    body = {"subject": "New subject", "blocks": [{"type": "text", "text": "Changed"}], "send_on": None, "send_hour": 9}
    assert client.put(f"{URL}/{c['id']}", headers=ADMIN, json=body).json()["subject"] == "New subject"
    assert len(client.get(URL, headers=ADMIN).json()["items"]) == 1
    assert client.delete(f"{URL}/{c['id']}", headers=ADMIN).status_code == 200


def test_image_must_be_email_ready_and_pdf_must_be_pdf(client):
    private = image(client, in_email="false")
    assert mk(client, blocks=[{"type": "image", "resource_id": private}]).status_code == 422
    assert mk(client, blocks=[{"type": "image", "resource_id": "nope"}]).status_code == 422
    png = image(client)
    assert mk(client, attachment_id=png).status_code == 422
    pdf = up(client, PDF, title="Guide").json()["id"]
    assert mk(client, attachment_id=pdf, blocks=[{"type": "image", "resource_id": png}]).status_code == 200


def test_schedule_rules(client):
    c = mk(client, send_on=None).json()
    assert client.post(f"{URL}/{c['id']}/schedule", headers=ADMIN).json()["detail"] == "send_date_required"
    past = mk(client, send_on=(interview.today_ist() - timedelta(days=1)).isoformat()).json()
    assert client.post(f"{URL}/{past['id']}/schedule", headers=ADMIN).status_code == 422
    empty = mk(client, blocks=[], send_on=future()).json()
    assert client.post(f"{URL}/{empty['id']}/schedule", headers=ADMIN).json()["detail"] == "body_required"
    a = mk(client, send_on=future(3)).json()
    b = mk(client, send_on=future(3)).json()
    assert client.post(f"{URL}/{a['id']}/schedule", headers=ADMIN).json()["status"] == "scheduled"
    assert client.post(f"{URL}/{b['id']}/schedule", headers=ADMIN).status_code == 409  # one email per date
    assert client.delete(f"{URL}/{a['id']}", headers=ADMIN).status_code == 409
    assert client.post(f"{URL}/{a['id']}/unschedule", headers=ADMIN).json()["status"] == "draft"


def test_scheduled_email_replaces_the_daily_question_with_image_and_pdf(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "public_base_url", "https://pmforge.pm")
    make_paid(client)
    opt_in(client)
    png = image(client)
    pdf = up(client, PDF, title="Interview guide").json()["id"]
    c = mk(client, attachment_id=pdf, subject="Special <brief>",
           blocks=[{"type": "text", "text": "First paragraph"}, {"type": "image", "resource_id": png},
                   {"type": "text", "text": "Second <b>paragraph</b>"}]).json()
    with SessionLocal() as db:  # the API refuses a date in the past, so move it to the job's test day
        from datetime import date

        from app.models import EmailCampaign
        row = db.get(EmailCampaign, c["id"])
        row.status, row.send_on = "scheduled", date.fromisoformat(SEND_DAY)
        db.commit()
    s = Sender()
    with SessionLocal() as db:
        assert run_once(db, get_settings(), s, NOON)["sent"] == 1
    mail = s.calls[0]
    assert mail["subject"] == "Special <brief>"  # subject is plain text, never HTML
    h = mail["html"]
    assert h.index("First paragraph") < h.index("<img") < h.index("Second")
    assert "&lt;b&gt;paragraph" in h and "<b>" not in h
    assert f"https://pmforge.pm/public/files/{png}" in h
    assert mail["attachments"][0]["filename"] == "interview-guide.pdf"
    assert mail["attachments"][0]["content"] == PDF
    assert "/unsubscribe/" in mail["text"]
    from app.models import EmailCampaign, InterviewSubscription
    with SessionLocal() as db:
        assert db.get(EmailCampaign, c["id"]).status == "sent"
        assert db.get(InterviewSubscription, "p1").next_index == 0  # rotation untouched
        assert run_once(db, get_settings(), s, NOON)["sent"] == 0  # still one email that day


def test_campaign_waits_for_its_hour_and_old_ones_close(client):
    make_paid(client)
    opt_in(client)
    c = mk(client, send_hour=15).json()
    from datetime import date

    from app.models import EmailCampaign
    with SessionLocal() as db:
        row = db.get(EmailCampaign, c["id"])
        row.status, row.send_on = "scheduled", date.fromisoformat(SEND_DAY)
        db.commit()
    s = Sender()
    with SessionLocal() as db:
        assert run_once(db, get_settings(), s, NOON)["sent"] == 0  # noon is before 15:00
        assert run_once(db, get_settings(), s, NOON + timedelta(days=1))["sent"] == 1  # next day: closed, rotation
        assert db.get(EmailCampaign, c["id"]).status == "partial"
    assert "Special" not in s.calls[0]["subject"] and s.calls[0]["subject"] == "Your PMForge interview question for today"


def test_test_send_goes_only_to_the_admin(client, monkeypatch):
    sent = []
    from app import emailer
    monkeypatch.setattr(emailer, "send_email", lambda settings, **kw: sent.append(kw))
    c = mk(client).json()
    r = client.post(f"{URL}/{c['id']}/test", headers=ADMIN)
    assert r.status_code == 200 and r.json()["sent_to"] == "admin@example.com"
    assert sent[0]["to"] == "admin@example.com" and sent[0]["subject"].startswith("[Test] ")


def test_unconfigured_email_is_a_clear_error(client):
    c = mk(client).json()
    assert client.post(f"{URL}/{c['id']}/test", headers=ADMIN).status_code == 502


def test_delete_blocked_while_a_draft_uses_the_file(client):
    png = image(client)
    c = mk(client, blocks=[{"type": "image", "resource_id": png}]).json()
    assert client.delete(f"/api/v1/admin/resources/{png}", headers=ADMIN).json()["detail"] == "resource_in_use"
    client.delete(f"{URL}/{c['id']}", headers=ADMIN)
    assert client.delete(f"/api/v1/admin/resources/{png}", headers=ADMIN).status_code == 200
