"""add tipo_iva to detalles_facturas

Revision ID: 203079ce56d4
Revises: b70997248b82
Create Date: 2026-08-24 12:36:41.194417

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '203079ce56d4'
down_revision: Union[str, None] = 'b70997248b82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('detalles_facturas', sa.Column('tipo_iva', sa.String(10), nullable=False, server_default='GRAVADO'))


def downgrade() -> None:
    op.drop_column('detalles_facturas', 'tipo_iva')
