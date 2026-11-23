"""subscribe existing members to the daily interview email by default

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-23 15:30:00.000000

Members who already have a row (opted in, or opted out) are left exactly as they are, so nobody who unsubscribed is
subscribed again. Every email carries a one-click unsubscribe link.
"""
import secrets
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None

DEFAULT_ON_VERSION = "default-2026-11"


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "interview_subscriptions" not in insp.get_table_names():
        return
    users = bind.execute(sa.text(
        "SELECT id FROM users WHERE email <> '' "
        "AND id NOT IN (SELECT user_id FROM interview_subscriptions)")).fetchall()
    now = datetime.now(UTC)
    for (uid,) in users:
        bind.execute(
            sa.text("INSERT INTO interview_subscriptions (user_id, opted_in_at, consent_version, unsubscribe_token, "
                    "next_index, failures) VALUES (:u, :t, :v, :k, 0, 0)"),
            {"u": uid, "t": now, "v": DEFAULT_ON_VERSION, "k": secrets.token_urlsafe(32)})


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM interview_subscriptions WHERE consent_version = :v AND last_sent_on IS NULL"),
        {"v": DEFAULT_ON_VERSION})
