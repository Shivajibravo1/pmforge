"""admin composed emails (drafts, scheduled)

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-18 19:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "email_campaigns" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table('email_campaigns',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('subject', sa.String(length=150), nullable=False),
    sa.Column('blocks', sa.JSON(), nullable=False),
    sa.Column('attachment_id', sa.String(length=36), nullable=True),
    sa.Column('send_on', sa.Date(), nullable=True),
    sa.Column('send_hour', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('email_campaigns')
