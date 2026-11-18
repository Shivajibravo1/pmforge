"""daily interview question email subscriptions

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-18 17:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = sa.inspect(op.get_bind()).get_table_names()
    if "interview_questions" not in existing:
        op.create_table('interview_questions',
        sa.Column('send_on', sa.Date(), nullable=False),
        sa.Column('question', sa.String(length=600), nullable=False),
        sa.Column('tips', sa.JSON(), nullable=False),
        sa.Column('lesson_day', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('send_on')
        )
    if "interview_subscriptions" in existing:
        return
    op.create_table('interview_subscriptions',
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('opted_in_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('consent_version', sa.String(length=16), nullable=False),
    sa.Column('opted_out_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('unsubscribe_token', sa.String(length=48), nullable=False),
    sa.Column('next_index', sa.Integer(), nullable=False),
    sa.Column('last_sent_on', sa.Date(), nullable=True),
    sa.Column('failures', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_interview_subscriptions_unsubscribe_token'), 'interview_subscriptions',
                    ['unsubscribe_token'], unique=True)


def downgrade() -> None:
    op.drop_table('interview_questions')
    op.drop_index(op.f('ix_interview_subscriptions_unsubscribe_token'), table_name='interview_subscriptions')
    op.drop_table('interview_subscriptions')
