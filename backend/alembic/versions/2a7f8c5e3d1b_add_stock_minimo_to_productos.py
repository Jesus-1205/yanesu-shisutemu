"""add_stock_minimo_to_productos

Revision ID: 2a7f8c5e3d1b
Revises: 58f6b20454f6
Create Date: 2026-07-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2a7f8c5e3d1b"
down_revision: Union[str, None] = "58f6b20454f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "productos",
        sa.Column("stock_minimo", sa.Integer(), nullable=False, server_default="5"),
    )


def downgrade() -> None:
    op.drop_column("productos", "stock_minimo")
