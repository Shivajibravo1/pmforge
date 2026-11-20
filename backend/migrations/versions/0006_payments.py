"""SuperProfile payments and plan end dates

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-20 20:30:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    if "paid_until" not in [c["name"] for c in insp.get_columns("users")]:
        with op.batch_alter_table('users') as batch:
            batch.add_column(sa.Column('paid_until', sa.Date(), nullable=True))
    if "payments" in insp.get_table_names():
        return
    op.create_table('payments',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('transaction_id', sa.String(length=64), nullable=False),
    sa.Column('buyer_email', sa.String(length=320), nullable=False),
    sa.Column('product_title', sa.String(length=200), nullable=False),
    sa.Column('plan', sa.String(length=10), nullable=True),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=True),
    sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('transaction_id')
    )
    op.create_index(op.f('ix_payments_buyer_email'), 'payments', ['buyer_email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payments_buyer_email'), table_name='payments')
    op.drop_table('payments')
    with op.batch_alter_table('users') as batch:
        batch.drop_column('paid_until')
