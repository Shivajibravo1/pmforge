"""subscribe existing members to tips and offers email by default

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-23 16:00:00.000000

Members who already have a row (opted in, or opted out) are left as they are. Every email carries an unsubscribe link.
"""
import secrets
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None

DEFAULT_ON_VERSION = "default-2026-11"


def upgrade() -> None:
    bind = op.get_bind()
    if "marketing_consents" not in sa.inspect(bind).get_table_names():
        return
    users = bind.execute(sa.text(
        "SELECT id FROM users WHERE email <> '' "
        "AND id NOT IN (SELECT user_id FROM marketing_consents)")).fetchall()
    now = datetime.now(UTC)
    for (uid,) in users:
        bind.execute(
            sa.text("INSERT INTO marketing_consents (user_id, opted_in_at, consent_version, unsubscribe_token) "
                    "VALUES (:u, :t, :v, :k)"),
            {"u": uid, "t": now, "v": DEFAULT_ON_VERSION, "k": secrets.token_urlsafe(32)})


def downgrade() -> None:
    op.get_bind().execute(sa.text("DELETE FROM marketing_consents WHERE consent_version = :v"),
                          {"v": DEFAULT_ON_VERSION})
