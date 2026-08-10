-- Migración: Tablas para combos y promociones
-- FASE 2 — Tablas: combos, combo_groups, combo_group_products, combo_payment_methods

CREATE TABLE IF NOT EXISTS combos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_total_usd DECIMAL(12, 2) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS combo_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    combo_id INTEGER NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    min_cantidad INTEGER NOT NULL DEFAULT 0,
    max_cantidad INTEGER NOT NULL,
    CHECK (min_cantidad >= 0),
    CHECK (max_cantidad > 0),
    CHECK (min_cantidad <= max_cantidad)
);

CREATE TABLE IF NOT EXISTS combo_group_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL REFERENCES combo_groups(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    UNIQUE(grupo_id, producto_id)
);

CREATE TABLE IF NOT EXISTS combo_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    combo_id INTEGER NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    metodo_pago_id INTEGER NOT NULL REFERENCES metodos_pago(id) ON DELETE RESTRICT,
    UNIQUE(combo_id, metodo_pago_id)
);
