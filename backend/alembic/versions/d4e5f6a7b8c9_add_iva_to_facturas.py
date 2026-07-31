"""add_iva_to_facturas

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('facturas', sa.Column('monto_exento_usd', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('facturas', sa.Column('base_imponible_usd', sa.Numeric(12, 2), nullable=False, server_default='0'))
    op.add_column('facturas', sa.Column('monto_iva_usd', sa.Numeric(12, 2), nullable=False, server_default='0'))

    op.add_column('detalles_facturas', sa.Column('iva_porcentaje', sa.Numeric(5, 2), nullable=False, server_default='16.00'))


def downgrade() -> None:
    op.drop_column('detalles_facturas', 'iva_porcentaje')

    op.drop_column('facturas', 'monto_iva_usd')
    op.drop_column('facturas', 'base_imponible_usd')
    op.drop_column('facturas', 'monto_exento_usd')
