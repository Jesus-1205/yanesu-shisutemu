"""remove_metodo_pago_id_from_ventas

Revision ID: 5a8b2c3d4e5f
Revises: 4c1d8f6a2e9b
Create Date: 2026-07-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5a8b2c3d4e5f'
down_revision: Union[str, None] = '4c1d8f6a2e9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('fk_ventas_metodo_pago', 'ventas', type_='foreignkey')
    op.drop_column('ventas', 'metodo_pago_id')


def downgrade() -> None:
    op.add_column('ventas', sa.Column('metodo_pago_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_ventas_metodo_pago', 'ventas', 'metodos_pago',
        ['metodo_pago_id'], ['id'], ondelete='RESTRICT'
    )
    op.execute(
        "UPDATE ventas SET metodo_pago_id = (SELECT id FROM metodos_pago WHERE nombre = 'PUNTO_DE_VENTA')"
    )
    op.alter_column('ventas', 'metodo_pago_id', nullable=False)