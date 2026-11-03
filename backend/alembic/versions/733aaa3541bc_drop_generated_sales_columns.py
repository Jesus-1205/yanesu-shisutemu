"""drop_generated_sales_columns

Revision ID: 733aaa3541bc
Revises: 801064583bca
Create Date: 2026-11-03 15:05:49.163536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '733aaa3541bc'
down_revision: Union[str, None] = '801064583bca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("""
            ALTER TABLE ventas ALTER COLUMN total_usd DROP EXPRESSION IF EXISTS;
            ALTER TABLE ventas ALTER COLUMN total_usd SET DEFAULT 0.00;

            ALTER TABLE ventas ALTER COLUMN total_ves DROP EXPRESSION IF EXISTS;
            ALTER TABLE ventas ALTER COLUMN total_ves SET DEFAULT 0.00;

            ALTER TABLE ventas ALTER COLUMN monto_exento_ves DROP EXPRESSION IF EXISTS;
            ALTER TABLE ventas ALTER COLUMN monto_exento_ves SET DEFAULT 0.00;

            ALTER TABLE ventas ALTER COLUMN base_imponible_ves DROP EXPRESSION IF EXISTS;
            ALTER TABLE ventas ALTER COLUMN base_imponible_ves SET DEFAULT 0.00;

            ALTER TABLE ventas ALTER COLUMN monto_iva_ves DROP EXPRESSION IF EXISTS;
            ALTER TABLE ventas ALTER COLUMN monto_iva_ves SET DEFAULT 0.00;

            ALTER TABLE detalle_ventas ALTER COLUMN subtotal_usd DROP EXPRESSION IF EXISTS;
            ALTER TABLE detalle_ventas ALTER COLUMN subtotal_usd SET DEFAULT 0.00;
        """))


def downgrade() -> None:
    # No-op: los totales se gestionan como columnas regulares en ambos dialectos
    pass
