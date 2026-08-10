-- Migración: Reglas de precio por método de pago (divisas)
-- FASE 1 — Tablas: price_rules, price_rule_products, price_rule_payment_methods
--
-- Propósito:
--   Una regla agrupa N productos con un precio fijo en USD cuando el
--   pago se realiza con ciertos métodos de pago (ej: ZELLE, EFECTIVO USD).
--   Si el producto tiene descuento divisas, el 100% de ese item debe
--   pagarse con alguno de los métodos asociados a la regla.

CREATE TABLE IF NOT EXISTS price_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS price_rule_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regla_id INTEGER NOT NULL REFERENCES price_rules(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo_empaque VARCHAR(10) NOT NULL CHECK (tipo_empaque IN ('UNIDAD', 'CAJA')),
    precio_usd DECIMAL(12, 2) NOT NULL,
    UNIQUE(regla_id, producto_id, tipo_empaque)
);

CREATE TABLE IF NOT EXISTS price_rule_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regla_id INTEGER NOT NULL REFERENCES price_rules(id) ON DELETE CASCADE,
    metodo_pago_id INTEGER NOT NULL REFERENCES metodos_pago(id) ON DELETE RESTRICT,
    UNIQUE(regla_id, metodo_pago_id)
);

-- Ejemplo de inserción:
-- INSERT INTO price_rules (nombre, descripcion) VALUES ('Divisas Cerveza', 'Precio especial en divisas para latas');
-- INSERT INTO price_rule_products (regla_id, producto_id, tipo_empaque, precio_usd) VALUES (1, 1, 'UNIDAD', 1.00);
-- INSERT INTO price_rule_products (regla_id, producto_id, tipo_empaque, precio_usd) VALUES (1, 2, 'UNIDAD', 1.00);
-- INSERT INTO price_rule_payment_methods (regla_id, metodo_pago_id) VALUES (1, 3);
-- INSERT INTO price_rule_payment_methods (regla_id, metodo_pago_id) VALUES (1, 4);
