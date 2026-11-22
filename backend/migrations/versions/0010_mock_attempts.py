"""interview mock practice attempts

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-23 11:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "mock_attempts" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table('mock_attempts',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('question_id', sa.String(length=40), nullable=False),
    sa.Column('answer', sa.Text(), nullable=False),
    sa.Column('seconds_used', sa.Integer(), nullable=False),
    sa.Column('self_score', sa.Integer(), nullable=False),
    sa.Column('ai_score', sa.Integer(), nullable=True),
    sa.Column('ai_feedback', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mock_attempts_user_id', 'mock_attempts', ['user_id'], unique=False)
    op.create_index('ix_mock_attempts_question_id', 'mock_attempts', ['question_id'], unique=False)
    op.create_index('ix_mock_attempts_created_at', 'mock_attempts', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('mock_attempts')
