"""admin uploaded resources (images and PDFs) and the email attachment column

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-18 18:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    if "resources" not in insp.get_table_names():
        op.create_table('resources',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('kind', sa.String(length=8), nullable=False),
        sa.Column('title', sa.String(length=120), nullable=False),
        sa.Column('content_type', sa.String(length=32), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('data', sa.LargeBinary(), nullable=False),
        sa.Column('in_email', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
        )
    cols = [c["name"] for c in insp.get_columns("interview_questions")]
    if "resource_id" not in cols:
        op.add_column('interview_questions', sa.Column('resource_id', sa.String(length=36), nullable=True))


def downgrade() -> None:
    op.drop_column('interview_questions', 'resource_id')
    op.drop_table('resources')
