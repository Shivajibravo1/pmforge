"""browser push subscriptions and deliveries

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-23 09:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    have = sa.inspect(op.get_bind()).get_table_names()
    if "push_subscriptions" not in have:
        op.create_table('push_subscriptions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('endpoint', sa.String(length=600), nullable=False),
        sa.Column('p256dh', sa.String(length=200), nullable=False),
        sa.Column('auth', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('endpoint')
        )
        op.create_index('ix_push_subscriptions_user_id', 'push_subscriptions', ['user_id'], unique=False)
    if "push_deliveries" not in have:
        op.create_table('push_deliveries',
        sa.Column('campaign_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['email_campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('campaign_id', 'user_id')
        )


def downgrade() -> None:
    op.drop_table('push_deliveries')
    op.drop_index('ix_push_subscriptions_user_id', table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
