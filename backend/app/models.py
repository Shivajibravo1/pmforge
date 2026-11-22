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
    # Last India date of a purchased plan. None with tier "paid" means no end date (set by the admin by hand).
    paid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
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


class MarketingConsent(Base):
    """Opt-in to occasional emails about learning tips, new features and offers (any plan). Opting out keeps the
    row as the consent record. Separate from the daily interview email: agreeing to one never covers the other."""
    __tablename__ = "marketing_consents"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    opted_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    consent_version: Mapped[str] = mapped_column(String(16))
    opted_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unsubscribe_token: Mapped[str] = mapped_column(
        String(48), unique=True, index=True, default=lambda: secrets.token_urlsafe(32))


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


class EmailCampaign(Base):
    """An email the admin composes: subject, text and image blocks, optional PDF attachment, optional send date.
    It replaces the daily question on its send date, so a subscriber still gets one email that day."""
    __tablename__ = "email_campaigns"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject: Mapped[str] = mapped_column(String(150))
    # Each block is {"type": "text", "text": ...} or {"type": "image", "resource_id": ...}.
    blocks: Mapped[list] = mapped_column(JSON, default=list)
    attachment_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # a PDF resource
    send_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    send_hour: Mapped[int] = mapped_column(Integer, default=7)  # India time
    status: Mapped[str] = mapped_column(String(10), default="draft")  # draft, scheduled, sent, partial
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class CampaignDelivery(Base):
    """One row per person an email was sent to, so a campaign never reaches the same person twice."""
    __tablename__ = "campaign_deliveries"
    campaign_id: Mapped[str] = mapped_column(ForeignKey("email_campaigns.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    source: Mapped[str] = mapped_column(String(10))  # "job" (scheduled daily send) or "broadcast" (send buttons)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class PushSubscription(Base):
    """One browser or installed app a member allowed notifications on. The endpoint is the push service address."""
    __tablename__ = "push_subscriptions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    endpoint: Mapped[str] = mapped_column(String(600), unique=True)
    p256dh: Mapped[str] = mapped_column(String(200))
    auth: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PushDelivery(Base):
    """A campaign was pushed to this member, so a second press never repeats it."""
    __tablename__ = "push_deliveries"
    campaign_id: Mapped[str] = mapped_column(ForeignKey("email_campaigns.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Payment(Base):
    """One SuperProfile purchase, as relayed by the n8n bridge. transaction_id makes every relay idempotent.
    status: applied (access granted), pending (no account with that email yet), review (amount below the plan
    price, so a person must check it), ignored (a SuperProfile product that is not a PMForge plan)."""
    __tablename__ = "payments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    transaction_id: Mapped[str] = mapped_column(String(64), unique=True)
    buyer_email: Mapped[str] = mapped_column(String(320), index=True)
    product_title: Mapped[str] = mapped_column(String(200))
    plan: Mapped[str | None] = mapped_column(String(10), nullable=True)  # monthly, yearly
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(10))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
