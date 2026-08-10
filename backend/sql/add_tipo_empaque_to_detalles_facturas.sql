-- Migración completa de detalles_facturas
-- Cambios realizados en el modelo SQLAlchemy:
--   1. Renombrar cantidad_cajas → cantidad
--   2. Renombrar costo_caja_usd → costo_unitario_usd
--   3. Renombrar costo_caja_bs → costo_unitario_bs
--   4. Agregar columna tipo_empaque (UNIDAD o CAJA)

-- Paso 1: Renombrar columnas
ALTER TABLE detalles_facturas RENAME COLUMN cantidad_cajas TO cantidad;
ALTER TABLE detalles_facturas RENAME COLUMN costo_caja_usd TO costo_unitario_usd;
ALTER TABLE detalles_facturas RENAME COLUMN costo_caja_bs TO costo_unitario_bs;

-- Paso 2: Agregar columna tipo_empaque (default CAJA para registros existentes)
ALTER TABLE detalles_facturas ADD COLUMN tipo_empaque VARCHAR(10) NOT NULL DEFAULT 'CAJA';
