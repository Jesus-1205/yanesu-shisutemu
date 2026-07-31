-- ============================================================================
-- Migración: Lectura de Facturas por IA (Human-in-the-Loop)
-- Rama: feat/ai-invoice-scanning
-- Fecha: 2026-07-28
-- ============================================================================

-- 1. Habilitar extensión pg_trgm para búsqueda difusa
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices GIN para búsqueda difusa en nombres
-- El operador % de pg_trgm requiere índices GIN con gin_trgm_ops
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre_trgm
    ON proveedores USING GIN (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm
    ON productos USING GIN (nombre gin_trgm_ops);

-- 3. Agregar campos de auditoría IA a facturas
ALTER TABLE facturas
    ADD COLUMN IF NOT EXISTS procesada_por_ia BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS raw_json_ia JSONB NULL;
