"""add fecha_limite_pago to facturas

Revision ID: 9d491d8d11c8
Revises: 203079ce56d4
Create Date: 2026-08-24 13:22:59.339391

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d491d8d11c8'
down_revision: Union[str, None] = '203079ce56d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('facturas', sa.Column('fecha_limite_pago', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('facturas', 'fecha_limite_pago')
