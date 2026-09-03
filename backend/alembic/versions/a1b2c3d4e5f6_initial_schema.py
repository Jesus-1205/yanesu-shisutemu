"""initial schema - 24 tables from SQLAlchemy models

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. roles ──
    op.create_table('roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(20), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_roles'),
        sa.UniqueConstraint('nombre', name='uq_roles_nombre'),
    )

    # ── 2. users ──
    op.create_table('users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('email', sa.String(100), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('nombre_completo', sa.String(100), nullable=False),
        sa.Column('rol_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['rol_id'], ['roles.id'], ondelete='RESTRICT', name='fk_users_rol_id_roles'),
        sa.PrimaryKeyConstraint('id', name='pk_users'),
        sa.UniqueConstraint('username', name='uq_users_username'),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])

    # ── 3. proveedores ──
    op.create_table('proveedores',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('telefono', sa.String(20), nullable=True),
        sa.Column('email', sa.String(100), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_proveedores'),
    )

    # ── 4. categorias ──
    op.create_table('categorias',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(50), nullable=False),
        sa.Column('descripcion', sa.String(200), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_categorias'),
        sa.UniqueConstraint('nombre', name='uq_categorias_nombre'),
    )

    # ── 5. productos ──
    op.create_table('productos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('codigo_barra', sa.String(50), nullable=True),
        sa.Column('nombre', sa.String(150), nullable=False),
        sa.Column('unidades_por_caja', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('stock_cajas', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stock_unidades', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stock_minimo', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('precio_costo_caja_usd', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('precio_costo_usd', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('precio_unidad_usd', sa.DECIMAL(12, 2), nullable=False),
        sa.Column('precio_caja_usd', sa.DECIMAL(12, 2), nullable=False),
        sa.Column('proveedor_id', sa.Integer(), nullable=True),
        sa.Column('tipo_iva', sa.String(10), nullable=False, server_default='GRAVADO'),
        sa.Column('es_favorito', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.ForeignKeyConstraint(['proveedor_id'], ['proveedores.id'], ondelete='RESTRICT', name='fk_productos_proveedor_id_proveedores'),
        sa.PrimaryKeyConstraint('id', name='pk_productos'),
        sa.UniqueConstraint('codigo_barra', name='uq_productos_codigo_barra'),
    )

    # ── 6. producto_categoria (association table) ──
    op.create_table('producto_categoria',
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('categoria_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ondelete='CASCADE', name='fk_producto_categoria_producto_id_productos'),
        sa.ForeignKeyConstraint(['categoria_id'], ['categorias.id'], ondelete='CASCADE', name='fk_producto_categoria_categoria_id_categorias'),
        sa.PrimaryKeyConstraint('producto_id', 'categoria_id', name='pk_producto_categoria'),
    )

    # ── 7. metodos_pago ──
    op.create_table('metodos_pago',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(30), nullable=False),
        sa.Column('moneda_default', sa.String(3), nullable=False, server_default='VES'),
        sa.Column('acepta_referencia', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.PrimaryKeyConstraint('id', name='pk_metodos_pago'),
        sa.UniqueConstraint('nombre', name='uq_metodos_pago_nombre'),
    )

    # ── 8. historico_tasas ──
    op.create_table('historico_tasas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tasa_usd', sa.DECIMAL(10, 4), nullable=False),
        sa.Column('tasa_eur', sa.DECIMAL(10, 4), nullable=False),
        sa.Column('fecha_registro', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('registrado_por', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['registrado_por'], ['users.id'], ondelete='SET NULL', name='fk_historico_tasas_registrado_por_users'),
        sa.PrimaryKeyConstraint('id', name='pk_historico_tasas'),
    )

    # ── 9. combos ──
    op.create_table('combos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('precio_total_usd', sa.DECIMAL(12, 2), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.PrimaryKeyConstraint('id', name='pk_combos'),
    )

    # ── 10. combo_groups ──
    op.create_table('combo_groups',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('combo_id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('min_cantidad', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_cantidad', sa.Integer(), nullable=False),
        sa.CheckConstraint('min_cantidad >= 0', name='ck_grupo_min_no_negativo'),
        sa.CheckConstraint('max_cantidad > 0', name='ck_grupo_max_positivo'),
        sa.CheckConstraint('min_cantidad <= max_cantidad', name='ck_grupo_min_max'),
        sa.ForeignKeyConstraint(['combo_id'], ['combos.id'], ondelete='CASCADE', name='fk_combo_groups_combo_id_combos'),
        sa.PrimaryKeyConstraint('id', name='pk_combo_groups'),
    )

    # ── 11. combo_group_products ──
    op.create_table('combo_group_products',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('grupo_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['grupo_id'], ['combo_groups.id'], ondelete='CASCADE', name='fk_combo_group_products_grupo_id_combo_groups'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ondelete='RESTRICT', name='fk_combo_group_products_producto_id_productos'),
        sa.PrimaryKeyConstraint('id', name='pk_combo_group_products'),
        sa.UniqueConstraint('grupo_id', 'producto_id', name='uq_grupo_producto'),
    )

    # ── 12. combo_payment_methods ──
    op.create_table('combo_payment_methods',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('combo_id', sa.Integer(), nullable=False),
        sa.Column('metodo_pago_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['combo_id'], ['combos.id'], ondelete='CASCADE', name='fk_combo_payment_methods_combo_id_combos'),
        sa.ForeignKeyConstraint(['metodo_pago_id'], ['metodos_pago.id'], ondelete='RESTRICT', name='fk_combo_payment_methods_metodo_pago_id_metodos_pago'),
        sa.PrimaryKeyConstraint('id', name='pk_combo_payment_methods'),
        sa.UniqueConstraint('combo_id', 'metodo_pago_id', name='uq_combo_metodo_pago'),
    )

    # ── 13. ventas ──
    op.create_table('ventas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('fecha_venta', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('tasa_bcv_aplicada', sa.DECIMAL(10, 4), nullable=False),
        sa.Column('historico_tasa_id', sa.Integer(), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('monto_exento_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0.00'),
        sa.Column('base_imponible_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0.00'),
        sa.Column('monto_iva_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0.00'),
        sa.Column('total_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0.00'),
        sa.Column('monto_exento_ves', sa.DECIMAL(14, 2), nullable=False, server_default='0.00'),
        sa.Column('base_imponible_ves', sa.DECIMAL(14, 2), nullable=False, server_default='0.00'),
        sa.Column('monto_iva_ves', sa.DECIMAL(14, 2), nullable=False, server_default='0.00'),
        sa.Column('total_ves', sa.DECIMAL(14, 2), nullable=False, server_default='0.00'),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='RESTRICT', name='fk_ventas_usuario_id_users'),
        sa.ForeignKeyConstraint(['historico_tasa_id'], ['historico_tasas.id'], ondelete='SET NULL', name='fk_ventas_historico_tasa_id_historico_tasas'),
        sa.PrimaryKeyConstraint('id', name='pk_ventas'),
    )
    op.create_index('idx_fecha_venta', 'ventas', ['fecha_venta'])

    # ── 14. detalle_ventas ──
    op.create_table('detalle_ventas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('venta_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('tipo_empaque', sa.String(10), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('unidades_descontadas', sa.Integer(), nullable=False),
        sa.Column('precio_unitario_usd', sa.DECIMAL(12, 2), nullable=False),
        sa.Column('subtotal_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0.00'),
        sa.Column('iva_porcentaje', sa.DECIMAL(5, 2), nullable=False, server_default='16.00'),
        sa.Column('usa_precio_divisas', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('combo_id', sa.Integer(), nullable=True),
        sa.CheckConstraint('cantidad > 0', name='ck_detalle_cantidad_positivo'),
        sa.CheckConstraint('unidades_descontadas > 0', name='ck_detalle_unidades_positivo'),
        sa.ForeignKeyConstraint(['venta_id'], ['ventas.id'], ondelete='CASCADE', name='fk_detalle_ventas_venta_id_ventas'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ondelete='RESTRICT', name='fk_detalle_ventas_producto_id_productos'),
        sa.ForeignKeyConstraint(['combo_id'], ['combos.id'], ondelete='SET NULL', name='fk_detalle_ventas_combo_id_combos'),
        sa.PrimaryKeyConstraint('id', name='pk_detalle_ventas'),
    )

    # ── 15. detalle_pagos ──
    op.create_table('detalle_pagos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('venta_id', sa.Integer(), nullable=False),
        sa.Column('metodo_pago_id', sa.Integer(), nullable=False),
        sa.Column('referencia', sa.String(50), nullable=True),
        sa.Column('monto_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0.00'),
        sa.Column('monto_ves', sa.DECIMAL(14, 2), nullable=False, server_default='0.00'),
        sa.ForeignKeyConstraint(['venta_id'], ['ventas.id'], ondelete='CASCADE', name='fk_detalle_pagos_venta_id_ventas'),
        sa.ForeignKeyConstraint(['metodo_pago_id'], ['metodos_pago.id'], ondelete='RESTRICT', name='fk_detalle_pagos_metodo_pago_id_metodos_pago'),
        sa.PrimaryKeyConstraint('id', name='pk_detalle_pagos'),
    )

    # ── 16. facturas ──
    op.create_table('facturas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('proveedor_id', sa.Integer(), nullable=False),
        sa.Column('numero_factura', sa.String(50), nullable=False),
        sa.Column('tipo_documento', sa.String(15), nullable=False, server_default='FACTURA'),
        sa.Column('fecha_factura', sa.Date(), nullable=False),
        sa.Column('fecha_limite_pago', sa.Date(), nullable=True),
        sa.Column('image_path', sa.String(255), nullable=True),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('moneda_principal', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('tasa_bs', sa.DECIMAL(10, 2), nullable=False, server_default='0'),
        sa.Column('total_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0'),
        sa.Column('total_bs', sa.DECIMAL(12, 2), nullable=False, server_default='0'),
        sa.Column('aplica_iva', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('estado_pago', sa.String(20), nullable=False, server_default='PENDIENTE'),
        sa.Column('procesada_por_ia', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('raw_json_ia', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['proveedor_id'], ['proveedores.id'], ondelete='RESTRICT', name='fk_facturas_proveedor_id_proveedores'),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='RESTRICT', name='fk_facturas_usuario_id_users'),
        sa.PrimaryKeyConstraint('id', name='pk_facturas'),
        sa.UniqueConstraint('proveedor_id', 'numero_factura', name='uq_factura_por_proveedor'),
    )

    # ── 17. detalles_facturas ──
    op.create_table('detalles_facturas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('factura_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('tipo_empaque', sa.String(10), nullable=False, server_default='CAJA'),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('costo_unitario_usd', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('costo_unitario_bs', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('tipo_iva', sa.String(10), nullable=False, server_default='GRAVADO'),
        sa.CheckConstraint('cantidad > 0', name='ck_detalle_factura_cantidad_positivo'),
        sa.CheckConstraint('costo_unitario_usd > 0', name='ck_detalle_factura_costo_usd_positivo'),
        sa.CheckConstraint('costo_unitario_bs > 0', name='ck_detalle_factura_costo_bs_positivo'),
        sa.CheckConstraint("tipo_empaque IN ('UNIDAD', 'CAJA')", name='ck_detalle_factura_tipo_empaque_valido'),
        sa.CheckConstraint("tipo_iva IN ('GRAVADO', 'EXENTO')", name='ck_detalle_factura_tipo_iva_valido'),
        sa.ForeignKeyConstraint(['factura_id'], ['facturas.id'], ondelete='CASCADE', name='fk_detalles_facturas_factura_id_facturas'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ondelete='RESTRICT', name='fk_detalles_facturas_producto_id_productos'),
        sa.PrimaryKeyConstraint('id', name='pk_detalles_facturas'),
    )

    # ── 18. obsequios_factura ──
    op.create_table('obsequios_factura',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('factura_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('tipo_empaque', sa.String(10), nullable=False, server_default='CAJA'),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('justificacion', sa.Text(), nullable=False),
        sa.CheckConstraint('cantidad > 0', name='ck_obsequio_cantidad_positivo'),
        sa.CheckConstraint("tipo_empaque IN ('UNIDAD', 'CAJA')", name='ck_obsequio_tipo_empaque_valido'),
        sa.ForeignKeyConstraint(['factura_id'], ['facturas.id'], ondelete='CASCADE', name='fk_obsequios_factura_factura_id_facturas'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ondelete='RESTRICT', name='fk_obsequios_factura_producto_id_productos'),
        sa.PrimaryKeyConstraint('id', name='pk_obsequios_factura'),
    )

    # ── 19. pagos_facturas ──
    op.create_table('pagos_facturas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('factura_id', sa.Integer(), nullable=False),
        sa.Column('metodo_pago_id', sa.Integer(), nullable=False),
        sa.Column('monto_usd', sa.DECIMAL(12, 2), nullable=False, server_default='0.00'),
        sa.Column('monto_bs', sa.DECIMAL(14, 2), nullable=False, server_default='0.00'),
        sa.Column('tasa_bs', sa.DECIMAL(10, 2), nullable=True),
        sa.Column('monto_mora', sa.DECIMAL(14, 2), nullable=False, server_default='0.00'),
        sa.Column('referencia', sa.String(100), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('fecha_pago', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['factura_id'], ['facturas.id'], ondelete='CASCADE', name='fk_pagos_facturas_factura_id_facturas'),
        sa.ForeignKeyConstraint(['metodo_pago_id'], ['metodos_pago.id'], ondelete='RESTRICT', name='fk_pagos_facturas_metodo_pago_id_metodos_pago'),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='RESTRICT', name='fk_pagos_facturas_usuario_id_users'),
        sa.PrimaryKeyConstraint('id', name='pk_pagos_facturas'),
    )
    op.create_index('idx_pagos_facturas_factura_id', 'pagos_facturas', ['factura_id'])

    # ── 20. comprobantes_pago_facturas ──
    op.create_table('comprobantes_pago_facturas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('pago_id', sa.Integer(), nullable=False),
        sa.Column('archivo_path', sa.String(255), nullable=False),
        sa.Column('nombre_original', sa.String(255), nullable=False),
        sa.Column('tipo_archivo', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['pago_id'], ['pagos_facturas.id'], ondelete='CASCADE', name='fk_comprobantes_pago_facturas_pago_id_pagos_facturas'),
        sa.PrimaryKeyConstraint('id', name='pk_comprobantes_pago_facturas'),
    )
    op.create_index('idx_comprobantes_pago_id', 'comprobantes_pago_facturas', ['pago_id'])

    # ── 21. price_rules ──
    op.create_table('price_rules',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.PrimaryKeyConstraint('id', name='pk_price_rules'),
    )

    # ── 22. price_rule_products ──
    op.create_table('price_rule_products',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('regla_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('tipo_empaque', sa.String(10), nullable=False),
        sa.Column('precio_usd', sa.DECIMAL(12, 2), nullable=False),
        sa.ForeignKeyConstraint(['regla_id'], ['price_rules.id'], ondelete='CASCADE', name='fk_price_rule_products_regla_id_price_rules'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id'], ondelete='RESTRICT', name='fk_price_rule_products_producto_id_productos'),
        sa.PrimaryKeyConstraint('id', name='pk_price_rule_products'),
        sa.UniqueConstraint('regla_id', 'producto_id', 'tipo_empaque', name='uq_regla_producto_empaque'),
    )

    # ── 23. price_rule_payment_methods ──
    op.create_table('price_rule_payment_methods',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('regla_id', sa.Integer(), nullable=False),
        sa.Column('metodo_pago_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['regla_id'], ['price_rules.id'], ondelete='CASCADE', name='fk_price_rule_payment_methods_regla_id_price_rules'),
        sa.ForeignKeyConstraint(['metodo_pago_id'], ['metodos_pago.id'], ondelete='RESTRICT', name='fk_price_rule_payment_methods_metodo_pago_id_metodos_pago'),
        sa.PrimaryKeyConstraint('id', name='pk_price_rule_payment_methods'),
        sa.UniqueConstraint('regla_id', 'metodo_pago_id', name='uq_regla_metodo_pago'),
    )

    # ── 24. system_settings ──
    op.create_table('system_settings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('clave', sa.String(100), nullable=False),
        sa.Column('valor_cifrado', sa.Text(), nullable=False),
        sa.Column('descripcion', sa.String(255), nullable=True),
        sa.Column('actualizado_por', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['actualizado_por'], ['users.id'], ondelete='SET NULL', name='fk_system_settings_actualizado_por_users'),
        sa.PrimaryKeyConstraint('id', name='pk_system_settings'),
        sa.UniqueConstraint('clave', name='uq_system_settings_clave'),
    )
    op.create_index('ix_system_settings_clave', 'system_settings', ['clave'])


def downgrade() -> None:
    op.drop_table('system_settings')
    op.drop_table('price_rule_payment_methods')
    op.drop_table('price_rule_products')
    op.drop_table('price_rules')
    op.drop_table('comprobantes_pago_facturas')
    op.drop_table('pagos_facturas')
    op.drop_table('obsequios_factura')
    op.drop_table('detalles_facturas')
    op.drop_table('facturas')
    op.drop_table('detalle_pagos')
    op.drop_table('detalle_ventas')
    op.drop_table('ventas')
    op.drop_table('combo_payment_methods')
    op.drop_table('combo_group_products')
    op.drop_table('combo_groups')
    op.drop_table('combos')
    op.drop_table('historico_tasas')
    op.drop_table('producto_categoria')
    op.drop_table('productos')
    op.drop_table('metodos_pago')
    op.drop_table('categorias')
    op.drop_table('proveedores')
    op.drop_table('users')
    op.drop_table('roles')
