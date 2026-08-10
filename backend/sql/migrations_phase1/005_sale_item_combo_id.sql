-- Migración: Agregar combo_id a detalle_ventas
-- FASE 2 — Relaciona items de venta con el combo al que pertenecen

ALTER TABLE detalle_ventas ADD COLUMN combo_id INTEGER REFERENCES combos(id) ON DELETE SET NULL;
