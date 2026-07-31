"""add_facturas_proveedor

Revision ID: 4e8f6c2d5a1b
Revises: 3b9f4a7e2c5d
Create Date: 2026-07-23 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "4e8f6c2d5a1b"
down_revision: Union[str, None] = "3b9f4a7e2c5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "facturas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("proveedor_id", sa.Integer(), nullable=False),
        sa.Column("numero_factura", sa.String(length=50), nullable=False),
        sa.Column("fecha_factura", sa.Date(), nullable=False),
        sa.Column("image_path", sa.String(length=255), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["proveedor_id"], ["proveedores.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "proveedor_id", "numero_factura", name="uq_factura_por_proveedor"
        ),
    )

    op.create_table(
        "detalles_facturas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("factura_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("cantidad_cajas", sa.Integer(), nullable=False),
        sa.Column("costo_caja_usd", sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.ForeignKeyConstraint(
            ["factura_id"], ["facturas.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["producto_id"], ["productos.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "cantidad_cajas > 0",
            name="ck_detalle_factura_cantidad_positivo",
        ),
        sa.CheckConstraint(
            "costo_caja_usd > 0",
            name="ck_detalle_factura_costo_positivo",
        ),
    )


def downgrade() -> None:
    op.drop_table("detalles_facturas")
    op.drop_table("facturas")
