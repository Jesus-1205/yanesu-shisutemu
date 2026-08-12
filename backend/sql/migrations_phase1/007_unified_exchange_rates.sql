-- Migración: Tasas de cambio unificadas (USD + EUR en un solo registro)
-- Cambios en el modelo ExchangeRate:
--   1. Eliminar columna moneda (ENUM USD|EUR)
--   2. Eliminar columna tasa_ves
--   3. Agregar columna tasa_usd (DECIMAL 10,4)
--   4. Agregar columna tasa_eur (DECIMAL 10,4)
-- Nota: No se migran datos anteriores. Las tasas históricas se pierden.

-- Paso 1: Limpiar referencias en ventas (FK con ondelete SET NULL)
UPDATE ventas SET historico_tasa_id = NULL;

-- Paso 2: Desactivar foreign keys para poder dropear la tabla
PRAGMA foreign_keys = OFF;

-- Paso 3: Eliminar tabla vieja y recrear con nuevo esquema
DROP TABLE IF EXISTS historico_tasas;

CREATE TABLE historico_tasas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tasa_usd DECIMAL(10, 4) NOT NULL,
    tasa_eur DECIMAL(10, 4) NOT NULL,
    fecha_registro DATETIME DEFAULT (datetime('now', '-4 hours')),
    registrado_por INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Paso 4: Reactivar foreign keys
PRAGMA foreign_keys = ON;
