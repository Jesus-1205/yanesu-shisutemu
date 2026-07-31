"""add_moneda_default_and_referencia_to_payment_methods

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    moneda_pago = sa.Enum("USD", "VES", name="moneda_pago")
    moneda_pago.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'metodos_pago',
        sa.Column('moneda_default', moneda_pago, nullable=False, server_default='VES'),
    )
    op.add_column(
        'metodos_pago',
        sa.Column('acepta_referencia', sa.Boolean, nullable=False, server_default='false'),
    )

    op.execute("UPDATE metodos_pago SET acepta_referencia = true WHERE nombre = 'PAGO_MOVIL'")
    op.execute("UPDATE metodos_pago SET moneda_default = 'USD' WHERE nombre = 'DIVISAS'")

    op.alter_column('metodos_pago', 'moneda_default', server_default=None)
    op.alter_column('metodos_pago', 'acepta_referencia', server_default=None)


def downgrade() -> None:
    op.drop_column('metodos_pago', 'acepta_referencia')
    op.drop_column('metodos_pago', 'moneda_default')
    sa.Enum(name="moneda_pago").drop(op.get_bind(), checkfirst=True)
