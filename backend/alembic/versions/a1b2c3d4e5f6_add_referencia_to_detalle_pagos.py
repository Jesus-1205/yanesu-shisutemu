"""add_referencia_to_detalle_pagos

Revision ID: a1b2c3d4e5f6
Revises: 3af58504a52a
Create Date: 2026-07-24 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3af58504a52a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'detalle_pagos',
        sa.Column('referencia', sa.String(length=50), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('detalle_pagos', 'referencia')