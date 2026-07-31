"""add_payment_methods

Revision ID: 4c1d8f6a2e9b
Revises: 58f6b20454f6
Create Date: 2026-07-23 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4c1d8f6a2e9b'
down_revision: Union[str, None] = '3b9f4a7e2c5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('metodos_pago',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(length=30), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    op.execute("""
        INSERT INTO metodos_pago (nombre, activo) VALUES
        ('DIVISAS', 1),
        ('EFECTIVO', 1),
        ('PUNTO_DE_VENTA', 1),
        ('PAGO_MOVIL', 1)
    """)

    op.add_column('ventas',
        sa.Column('metodo_pago_id', sa.Integer(), nullable=False,
                  server_default=sa.text("(SELECT id FROM metodos_pago WHERE nombre = 'PUNTO_DE_VENTA')"))
    )
    op.alter_column('ventas', 'metodo_pago_id', server_default=None, nullable=False)
    op.create_foreign_key(
        'fk_ventas_metodo_pago', 'ventas', 'metodos_pago',
        ['metodo_pago_id'], ['id'], ondelete='RESTRICT'
    )

    op.create_table('detalle_pagos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('venta_id', sa.Integer(), nullable=False),
        sa.Column('metodo_pago_id', sa.Integer(), nullable=False),
        sa.Column('monto_usd', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('monto_ves', sa.DECIMAL(precision=14, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['venta_id'], ['ventas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['metodo_pago_id'], ['metodos_pago.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('detalle_pagos')
    op.drop_constraint('fk_ventas_metodo_pago', 'ventas', type_='foreignkey')
    op.drop_column('ventas', 'metodo_pago_id')
    op.drop_table('metodos_pago')