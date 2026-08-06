-- Agregar columna es_favorito a la tabla productos
-- Los productos existentes tendran es_favorito = FALSE por defecto

ALTER TABLE productos ADD COLUMN es_favorito BOOLEAN NOT NULL DEFAULT FALSE;

-- Indice parcial para consultas rapidas de favoritos
CREATE INDEX idx_productos_es_favorito ON productos(es_favorito) WHERE es_favorito = TRUE;
