-- Migración: Agregar stock_cajas a productos
-- FASE 3 — Separar stock en cajas selladas y unidades sueltas

ALTER TABLE productos ADD COLUMN stock_cajas INTEGER NOT NULL DEFAULT 0;
