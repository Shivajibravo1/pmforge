import secrets
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), default="")
    role: Mapped[str] = mapped_column(String(16), default="learner")
    tier: Mapped[str] = mapped_column(String(16), default="free")
    portfolio_slug: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    portfolio_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("user_id", "day"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[int] = mapped_column(Integer)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    completed_on: Mapped[date] = mapped_column(Date)


class Artifact(Base):
    __tablename__ = "artifacts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    artifact_id: Mapped[str] = mapped_column(ForeignKey("artifacts.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    feedback: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class UsageLog(Base):
    """One row per AI call. Used for daily caps and the monthly budget."""
    __tablename__ = "usage_log"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # "chat" or "review"
    day: Mapped[date] = mapped_column(Date, index=True)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (UniqueConstraint("user_id", "level"),)
    code: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: secrets.token_urlsafe(12))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    level: Mapped[int] = mapped_column(Integer)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AdminAudit(Base):
    """Who changed what. One row per admin action that alters a user."""
    __tablename__ = "admin_audit"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    admin_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(32))
    detail: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class InterviewSubscription(Base):
    """Opt-in to the daily interview question email. Opting out keeps the row as the consent record."""
    __tablename__ = "interview_subscriptions"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    opted_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    consent_version: Mapped[str] = mapped_column(String(16))
    opted_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unsubscribe_token: Mapped[str] = mapped_column(
        String(48), unique=True, index=True, default=lambda: secrets.token_urlsafe(32))
    next_index: Mapped[int] = mapped_column(Integer, default=0)
    last_sent_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    failures: Mapped[int] = mapped_column(Integer, default=0)


class InterviewQuestion(Base):
    """A question the admin wrote for a specific send date. Dates without a row use the built-in question bank."""
    __tablename__ = "interview_questions"
    send_on: Mapped[date] = mapped_column(Date, primary_key=True)
    question: Mapped[str] = mapped_column(String(600))
    tips: Mapped[list] = mapped_column(JSON, default=list)
    lesson_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # image shown or PDF linked in the email


class Resource(Base):
    """An image or PDF uploaded by an admin. Bytes live in Postgres so the nightly backup covers them."""
    __tablename__ = "resources"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kind: Mapped[str] = mapped_column(String(8))  # "image" or "pdf"
    title: Mapped[str] = mapped_column(String(120))
    content_type: Mapped[str] = mapped_column(String(32))
    size: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)
    in_email: Mapped[bool] = mapped_column(Boolean, default=False)  # images only: served at a public link for emails
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
