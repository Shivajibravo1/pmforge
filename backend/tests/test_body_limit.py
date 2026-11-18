"""F2: oversized bodies are refused with 413 before auth or JSON parsing."""
from tests.conftest import auth

LIMIT = 65536
URL = "/api/v1/lessons/5/artifact"
JSON = {"Content-Type": "application/json"}


def test_declared_oversize_is_413_without_auth(client):
    r = client.post(URL, content=b"x" * (LIMIT + 1), headers=JSON)
    assert r.status_code == 413 and r.json()["detail"] == "request_too_large"


def test_chunked_oversize_is_413_without_auth(client):
    def chunks():
        for _ in range(LIMIT // 1024 + 2):
            yield b"x" * 1024  # no Content-Length is sent for a generator body

    r = client.post(URL, content=chunks(), headers=JSON)
    assert r.status_code == 413


def test_invalid_content_length_is_refused(client):
    r = client.post(URL, content=b"{}", headers={**JSON, "Content-Length": "abc"})
    assert r.status_code in (400, 413)


def test_normal_requests_are_unaffected(client):
    assert client.post(URL, json={"content": "short"}).status_code == 401  # auth still decides
    assert client.get("/health").status_code == 200


def test_largest_legitimate_artifact_still_fits(client):
    # 8000 four-byte characters is the worst case for the 8000 character artifact limit.
    r = client.post(URL, json={"content": "\U0001f600" * 8000}, headers=auth())
    assert r.status_code != 413
