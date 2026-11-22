"""users.last_seen_on

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-23 10:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    cols = [c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")]
    if "last_seen_on" not in cols:
        op.add_column('users', sa.Column('last_seen_on', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_seen_on')
