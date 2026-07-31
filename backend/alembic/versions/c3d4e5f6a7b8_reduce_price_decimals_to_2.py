"""reduce_price_decimals_to_2

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'productos',
        'precio_unidad_usd',
        existing_type=sa.DECIMAL(precision=12, scale=4),
        type_=sa.DECIMAL(precision=12, scale=2),
    )
    op.alter_column(
        'productos',
        'precio_caja_usd',
        existing_type=sa.DECIMAL(precision=12, scale=4),
        type_=sa.DECIMAL(precision=12, scale=2),
    )
    op.alter_column(
        'detalle_ventas',
        'precio_unitario_usd',
        existing_type=sa.DECIMAL(precision=12, scale=4),
        type_=sa.DECIMAL(precision=12, scale=2),
    )


def downgrade() -> None:
    op.alter_column(
        'detalle_ventas',
        'precio_unitario_usd',
        existing_type=sa.DECIMAL(precision=12, scale=2),
        type_=sa.DECIMAL(precision=12, scale=4),
    )
    op.alter_column(
        'productos',
        'precio_caja_usd',
        existing_type=sa.DECIMAL(precision=12, scale=2),
        type_=sa.DECIMAL(precision=12, scale=4),
    )
    op.alter_column(
        'productos',
        'precio_unidad_usd',
        existing_type=sa.DECIMAL(precision=12, scale=2),
        type_=sa.DECIMAL(precision=12, scale=4),
    )
