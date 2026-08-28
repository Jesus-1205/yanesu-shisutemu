"""add tasa_bs and monto_mora to pagos_facturas

Revision ID: eb652f701bca
Revises: 9d491d8d11c8
Create Date: 2026-08-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eb652f701bca'
down_revision: Union[str, None] = '9d491d8d11c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('pagos_facturas', sa.Column('tasa_bs', sa.DECIMAL(precision=10, scale=2), nullable=True))
    op.add_column('pagos_facturas', sa.Column('monto_mora', sa.DECIMAL(precision=14, scale=2), nullable=False, server_default='0.00'))


def downgrade() -> None:
    op.drop_column('pagos_facturas', 'monto_mora')
    op.drop_column('pagos_facturas', 'tasa_bs')
