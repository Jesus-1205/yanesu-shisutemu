"""add_invoice_payments_tipo_documento_aplica_iva_obsequios

Revision ID: b70997248b82
Revises: e0f012ae4dab
Create Date: 2026-08-23 16:01:41.621274

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b70997248b82'
down_revision: Union[str, None] = 'e0f012ae4dab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Columnas nuevas en facturas ──
    op.add_column('facturas', sa.Column('tipo_documento', sa.String(length=15), nullable=False, server_default='FACTURA'))
    op.add_column('facturas', sa.Column('aplica_iva', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('facturas', sa.Column('estado_pago', sa.String(length=20), nullable=False, server_default='PENDIENTE'))

    # ── Tabla pagos_facturas ──
    op.create_table('pagos_facturas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('factura_id', sa.Integer(), nullable=False),
        sa.Column('metodo_pago_id', sa.Integer(), nullable=False),
        sa.Column('monto_usd', sa.DECIMAL(12, 2), nullable=False),
        sa.Column('monto_bs', sa.DECIMAL(14, 2), nullable=False),
        sa.Column('referencia', sa.String(100), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('fecha_pago', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['factura_id'], ['facturas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['metodo_pago_id'], ['metodos_pago.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_pagos_facturas_factura_id', 'pagos_facturas', ['factura_id'])

    # ── Tabla comprobantes_pago_facturas ──
    op.create_table('comprobantes_pago_facturas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('pago_id', sa.Integer(), nullable=False),
        sa.Column('archivo_path', sa.String(255), nullable=False),
        sa.Column('nombre_original', sa.String(255), nullable=False),
        sa.Column('tipo_archivo', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['pago_id'], ['pagos_facturas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_comprobantes_pago_id', 'comprobantes_pago_facturas', ['pago_id'])

    # ── Tabla obsequios_factura ──
    op.create_table('obsequios_factura',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('factura_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('tipo_empaque', sa.String(10), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('justificacion', sa.Text(), nullable=False),
        sa.CheckConstraint('cantidad > 0', name='ck_obsequio_cantidad_positivo'),
        sa.CheckConstraint("tipo_empaque IN ('UNIDAD', 'CAJA')", name='ck_obsequio_tipo_empaque_valido'),
        sa.ForeignKeyConstraint(['factura_id'], ['facturas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('obsequios_factura')
    op.drop_table('comprobantes_pago_facturas')
    op.drop_table('pagos_facturas')
    op.drop_column('facturas', 'estado_pago')
    op.drop_column('facturas', 'aplica_iva')
    op.drop_column('facturas', 'tipo_documento')
