# Capítulo 07: Modelo de Datos Relacional y Migraciones Alembic Dual-Dialecto

Este documento detalla la arquitectura completa de persistencia relacional de **Yanesu Shisutemu**, cubriendo el diccionario exhaustivo de las 30 tablas declaradas en SQLAlchemy 2.0, las relaciones de integridad referencial, el diseño de claves foráneas con políticas `RESTRICT` y `CASCADE`, y la estrategia de migraciones con Alembic para soportar indistintamente **SQLite** (en entorno local/escritorio) y **PostgreSQL 16** (en despliegues cloud/VPS).

---

## 1. Resumen Ejecutivo del Esquema Relacional

El esquema de base de datos se estructura en torno a 5 subsistemas de negocio interconectados que totalizan **30 tablas**:

| Dominio de Negocio | Tablas Involucradas | Propósito Central |
| :--- | :--- | :--- |
| **Seguridad, Usuarios y M2M** | `roles`, `users`, `api_keys`, `system_settings` | Control de acceso basado en roles (RBAC), auditoría, tokens M2M para n8n y configuración de secretos cifrados. |
| **Catálogo, Precios y Combos** | `proveedores`, `categorias`, `producto_categoria`, `productos`, `combos`, `combo_groups`, `combo_group_products`, `combo_payment_methods`, `price_rules`, `price_rule_products`, `price_rule_payment_methods` | Catálogo de productos con empaque bimodal (cajas/unidades), precios en USD, reglas de descuento por divisas y combos empaquetados. |
| **Punto de Venta y Finanzas** | `ventas`, `detalle_ventas`, `metodos_pago`, `detalle_pagos`, `historico_tasas` | Registro inmutable de transacciones comerciales, liquidación de pagos combinados multimoneda y trazabilidad histórica de tasas BCV. |
| **Compras y Cuentas por Pagar** | `facturas`, `detalles_facturas`, `obsequios_factura`, `pagos_facturas`, `comprobantes_pago_facturas` | Cuentas por pagar a proveedores, recepción de mercancía física, amortización multidivisa y digitalización de comprobantes. |
| **Control de Envases Retornables** | `retornable_productos`, `retornable_inventario`, `retornable_movimientos`, `retornable_reportes`, `retornable_reporte_detalles` | Trazabilidad física en circuito cerrado de botellas de cerveza (222ml y 333ml) y huacales en estados `LLENO`, `VACIO` y `CASILLERO`. |

---

## 2. Arquitectura de Migraciones Alembic Dual-Dialecto

El sistema adopta el principio de **código único de migración para dos motores de base de datos**: SQLite para la aplicación de escritorio y PostgreSQL para el entorno servidor.

```
                    ALEMBIC ENV.PY (Config.SQLALCHEMY_DATABASE_URL)
                                       |
                +----------------------+----------------------+
                |                                             |
       Entorno SQLite (Desktop)                     Entorno PostgreSQL (Docker/VPS)
                |                                             |
   - render_as_batch = True                      - DDL Nativo (ALTER TABLE)
   - PRAGMA foreign_keys = ON                    - Pool: pool_size=10, max_overflow=20
   - Recrea tablas determinísticamente          - Timezone: America/Caracas forzado
   - sa.func.now() -> CURRENT_TIMESTAMP          - sa.func.now() -> now()
   - sa.text('true') / sa.text('false')          - sa.text('true') / sa.text('false')
```

### 2.1. Reglas de Oro Multi-Dialecto
1. **`render_as_batch=True` Obligatorio:**
   - En `backend/alembic/env.py`, tanto en `run_migrations_offline()` como en `run_migrations_online()`, se configura `render_as_batch=True`. Esto permite que operaciones de modificación de esquema (`ALTER TABLE`, adición o eliminación de constraints) se ejecuten en SQLite mediante la técnica de recreación de tabla temporal (batch mode), sin romper la compatibilidad con PostgreSQL.
2. **Convención Determinista de Nombres (`POSTGRES_SQLITE_CONVENTION`):**
   - Configurada en `backend/app/core/database.py`:
     ```python
     POSTGRES_SQLITE_CONVENTION = {
         "ix": "ix_%(column_0_label)s",
         "uq": "uq_%(table_name)s_%(column_0_name)s",
         "ck": "ck_%(table_name)s_%(constraint_name)s",
         "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
         "pk": "pk_%(table_name)s",
     }
     ```
   - Esta convención elimina las restricciones anónimas. SQLite requiere nombres explícitos para poder reconstruir claves foráneas e índices al procesar un bloque `batch_alter_table`.
3. **Valores por Defecto de Fecha y Hora (`sa.func.now()`):**
   - Se prohíbe el uso de `sa.text('now()')` (exclusivo de Postgres) o `sa.text("datetime('now')")` (exclusivo de SQLite). Se utiliza siempre `sa.func.now()`, que SQLAlchemy compila automáticamente al dialecto de la conexión activa.
4. **Valores por Defecto Booleanos (`sa.text('true')` / `sa.text('false')`):**
   - Válidos de manera transparente tanto en SQLite (donde compilan a valores interpretados como booleanos) como en PostgreSQL.
5. **Tipos Monetarios y de Stock (`DECIMAL`):**
   - Se utiliza `DECIMAL(10, 2)` para montos monetarios y stock, y `DECIMAL(10, 4)` para tasas de cambio cambiarias. SQLite almacena estos valores como tipos numéricos preservando la exactitud requerida por `Decimal` en Python.
6. **Prohibición de `create_all()` en Producción:**
   - `Base.metadata.create_all()` solo se utiliza en tests unitarios con base de datos efímera en memoria. En producción, la única fuente de evolución de esquema es `alembic upgrade head`, garantizando trazabilidad histórica y cero desincronización.

---

## 3. Diagrama Entidad-Relación (ERD) Conceptual

```
 [roles] 1 <----- N [users] 1 <-----+ N [ventas] 1 <-----+ N [detalle_ventas] N -----> 1 [productos]
                        |           |       |                     |                          ^
                        |           |       +---- N [detalle_pagos] N -> 1 [metodos_pago]   |
                        |           |                                                        |
                        |           +------------ N [retornable_reportes]                    |
                        |                                                                    |
                        +----------- N [facturas] 1 <-----+ N [detalles_facturas] N ---------+
                                          |                     |
                                          +-- N [pagos_facturas] 1 <-- N [comprobantes_pago]
                                          |
                                          +-- N [obsequios_factura] N -> 1 [productos]

 [proveedores] 1 <--- N [productos] N <---> N [categorias] (via producto_categoria)
       |                      ^
       +--- N [facturas]      |
                              +--- 1 <--- N [combos] 1 <--- N [combo_groups] 1 <--- N [combo_group_products]
                              |
                              +--- 1 <--- N [price_rule_products] N ---> 1 [price_rules]
                              |
                              +--- 1 <---> 1 [retornable_productos]
                                                     ^
 [retornable_inventario] <---------------------------+
 [retornable_movimientos] <--------------------------+
 [retornable_reporte_detalles] <---------------------+
```

---

## 4. Diccionario Exhaustivo de Datos (30 Tablas)

### 4.1. Tabla `roles`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `roles`. |
| `nombre` | `VARCHAR(20)` | NO | `-` | Campo persistido en `roles`. |

---

### 4.2. Tabla `users`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `rol_id` ➔ `roles.id` (ondelete: `RESTRICT`)
- **Índices:**
  - `ix_users_email` sobre `(email)` (UNIQUE)
  - `ix_users_username` sobre `(username)` (UNIQUE)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `users`. |
| `username` | `VARCHAR(50)` | NO | `-` | Campo persistido en `users`. |
| `email` | `VARCHAR(100)` | NO | `-` | Campo persistido en `users`. |
| `hashed_password` | `VARCHAR(255)` | NO | `-` | Campo persistido en `users`. |
| `nombre_completo` | `VARCHAR(100)` | NO | `-` | Campo persistido en `users`. |
| `rol_id` | `INTEGER` | NO | `-` | Campo persistido en `users`. |
| `is_active` | `BOOLEAN` | NO | `-` | Campo persistido en `users`. |
| `created_at` | `DATETIME` | SÍ | `now()` | Campo persistido en `users`. |
| `updated_at` | `DATETIME` | SÍ | `now()` | Campo persistido en `users`. |

---

### 4.3. Tabla `api_keys`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna
- **Índices:**
  - `ix_api_keys_key_hash` sobre `(key_hash)` (UNIQUE)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `api_keys`. |
| `name` | `VARCHAR(100)` | NO | `-` | Campo persistido en `api_keys`. |
| `key_hash` | `VARCHAR(255)` | NO | `-` | Campo persistido en `api_keys`. |
| `is_active` | `BOOLEAN` | NO | `-` | Campo persistido en `api_keys`. |
| `created_at` | `DATETIME` | NO | `now()` | Campo persistido en `api_keys`. |

---

### 4.4. Tabla `proveedores`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `proveedores`. |
| `nombre` | `VARCHAR(100)` | NO | `-` | Campo persistido en `proveedores`. |
| `telefono` | `VARCHAR(20)` | SÍ | `-` | Campo persistido en `proveedores`. |
| `email` | `VARCHAR(100)` | SÍ | `-` | Campo persistido en `proveedores`. |

---

### 4.5. Tabla `producto_categoria`

- **Llave Primaria:** `producto_id, categoria_id`
- **Llaves Foráneas:**
  - `categoria_id` ➔ `categorias.id` (ondelete: `CASCADE`)
  - `producto_id` ➔ `productos.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `producto_id` | `INTEGER` | NO | `-` | Campo persistido en `producto_categoria`. |
| `categoria_id` | `INTEGER` | NO | `-` | Campo persistido en `producto_categoria`. |

---

### 4.6. Tabla `categorias`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `categorias`. |
| `nombre` | `VARCHAR(50)` | NO | `-` | Campo persistido en `categorias`. |
| `descripcion` | `VARCHAR(200)` | SÍ | `-` | Campo persistido en `categorias`. |

---

### 4.7. Tabla `combos`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `combos`. |
| `nombre` | `VARCHAR(100)` | NO | `-` | Campo persistido en `combos`. |
| `descripcion` | `TEXT` | SÍ | `-` | Campo persistido en `combos`. |
| `precio_total_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `combos`. |
| `activo` | `BOOLEAN` | NO | `-` | Campo persistido en `combos`. |

---

### 4.8. Tabla `combo_groups`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `combo_id` ➔ `combos.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `combo_groups`. |
| `combo_id` | `INTEGER` | NO | `-` | Campo persistido en `combo_groups`. |
| `nombre` | `VARCHAR(100)` | NO | `-` | Campo persistido en `combo_groups`. |
| `min_cantidad` | `INTEGER` | NO | `-` | Campo persistido en `combo_groups`. |
| `max_cantidad` | `INTEGER` | NO | `-` | Campo persistido en `combo_groups`. |

---

### 4.9. Tabla `combo_group_products`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `grupo_id` ➔ `combo_groups.id` (ondelete: `CASCADE`)
  - `producto_id` ➔ `productos.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `combo_group_products`. |
| `grupo_id` | `INTEGER` | NO | `-` | Campo persistido en `combo_group_products`. |
| `producto_id` | `INTEGER` | NO | `-` | Campo persistido en `combo_group_products`. |

---

### 4.10. Tabla `combo_payment_methods`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `metodo_pago_id` ➔ `metodos_pago.id` (ondelete: `RESTRICT`)
  - `combo_id` ➔ `combos.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `combo_payment_methods`. |
| `combo_id` | `INTEGER` | NO | `-` | Campo persistido en `combo_payment_methods`. |
| `metodo_pago_id` | `INTEGER` | NO | `-` | Campo persistido en `combo_payment_methods`. |

---

### 4.11. Tabla `productos`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `proveedor_id` ➔ `proveedores.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `productos`. |
| `codigo_barra` | `VARCHAR(50)` | SÍ | `-` | Campo persistido en `productos`. |
| `nombre` | `VARCHAR(150)` | NO | `-` | Campo persistido en `productos`. |
| `unidades_por_caja` | `INTEGER` | NO | `-` | Campo persistido en `productos`. |
| `stock_cajas` | `INTEGER` | NO | `-` | Campo persistido en `productos`. |
| `stock_unidades` | `INTEGER` | NO | `-` | Campo persistido en `productos`. |
| `stock_minimo` | `INTEGER` | NO | `-` | Campo persistido en `productos`. |
| `precio_costo_caja_usd` | `DECIMAL(10, 2)` | NO | `-` | Campo persistido en `productos`. |
| `precio_costo_usd` | `DECIMAL(10, 2)` | NO | `-` | Campo persistido en `productos`. |
| `precio_unidad_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `productos`. |
| `precio_caja_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `productos`. |
| `proveedor_id` | `INTEGER` | SÍ | `-` | Campo persistido en `productos`. |
| `tipo_iva` | `VARCHAR(7)` | NO | `-` | Campo persistido en `productos`. |
| `es_favorito` | `BOOLEAN` | NO | `-` | Campo persistido en `productos`. |

---

### 4.12. Tabla `historico_tasas`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `api_key_id` ➔ `api_keys.id` (ondelete: `SET NULL`)
  - `registrado_por` ➔ `users.id` (ondelete: `SET NULL`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `historico_tasas`. |
| `tasa_usd` | `DECIMAL(10, 4)` | NO | `-` | Campo persistido en `historico_tasas`. |
| `tasa_eur` | `DECIMAL(10, 4)` | NO | `-` | Campo persistido en `historico_tasas`. |
| `fecha_registro` | `DATETIME` | NO | `now()` | Campo persistido en `historico_tasas`. |
| `registrado_por` | `INTEGER` | SÍ | `-` | Campo persistido en `historico_tasas`. |
| `api_key_id` | `INTEGER` | SÍ | `-` | Campo persistido en `historico_tasas`. |

---

### 4.13. Tabla `ventas`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `historico_tasa_id` ➔ `historico_tasas.id` (ondelete: `SET NULL`)
  - `usuario_id` ➔ `users.id` (ondelete: `RESTRICT`)
- **Índices:**
  - `idx_fecha_venta` sobre `(fecha_venta)`

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `ventas`. |
| `fecha_venta` | `DATETIME` | NO | `now()` | Campo persistido en `ventas`. |
| `usuario_id` | `INTEGER` | NO | `-` | Campo persistido en `ventas`. |
| `tasa_bcv_aplicada` | `DECIMAL(10, 4)` | NO | `-` | Campo persistido en `ventas`. |
| `historico_tasa_id` | `INTEGER` | SÍ | `-` | Campo persistido en `ventas`. |
| `observaciones` | `TEXT` | SÍ | `-` | Campo persistido en `ventas`. |
| `monto_exento_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `ventas`. |
| `base_imponible_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `ventas`. |
| `monto_iva_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `ventas`. |
| `total_usd` | `DECIMAL(12, 2)` | NO | `COMPUTED: monto_exento_usd + base_imponible_usd + monto_iva_usd` | Campo persistido en `ventas`. |
| `monto_exento_ves` | `DECIMAL(14, 2)` | NO | `COMPUTED: ROUND(monto_exento_usd * tasa_bcv_aplicada, 2)` | Campo persistido en `ventas`. |
| `base_imponible_ves` | `DECIMAL(14, 2)` | NO | `COMPUTED: ROUND(base_imponible_usd * tasa_bcv_aplicada, 2)` | Campo persistido en `ventas`. |
| `monto_iva_ves` | `DECIMAL(14, 2)` | NO | `COMPUTED: ROUND(monto_iva_usd * tasa_bcv_aplicada, 2)` | Campo persistido en `ventas`. |
| `total_ves` | `DECIMAL(14, 2)` | NO | `COMPUTED: ROUND((monto_exento_usd + base_imponible_usd + monto_iva_usd) * tasa_bcv_aplicada, 2)` | Campo persistido en `ventas`. |

---

### 4.14. Tabla `detalle_ventas`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `combo_id` ➔ `combos.id` (ondelete: `SET NULL`)
  - `producto_id` ➔ `productos.id` (ondelete: `RESTRICT`)
  - `venta_id` ➔ `ventas.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `detalle_ventas`. |
| `venta_id` | `INTEGER` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `producto_id` | `INTEGER` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `tipo_empaque` | `VARCHAR(6)` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `cantidad` | `INTEGER` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `unidades_descontadas` | `INTEGER` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `precio_unitario_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `subtotal_usd` | `DECIMAL(12, 2)` | NO | `COMPUTED: ROUND(cantidad * precio_unitario_usd, 2)` | Campo persistido en `detalle_ventas`. |
| `iva_porcentaje` | `DECIMAL(5, 2)` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `usa_precio_divisas` | `BOOLEAN` | NO | `-` | Campo persistido en `detalle_ventas`. |
| `combo_id` | `INTEGER` | SÍ | `-` | Campo persistido en `detalle_ventas`. |

---

### 4.15. Tabla `metodos_pago`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `metodos_pago`. |
| `nombre` | `VARCHAR(30)` | NO | `-` | Campo persistido en `metodos_pago`. |
| `moneda_default` | `VARCHAR(3)` | NO | `-` | Campo persistido en `metodos_pago`. |
| `acepta_referencia` | `BOOLEAN` | NO | `-` | Campo persistido en `metodos_pago`. |
| `activo` | `BOOLEAN` | NO | `-` | Campo persistido en `metodos_pago`. |

---

### 4.16. Tabla `detalle_pagos`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `metodo_pago_id` ➔ `metodos_pago.id` (ondelete: `RESTRICT`)
  - `venta_id` ➔ `ventas.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `detalle_pagos`. |
| `venta_id` | `INTEGER` | NO | `-` | Campo persistido en `detalle_pagos`. |
| `metodo_pago_id` | `INTEGER` | NO | `-` | Campo persistido en `detalle_pagos`. |
| `referencia` | `VARCHAR(50)` | SÍ | `-` | Campo persistido en `detalle_pagos`. |
| `monto_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `detalle_pagos`. |
| `monto_ves` | `DECIMAL(14, 2)` | NO | `-` | Campo persistido en `detalle_pagos`. |

---

### 4.17. Tabla `facturas`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `usuario_id` ➔ `users.id` (ondelete: `RESTRICT`)
  - `proveedor_id` ➔ `proveedores.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `facturas`. |
| `proveedor_id` | `INTEGER` | NO | `-` | Campo persistido en `facturas`. |
| `numero_factura` | `VARCHAR(50)` | NO | `-` | Campo persistido en `facturas`. |
| `tipo_documento` | `VARCHAR(15)` | NO | `-` | Campo persistido en `facturas`. |
| `fecha_factura` | `DATE` | NO | `-` | Campo persistido en `facturas`. |
| `fecha_limite_pago` | `DATE` | SÍ | `-` | Campo persistido en `facturas`. |
| `image_path` | `VARCHAR(255)` | SÍ | `-` | Campo persistido en `facturas`. |
| `usuario_id` | `INTEGER` | NO | `-` | Campo persistido en `facturas`. |
| `observaciones` | `TEXT` | SÍ | `-` | Campo persistido en `facturas`. |
| `moneda_principal` | `VARCHAR(3)` | NO | `-` | Campo persistido en `facturas`. |
| `tasa_bs` | `DECIMAL(10, 2)` | NO | `-` | Campo persistido en `facturas`. |
| `total_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `facturas`. |
| `total_bs` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `facturas`. |
| `aplica_iva` | `BOOLEAN` | NO | `-` | Campo persistido en `facturas`. |
| `estado_pago` | `VARCHAR(20)` | NO | `-` | Campo persistido en `facturas`. |
| `procesada_por_ia` | `BOOLEAN` | NO | `-` | Campo persistido en `facturas`. |
| `raw_json_ia` | `JSON` | SÍ | `-` | Campo persistido en `facturas`. |
| `created_at` | `DATETIME` | NO | `now()` | Campo persistido en `facturas`. |

---

### 4.18. Tabla `detalles_facturas`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `factura_id` ➔ `facturas.id` (ondelete: `CASCADE`)
  - `producto_id` ➔ `productos.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `detalles_facturas`. |
| `factura_id` | `INTEGER` | NO | `-` | Campo persistido en `detalles_facturas`. |
| `producto_id` | `INTEGER` | NO | `-` | Campo persistido en `detalles_facturas`. |
| `tipo_empaque` | `VARCHAR(10)` | NO | `-` | Campo persistido en `detalles_facturas`. |
| `cantidad` | `INTEGER` | NO | `-` | Campo persistido en `detalles_facturas`. |
| `costo_unitario_usd` | `DECIMAL(10, 2)` | NO | `-` | Campo persistido en `detalles_facturas`. |
| `costo_unitario_bs` | `DECIMAL(10, 2)` | NO | `-` | Campo persistido en `detalles_facturas`. |
| `tipo_iva` | `VARCHAR(10)` | NO | `-` | Campo persistido en `detalles_facturas`. |

---

### 4.19. Tabla `obsequios_factura`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `factura_id` ➔ `facturas.id` (ondelete: `CASCADE`)
  - `producto_id` ➔ `productos.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `obsequios_factura`. |
| `factura_id` | `INTEGER` | NO | `-` | Campo persistido en `obsequios_factura`. |
| `producto_id` | `INTEGER` | NO | `-` | Campo persistido en `obsequios_factura`. |
| `tipo_empaque` | `VARCHAR(10)` | NO | `-` | Campo persistido en `obsequios_factura`. |
| `cantidad` | `INTEGER` | NO | `-` | Campo persistido en `obsequios_factura`. |
| `justificacion` | `TEXT` | NO | `-` | Campo persistido en `obsequios_factura`. |

---

### 4.20. Tabla `pagos_facturas`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `usuario_id` ➔ `users.id` (ondelete: `RESTRICT`)
  - `metodo_pago_id` ➔ `metodos_pago.id` (ondelete: `RESTRICT`)
  - `factura_id` ➔ `facturas.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `pagos_facturas`. |
| `factura_id` | `INTEGER` | NO | `-` | Campo persistido en `pagos_facturas`. |
| `metodo_pago_id` | `INTEGER` | NO | `-` | Campo persistido en `pagos_facturas`. |
| `monto_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `pagos_facturas`. |
| `monto_bs` | `DECIMAL(14, 2)` | NO | `-` | Campo persistido en `pagos_facturas`. |
| `tasa_bs` | `DECIMAL(10, 2)` | SÍ | `-` | Campo persistido en `pagos_facturas`. |
| `monto_mora` | `DECIMAL(14, 2)` | NO | `-` | Campo persistido en `pagos_facturas`. |
| `referencia` | `VARCHAR(100)` | SÍ | `-` | Campo persistido en `pagos_facturas`. |
| `observaciones` | `TEXT` | SÍ | `-` | Campo persistido en `pagos_facturas`. |
| `fecha_pago` | `DATETIME` | NO | `now()` | Campo persistido en `pagos_facturas`. |
| `usuario_id` | `INTEGER` | NO | `-` | Campo persistido en `pagos_facturas`. |

---

### 4.21. Tabla `comprobantes_pago_facturas`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `pago_id` ➔ `pagos_facturas.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `comprobantes_pago_facturas`. |
| `pago_id` | `INTEGER` | NO | `-` | Campo persistido en `comprobantes_pago_facturas`. |
| `archivo_path` | `VARCHAR(255)` | NO | `-` | Campo persistido en `comprobantes_pago_facturas`. |
| `nombre_original` | `VARCHAR(255)` | NO | `-` | Campo persistido en `comprobantes_pago_facturas`. |
| `tipo_archivo` | `VARCHAR(50)` | NO | `-` | Campo persistido en `comprobantes_pago_facturas`. |
| `created_at` | `DATETIME` | NO | `now()` | Campo persistido en `comprobantes_pago_facturas`. |

---

### 4.22. Tabla `price_rules`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `price_rules`. |
| `nombre` | `VARCHAR(100)` | NO | `-` | Campo persistido en `price_rules`. |
| `descripcion` | `TEXT` | SÍ | `-` | Campo persistido en `price_rules`. |
| `activo` | `BOOLEAN` | NO | `-` | Campo persistido en `price_rules`. |

---

### 4.23. Tabla `price_rule_products`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `producto_id` ➔ `productos.id` (ondelete: `RESTRICT`)
  - `regla_id` ➔ `price_rules.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `price_rule_products`. |
| `regla_id` | `INTEGER` | NO | `-` | Campo persistido en `price_rule_products`. |
| `producto_id` | `INTEGER` | NO | `-` | Campo persistido en `price_rule_products`. |
| `tipo_empaque` | `VARCHAR(6)` | NO | `-` | Campo persistido en `price_rule_products`. |
| `precio_usd` | `DECIMAL(12, 2)` | NO | `-` | Campo persistido en `price_rule_products`. |

---

### 4.24. Tabla `price_rule_payment_methods`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `metodo_pago_id` ➔ `metodos_pago.id` (ondelete: `RESTRICT`)
  - `regla_id` ➔ `price_rules.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `price_rule_payment_methods`. |
| `regla_id` | `INTEGER` | NO | `-` | Campo persistido en `price_rule_payment_methods`. |
| `metodo_pago_id` | `INTEGER` | NO | `-` | Campo persistido en `price_rule_payment_methods`. |

---

### 4.25. Tabla `system_settings`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `actualizado_por` ➔ `users.id` (ondelete: `SET NULL`)
- **Índices:**
  - `ix_system_settings_clave` sobre `(clave)` (UNIQUE)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `system_settings`. |
| `clave` | `VARCHAR(100)` | NO | `-` | Campo persistido en `system_settings`. |
| `valor_cifrado` | `TEXT` | NO | `-` | Campo persistido en `system_settings`. |
| `descripcion` | `VARCHAR(255)` | SÍ | `-` | Campo persistido en `system_settings`. |
| `actualizado_por` | `INTEGER` | SÍ | `-` | Campo persistido en `system_settings`. |
| `updated_at` | `DATETIME` | SÍ | `now()` | Campo persistido en `system_settings`. |

---

### 4.26. Tabla `retornable_productos`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `producto_id` ➔ `productos.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `retornable_productos`. |
| `producto_id` | `INTEGER` | NO | `-` | Campo persistido en `retornable_productos`. |
| `presentacion` | `VARCHAR(3)` | NO | `-` | Campo persistido en `retornable_productos`. |

---

### 4.27. Tabla `retornable_reportes`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `usuario_id` ➔ `users.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `retornable_reportes`. |
| `fecha` | `DATETIME` | NO | `now()` | Campo persistido en `retornable_reportes`. |
| `realizado_por` | `VARCHAR(150)` | NO | `-` | Campo persistido en `retornable_reportes`. |
| `usuario_id` | `INTEGER` | NO | `-` | Campo persistido en `retornable_reportes`. |
| `observaciones` | `TEXT` | SÍ | `-` | Campo persistido en `retornable_reportes`. |
| `es_actual` | `BOOLEAN` | NO | `-` | Campo persistido en `retornable_reportes`. |

---

### 4.28. Tabla `retornable_reporte_detalles`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `reporte_id` ➔ `retornable_reportes.id` (ondelete: `CASCADE`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `retornable_reporte_detalles`. |
| `reporte_id` | `INTEGER` | NO | `-` | Campo persistido en `retornable_reporte_detalles`. |
| `presentacion` | `VARCHAR(3)` | NO | `-` | Campo persistido en `retornable_reporte_detalles`. |
| `estado` | `VARCHAR(12)` | NO | `-` | Campo persistido en `retornable_reporte_detalles`. |
| `cantidad_botellas` | `INTEGER` | NO | `-` | Campo persistido en `retornable_reporte_detalles`. |
| `cantidad_cajas` | `INTEGER` | NO | `-` | Campo persistido en `retornable_reporte_detalles`. |

---

### 4.29. Tabla `retornable_inventario`

- **Llave Primaria:** `id`
- **Llaves Foráneas:** Ninguna

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `retornable_inventario`. |
| `presentacion` | `VARCHAR(3)` | NO | `-` | Campo persistido en `retornable_inventario`. |
| `estado` | `VARCHAR(12)` | NO | `-` | Campo persistido en `retornable_inventario`. |
| `cantidad_botellas` | `INTEGER` | NO | `-` | Campo persistido en `retornable_inventario`. |
| `cantidad_cajas` | `INTEGER` | NO | `-` | Campo persistido en `retornable_inventario`. |

---

### 4.30. Tabla `retornable_movimientos`

- **Llave Primaria:** `id`
- **Llaves Foráneas:**
  - `usuario_id` ➔ `users.id` (ondelete: `RESTRICT`)

| Columna | Tipo SQLAlchemy | Nulo | Default | Descripción / Regla |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `INTEGER` | NO | `Autoincrement` | Campo persistido en `retornable_movimientos`. |
| `fecha` | `DATETIME` | NO | `now()` | Campo persistido en `retornable_movimientos`. |
| `presentacion` | `VARCHAR(3)` | NO | `-` | Campo persistido en `retornable_movimientos`. |
| `estado` | `VARCHAR(12)` | NO | `-` | Campo persistido en `retornable_movimientos`. |
| `delta_botellas` | `INTEGER` | NO | `-` | Campo persistido en `retornable_movimientos`. |
| `tipo_movimiento` | `VARCHAR(20)` | NO | `-` | Campo persistido en `retornable_movimientos`. |
| `referencia_id` | `INTEGER` | SÍ | `-` | Campo persistido en `retornable_movimientos`. |
| `referencia_tipo` | `VARCHAR(10)` | SÍ | `-` | Campo persistido en `retornable_movimientos`. |
| `usuario_id` | `INTEGER` | NO | `-` | Campo persistido en `retornable_movimientos`. |
| `observaciones` | `TEXT` | SÍ | `-` | Campo persistido en `retornable_movimientos`. |

---

## 5. Matriz de Integridad Referencial y Reglas de Eliminación

El sistema aplica de manera intransigente la protección contra borrado accidental de registros transaccionales y maestros mediante `RESTRICT` y `CASCADE`:

1. **Políticas `ondelete='RESTRICT'` (Protección Transaccional):**
   - `productos` ➔ `proveedores`: Un proveedor con productos asociados no puede eliminarse.
   - `ventas` ➔ `users`: Un cajero que haya registrado ventas no puede ser eliminado de la base de datos (garantía de no repudio).
   - `detalle_ventas` ➔ `productos`: Un producto con historial de ventas no puede ser borrado físicamente; solo desactivado (`activo = false`).
   - `facturas` ➔ `proveedores`: No se pueden suprimir proveedores con facturas registradas en el sistema.
   - `detalles_facturas` ➔ `productos`: Historial de compras protegido contra eliminación de ítems de catálogo.
2. **Políticas `ondelete='CASCADE'` (Dependencia Existencial Estricta):**
   - `detalle_ventas` ➔ `ventas`: Si se anula o elimina un ticket de venta en pruebas, sus ítems desglosados se eliminan en cascada.
   - `detalle_pagos` ➔ `ventas`: Desglose de medios de pago vinculado al ciclo de vida del ticket.
   - `detalles_facturas` ➔ `facturas`: Ítems de compra eliminados si se descarta el borrador de factura.
   - `pagos_facturas` y `comprobantes_pago_facturas`: Comprobantes y abonos dependientes de la factura de origen.
   - `combo_groups` y `combo_group_products` ➔ `combos`: Los grupos de selección de un combo desaparecen si el combo es eliminado.
   - `price_rule_products` y `price_rule_payment_methods` ➔ `price_rules`: Asociaciones eliminadas al suprimir la regla de descuento.
   - `retornable_reporte_detalles` ➔ `retornable_reportes`: Los 6 renglones de conteo físico se eliminan si se descarta el reporte borrador.

---

## 6. Conclusión y Resiliencia del Esquema

El diseño relacional de Yanesu Shisutemu garantiza:
1. **Determinismo y Portabilidad:** Migraciones 100% compatibles entre SQLite y PostgreSQL gracias a convenciones de nombres explícitas y modo batch.
2. **Precisión Financiera:** Ausencia total de tipos flotantes en columnas contables, utilizando `DECIMAL(10,2)` y `DECIMAL(10,4)`.
3. **Inmutabilidad y No Repudio:** Blindaje de auditoría en ventas, facturas y cierres de turno mediante restricciones foráneas estrictas.
