-- ============================================================================
-- Esquema relacional - Sistema de Gestión de Inventario y Punto de Venta
-- Motor: PostgreSQL 16
-- Generado a partir de los modelos SQLAlchemy en backend/app/models/
-- NOTA: Schema referencial. La fuente de verdad son los modelos SQLAlchemy.
-- ============================================================================

CREATE TABLE roles (
    id            INT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(20)   NOT NULL,
    CONSTRAINT uq_roles_nombre UNIQUE (nombre)
);

CREATE TABLE users (
    id                INT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username          VARCHAR(50)   NOT NULL,
    email             VARCHAR(100)  NOT NULL,
    hashed_password   VARCHAR(255)  NOT NULL,
    nombre_completo   VARCHAR(100)  NOT NULL,
    rol_id            INT           NOT NULL,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

CREATE TABLE proveedores (
    id        INT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre    VARCHAR(100)  NOT NULL,
    telefono  VARCHAR(20),
    email     VARCHAR(100)
);

CREATE TABLE categorias (
    id            INT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(50)   NOT NULL,
    descripcion   VARCHAR(200),
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre)
);

CREATE TABLE producto_categoria (
    producto_id   INT NOT NULL,
    categoria_id  INT NOT NULL,
    PRIMARY KEY (producto_id, categoria_id),
    CONSTRAINT fk_pc_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pc_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

CREATE TABLE productos (
    id                  INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_barra        VARCHAR(50),
    nombre              VARCHAR(150)    NOT NULL,
    unidades_por_caja   INT             NOT NULL DEFAULT 1,
    stock_unidades      INT             NOT NULL DEFAULT 0,
    stock_minimo        INT             NOT NULL DEFAULT 5,
    precio_costo_caja_usd DECIMAL(10,2) NOT NULL,
    precio_costo_usd    DECIMAL(10,2)   NOT NULL,
    precio_unidad_usd   DECIMAL(12,4)   NOT NULL,
    precio_caja_usd     DECIMAL(12,4)   NOT NULL,
    proveedor_id        INT,
    tipo_iva            VARCHAR(10)     NOT NULL DEFAULT 'GRAVADO'
                        CHECK (tipo_iva IN ('GRAVADO', 'EXENTO')),
    CONSTRAINT uq_productos_codigo_barra UNIQUE (codigo_barra),
    CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

CREATE TABLE historico_tasas (
    id                INT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    moneda            VARCHAR(5)    NOT NULL CHECK (moneda IN ('USD', 'EUR')),
    tasa_ves          DECIMAL(10,4) NOT NULL,
    fecha_registro    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    registrado_por    INT,
    CONSTRAINT fk_historico_tasas_registrado_por FOREIGN KEY (registrado_por) REFERENCES users(id)
);

CREATE TABLE ventas (
    id                    INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_venta           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    usuario_id            INT             NOT NULL,
    tasa_bcv_aplicada     DECIMAL(10,4)   NOT NULL,
    historico_tasa_id     INT,
    monto_exento_usd      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    base_imponible_usd    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    monto_iva_usd         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    total_usd             DECIMAL(12,2)   GENERATED ALWAYS AS (monto_exento_usd + base_imponible_usd + monto_iva_usd) STORED,
    monto_exento_ves      DECIMAL(14,2)   GENERATED ALWAYS AS (ROUND(monto_exento_usd * tasa_bcv_aplicada, 2)) STORED,
    base_imponible_ves    DECIMAL(14,2)   GENERATED ALWAYS AS (ROUND(base_imponible_usd * tasa_bcv_aplicada, 2)) STORED,
    monto_iva_ves         DECIMAL(14,2)   GENERATED ALWAYS AS (ROUND(monto_iva_usd * tasa_bcv_aplicada, 2)) STORED,
    total_ves             DECIMAL(14,2)   GENERATED ALWAYS AS (total_usd * tasa_bcv_aplicada) STORED,
    CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT fk_ventas_historico_tasa FOREIGN KEY (historico_tasa_id) REFERENCES historico_tasas(id) ON DELETE SET NULL
);

CREATE INDEX idx_ventas_fecha_venta ON ventas (fecha_venta);

CREATE TABLE detalle_ventas (
    id                      INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id                INT             NOT NULL,
    producto_id             INT             NOT NULL,
    tipo_empaque            VARCHAR(10)     NOT NULL CHECK (tipo_empaque IN ('UNIDAD', 'CAJA')),
    cantidad                INT             NOT NULL,
    unidades_descontadas    INT             NOT NULL,
    precio_unitario_usd     DECIMAL(12,4)   NOT NULL,
    subtotal_usd            DECIMAL(12,2)   GENERATED ALWAYS AS (ROUND(cantidad * precio_unitario_usd, 2)) STORED,
    iva_porcentaje          DECIMAL(5,2)    NOT NULL DEFAULT 16.00,
    CONSTRAINT fk_detalle_ventas_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_ventas_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT ck_detalle_cantidad_positivo CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_unidades_positivo CHECK (unidades_descontadas > 0)
);

CREATE TABLE facturas (
    id                INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proveedor_id      INT             NOT NULL,
    numero_factura    VARCHAR(50)     NOT NULL,
    fecha_factura     DATE            NOT NULL,
    image_path        VARCHAR(255),
    usuario_id        INT             NOT NULL,
    observaciones     TEXT,
    moneda_principal  VARCHAR(3)      NOT NULL DEFAULT 'USD'
                      CHECK (moneda_principal IN ('USD', 'BS')),
    tasa_bs           DECIMAL(10,2)   NOT NULL,
    total_usd         DECIMAL(12,2)   NOT NULL,
    total_bs          DECIMAL(12,2)   NOT NULL,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_facturas_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
    CONSTRAINT fk_facturas_usuario FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_factura_por_proveedor UNIQUE (proveedor_id, numero_factura)
);

CREATE TABLE detalles_facturas (
    id                INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    factura_id        INT             NOT NULL,
    producto_id       INT             NOT NULL,
    cantidad_cajas    INT             NOT NULL,
    costo_caja_usd    DECIMAL(10,2)   NOT NULL,
    costo_caja_bs     DECIMAL(10,2)   NOT NULL,
    CONSTRAINT fk_df_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    CONSTRAINT fk_df_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    CONSTRAINT ck_df_cantidad_positivo CHECK (cantidad_cajas > 0),
    CONSTRAINT ck_df_costo_usd_positivo CHECK (costo_caja_usd > 0),
    CONSTRAINT ck_df_costo_bs_positivo CHECK (costo_caja_bs > 0)
);
