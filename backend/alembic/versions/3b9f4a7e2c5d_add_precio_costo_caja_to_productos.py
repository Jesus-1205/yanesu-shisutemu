"""add_precio_costo_caja_to_productos

Revision ID: 3b9f4a7e2c5d
Revises: 2a7f8c5e3d1b
Create Date: 2026-07-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3b9f4a7e2c5d"
down_revision: Union[str, None] = "2a7f8c5e3d1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "productos",
        sa.Column("precio_costo_caja_usd", sa.DECIMAL(precision=10, scale=2), nullable=True),
    )
    op.execute(
        "UPDATE productos SET precio_costo_caja_usd = ROUND(precio_costo_usd * unidades_por_caja, 2)"
    )
    op.alter_column("productos", "precio_costo_caja_usd", nullable=False)


def downgrade() -> None:
    op.drop_column("productos", "precio_costo_caja_usd")
