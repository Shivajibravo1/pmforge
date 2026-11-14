import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.routes import admin, learning, mentor, portfolio

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


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
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=False,
                       allow_methods=["GET", "POST", "PUT"], allow_headers=["Authorization", "Content-Type"])
    if settings.env != "production":
        Base.metadata.create_all(engine)  # production uses Alembic migrations

    @app.get("/health")
    def health():
        return {"status": "ok"}

    for r in (learning.router, mentor.router, portfolio.router, portfolio.public, admin.router):
        app.include_router(r)
    return app


app = create_app()
