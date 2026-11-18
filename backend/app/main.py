import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.routes import admin, interview, learning, mentor, portfolio

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


class MaxBodySize:
    """Reject oversized request bodies with 413 before anything parses them.

    FastAPI reads and parses the body before it resolves the auth dependency, so without this an
    unauthenticated client could make the server buffer an arbitrarily large body. Checks the declared
    Content-Length first, then counts bytes for chunked bodies that declare none.
    """

    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        declared = next((v for k, v in scope["headers"] if k == b"content-length"), None)
        if declared is not None:
            try:
                too_big = int(declared) > self.max_bytes
            except ValueError:
                too_big = True
            if too_big:
                return await self._reject(send)

        seen = 0
        exceeded = False

        async def counting_receive():
            # FastAPI turns any exception raised while it reads the body into a 400, so an exception cannot signal
            # the overflow. Stop feeding data instead, remember it, and replace whatever response follows with 413.
            nonlocal seen, exceeded
            if exceeded:
                return {"type": "http.request", "body": b"", "more_body": False}
            msg = await receive()
            if msg["type"] == "http.request":
                seen += len(msg.get("body", b""))
                if seen > self.max_bytes:
                    exceeded = True
                    return {"type": "http.request", "body": b"", "more_body": False}
            return msg

        async def guarded_send(msg):
            if exceeded:
                if msg["type"] == "http.response.start":
                    await self._reject(send)
                return  # drop the application's own response
            await send(msg)

        await self.app(scope, counting_receive, guarded_send)

    @staticmethod
    async def _reject(send):
        body = b'{"detail":"request_too_large"}'
        await send({"type": "http.response.start", "status": 413,
                    "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        resp = await call_next(request)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return resp


def create_app() -> FastAPI:
    settings = get_settings()
    docs = None if settings.env == "production" else "/docs"
    app = FastAPI(title="PMForge API", version="0.1.0", docs_url=docs, redoc_url=None, openapi_url=
                  None if settings.env == "production" else "/openapi.json")
    app.add_middleware(SecurityHeaders)
    app.add_middleware(MaxBodySize, max_bytes=settings.max_body_bytes)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=False,
                       allow_methods=["GET", "POST", "PUT"], allow_headers=["Authorization", "Content-Type"])
    if settings.env != "production":
        Base.metadata.create_all(engine)  # production uses Alembic migrations

    @app.get("/health")
    def health():
        return {"status": "ok"}

    for r in (learning.router, mentor.router, portfolio.router, portfolio.public, admin.router, interview.router,
              interview.public):
        app.include_router(r)
    return app


app = create_app()
