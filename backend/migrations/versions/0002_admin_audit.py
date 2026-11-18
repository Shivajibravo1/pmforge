"""admin audit log

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-18 08:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Databases built by the old create_all may already have this table.
    if "admin_audit" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table('admin_audit',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('admin_id', sa.String(length=64), nullable=False),
    sa.Column('target_user_id', sa.String(length=64), nullable=False),
    sa.Column('action', sa.String(length=32), nullable=False),
    sa.Column('detail', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_audit_admin_id'), 'admin_audit', ['admin_id'], unique=False)
    op.create_index(op.f('ix_admin_audit_target_user_id'), 'admin_audit', ['target_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_admin_audit_target_user_id'), table_name='admin_audit')
    op.drop_index(op.f('ix_admin_audit_admin_id'), table_name='admin_audit')
    op.drop_table('admin_audit')
