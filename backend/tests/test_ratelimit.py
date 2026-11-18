"""OWASP API4: a client that hammers the API is slowed down; health checks and other clients are not."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.ratelimit import RateLimit


def make(per_minute=5, public=2):
    app = FastAPI()
    app.add_middleware(RateLimit, per_minute=per_minute, public_per_minute=public)

    @app.get("/api/v1/x")
    def x():
        return {"ok": True}

    @app.get("/public/y")
    def y():
        return {"ok": True}

    @app.get("/health")
    def health():
        return {"ok": True}

    return TestClient(app)


def test_api_is_limited_per_client():
    c = make()
    codes = [c.get("/api/v1/x").status_code for _ in range(7)]
    assert codes == [200] * 5 + [429, 429]
    assert c.get("/api/v1/x").headers["retry-after"] == "60"


def test_public_routes_have_a_lower_ceiling():
    c = make()
    assert [c.get("/public/y").status_code for _ in range(3)] == [200, 200, 429]
    assert c.get("/api/v1/x").status_code == 200  # separate budget


def test_clients_are_counted_separately_by_cloudflare_address():
    c = make(per_minute=1)
    assert c.get("/api/v1/x", headers={"Cf-Connecting-Ip": "1.1.1.1"}).status_code == 200
    assert c.get("/api/v1/x", headers={"Cf-Connecting-Ip": "1.1.1.1"}).status_code == 429
    assert c.get("/api/v1/x", headers={"Cf-Connecting-Ip": "2.2.2.2"}).status_code == 200


def test_health_is_never_limited():
    c = make(per_minute=1)
    assert all(c.get("/health").status_code == 200 for _ in range(10))


def test_zero_turns_the_limit_off():
    c = make(per_minute=0)
    assert all(c.get("/api/v1/x").status_code == 200 for _ in range(20))
