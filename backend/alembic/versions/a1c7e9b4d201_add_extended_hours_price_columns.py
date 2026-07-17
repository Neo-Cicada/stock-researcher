"""add extended-hours price columns to stock_prices

Revision ID: a1c7e9b4d201
Revises: 67d62df815c8
Create Date: 2026-07-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c7e9b4d201'
down_revision: Union[str, None] = '67d62df815c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'stock_prices', sa.Column('extended_price', sa.Float(), nullable=True)
    )
    op.add_column(
        'stock_prices',
        sa.Column('extended_change_pct', sa.Float(), nullable=True),
    )
    op.add_column(
        'stock_prices', sa.Column('market_state', sa.String(length=10), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('stock_prices', 'market_state')
    op.drop_column('stock_prices', 'extended_change_pct')
    op.drop_column('stock_prices', 'extended_price')
