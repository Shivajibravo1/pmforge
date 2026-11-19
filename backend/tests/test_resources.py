from datetime import timedelta

from app import interview
from app.db import SessionLocal
from app.jobs.interview_email import run_once
from tests.conftest import auth
from tests.test_interview_email import NOON, Sender, make_paid, opt_in

ADMIN = auth("adm", "admin@example.com")
USER = auth("u1", "u1@example.com")
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 200
PDF = b"%PDF-1.4\n" + b"0" * 200
RAW = {"Content-Type": "application/octet-stream"}
URL = "/api/v1/admin/resources"


def up(client, data, title="Cheat sheet", headers=ADMIN, **q):
    params = "&".join([f"title={title}"] + [f"{k}={v}" for k, v in q.items()])
    return client.post(f"{URL}?{params}", content=data, headers={**headers, **RAW})


def test_only_admin_can_upload(client):
    assert up(client, PNG, headers=USER).status_code == 403
    assert client.post(f"{URL}?title=Cheat", content=PNG, headers=RAW).status_code == 401


def test_type_comes_from_file_content_not_name(client):
    assert up(client, b"<svg onload=alert(1)>").status_code == 422
    assert up(client, b"MZ\x90\x00 not an image").status_code == 422
    assert up(client, b"").status_code == 422
    r = up(client, PNG)
    assert r.status_code == 200 and r.json()["kind"] == "image"
    assert up(client, PDF).json()["kind"] == "pdf"


def test_size_limit_is_enforced(client):
    big = PDF + b"0" * (5 * 1024 * 1024)
    assert up(client, big).status_code == 413
    assert client.post("/api/v1/lessons/5/artifact", content=b"x" * 70000,
                       headers={"Content-Type": "application/json"}).status_code == 413  # other routes stay small


def test_members_cannot_see_or_download_uploads(client):
    """Composer uploads (drafts, PDF attachments) are not a member library."""
    rid = up(client, PDF, title="Interview guide").json()["id"]
    assert client.get("/api/v1/resources", headers=USER).status_code == 404
    assert client.get(f"/api/v1/resources/{rid}/file", headers=USER).status_code == 404
    assert client.get(URL, headers=USER).status_code == 403
    items = client.get(URL, headers=ADMIN).json()["items"]
    assert items[0]["title"] == "Interview guide" and "data" not in items[0]


def test_public_link_only_for_email_images(client):
    private = up(client, PNG, title="Private image").json()["id"]
    emailed = up(client, PNG, title="Email image", in_email="true").json()["id"]
    pdf = up(client, PDF, title="A pdf").json()["id"]
    assert client.get(f"/public/files/{private}").status_code == 404
    assert client.get(f"/public/files/{pdf}").status_code == 404
    r = client.get(f"/public/files/{emailed}")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert up(client, PDF, title="Nope", in_email="true").status_code == 422


def test_cannot_delete_a_resource_used_by_an_email(client):
    rid = up(client, PNG, title="Email image", in_email="true").json()["id"]
    day = (interview.today_ist() + timedelta(days=2)).isoformat()
    body = {"question": "How do you handle scope creep?", "tips": [], "resource_id": rid}
    assert client.put(f"/api/v1/admin/interview-questions/{day}", headers=ADMIN, json=body).status_code == 200
    assert client.delete(f"{URL}/{rid}", headers=ADMIN).status_code == 409
    client.delete(f"/api/v1/admin/interview-questions/{day}", headers=ADMIN)
    assert client.delete(f"{URL}/{rid}", headers=ADMIN).status_code == 200


def test_schedule_rejects_private_image_and_unknown_resource(client):
    private = up(client, PNG, title="Private image").json()["id"]
    day = (interview.today_ist() + timedelta(days=2)).isoformat()
    base = {"question": "How do you handle scope creep?", "tips": []}
    put = lambda rid: client.put(f"/api/v1/admin/interview-questions/{day}", headers=ADMIN,  # noqa: E731
                                 json={**base, "resource_id": rid}).status_code
    assert put(private) == 422 and put("00000000-0000-0000-0000-000000000000") == 422


def test_email_has_image_in_body_between_question_and_tips(client, monkeypatch):
    make_paid(client)
    opt_in(client)
    rid = up(client, PNG, title="Risk matrix", in_email="true").json()["id"]
    from datetime import date

    from app.models import InterviewQuestion
    with SessionLocal() as db:
        db.add(InterviewQuestion(send_on=date(2026, 11, 20),
                                 question="Walk me through a risk matrix?", tips=["Name owners"], resource_id=rid))
        db.commit()
    s = Sender()
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "public_base_url", "https://pmforge.pm")
    with SessionLocal() as db:
        run_once(db, get_settings(), s, NOON)
    html = s.calls[0]["html"]
    assert f"https://pmforge.pm/public/files/{rid}" in html
    assert html.index("risk matrix") < html.index("<img") < html.index("Name owners")
    assert 'alt="Risk matrix"' in html


def test_pdf_is_a_download_link_in_email():
    q = {"day": None, "question": "Q?", "tips": [], "pdf_title": "Guide <b>", "resources_url": "https://x/app/resources"}
    _, text, html = interview.compose(q, lesson_url="https://x/app", unsubscribe_url="https://x/u")
    assert "https://x/app/resources" in text and "Guide &lt;b&gt;" in html and "<b>" not in html
