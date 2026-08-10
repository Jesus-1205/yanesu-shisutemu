-- Migración: Agregar columna usa_precio_divisas a detalle_ventas
-- FASE 1 — Campo para indicar si un item se vendió con precio en divisas

ALTER TABLE detalle_ventas ADD COLUMN usa_precio_divisas BOOLEAN NOT NULL DEFAULT 0;
