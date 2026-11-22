"""marketing consent and campaign deliveries

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-22 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    have = sa.inspect(op.get_bind()).get_table_names()
    if "marketing_consents" not in have:
        op.create_table('marketing_consents',
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('opted_in_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consent_version', sa.String(length=16), nullable=False),
        sa.Column('opted_out_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('unsubscribe_token', sa.String(length=48), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('user_id')
        )
        op.create_index('ix_marketing_consents_unsubscribe_token', 'marketing_consents',
                        ['unsubscribe_token'], unique=True)
    if "campaign_deliveries" not in have:
        op.create_table('campaign_deliveries',
        sa.Column('campaign_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('source', sa.String(length=10), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['email_campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('campaign_id', 'user_id')
        )
        op.create_index('ix_campaign_deliveries_sent_at', 'campaign_deliveries', ['sent_at'])


def downgrade() -> None:
    op.drop_table('campaign_deliveries')
    op.drop_table('marketing_consents')
