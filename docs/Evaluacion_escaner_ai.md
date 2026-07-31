# Evaluación de Precisión de Escáner / OCR - App

- **Fecha:** 30 de Julio de 2026
- **Muestra:** 11 Facturas (Muestra ajustada por facturas duplicadas)
- **Objetivo:** Medir precisión en la extracción de metadatos (encabezado) y detalle de ítems (productos/servicios).

---

## Métricas Globales (Resumen)

- **Facturas evaluadas:** 11 / 11
- **Precisión promedio en Metadatos:** 72.7%
- **Precisión promedio en Productos:** 87.3%
- **Errores recurrentes identificados:**
  1. **Alucinación de Proveedor (Fallback/Default):** Tendencia a inventar nombres como _"Distribuidora Andina C.A."_ o _"Comercializadora Central S.R.L."_ cuando el encabezado está tapado, recortado o en un sello central.
  2. **Detección de Divisa (USD vs. Bs):** Confusión recurrente en la moneda, en especial cuando el talonario físico impreso dice "Bs" pero la transacción real está expresada en USD.
  3. **Descalce Vertical en Tablas Largas:** Pérdida de alineación en renglones adyacentes, salto de filas tras líneas divisorias horizontales y omisión de atributos en columnas separadas (ej. volumen en `ml`).

---

## Detalle por Factura

### Factura #01

- **Metadata (75%):** Proveedor (✓) | Fecha (✓) | N° Factura (✓) | Moneda (✗ - Detectó Bs en lugar de $)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Extracción de productos impecable; falla únicamente en la identificación de la divisa ($ vs Bs).

---

### Factura #02

- **Metadata (75%):** Proveedor (✗ - Nombre confuso, ubicado dentro de un sello azul sobre los ítems) | Fecha (✓) | N° Factura (✓) | Moneda (✓)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Fallo en la extracción del proveedor por superposición del sello de PepsiCo sobre el cuerpo de la factura. Lectura de ítems perfecta.

---

### Factura #03

- **Metadata (75%):** Proveedor (✗ - Alucinación: leyó "Distribuidora Andina") | Fecha (✓) | N° Factura (✓) | Moneda (✓)
- **Productos (20%):** Nombre (✗) | Cajas (✗ - Confundió 15 cajas por 5) | Precio/Caja (✗)
- **Obs:** Formato largo vertical con fallas severas de descalce y lectura:
  1. Alucinación en nombre del proveedor.
  2. Omisión de volumen (ml) en 3 productos (columna separada no integrada).
  3. Desalineación de renglón tras línea divisoria (confundió Maltín por Sangría).
  4. Descalce de fila (asoció datos del renglón superior).
  5. Lectura errónea de cantidad (leyó 5 en lugar de 15 cajas).

---

### Factura #04

- **Metadata (75%):** Proveedor (✓) | Fecha (✓) | N° Factura (✓) | Moneda (✗ - Detectó USD en lugar de Bs)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Detección de divisa invertida ($ vs Bs). Extracción de ítems y metadatos restantes 100% precisa.

---

### Factura #05

- **Metadata (75%):** Proveedor (✗ - Misma alucinación: leyó "Distribuidora Andina") | Fecha (✓) | N° Factura (✓) | Moneda (✓)
- **Productos (40%):** Nombre (✗) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Mismo formato vertical que la Factura #03 con patrones de error idénticos:
  1. Reincidencia en la alucinación del proveedor ("Distribuidora Andina").
  2. Descalce vertical de filas: en 2 productos leyó el nombre de la fila inferior manteniendo cajas y precios correctos.

---

### Factura #06

- **Metadata (100%):** Proveedor (✓) | Fecha (✓) | N° Factura (✓) | Moneda (✓)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Extracción 100% precisa tanto en metadatos como en el detalle de ítems.

---

### Factura #07

- **Metadata (100%):** Proveedor (✓) | Fecha (✓) | N° Factura (✓) | Moneda (✓)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Extracción 100% perfecta y exacta en todos los campos.

---

### Factura #08

- **Metadata (75%):** Proveedor (✗ - Fallo en lectura de sello en el cuerpo de la factura) | Fecha (✓) | N° Factura (✓) | Moneda (✓)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Factura con maquetación confusa y de difícil lectura humana. El OCR omitió el nombre del proveedor ubicado en un sello central, pero logró procesar correctamente los ítems dentro de la estructura compleja.

---

### Factura #09

- **Metadata (25%):** Proveedor (✗ - Oculto por gancho en foto; alucinó "Distribuidora Andina") | Fecha (✗ - Completó día no visible: "7/7/2026" por "7/2026") | N° Factura (✓) | Moneda (✗ - Leyó Bs impreso en talonario, aunque el cobro real era en USD)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Dificultad por factores físicos e impresos:
  1. Gancho físico tapando el proveedor provocó alucinación reincidente.
  2. Autocompletado/alucinación de fecha ante día ilegible.
  3. Confusión de moneda por plantilla preimpresa en Bs utilizada para montos en USD.
  4. Extracción de productos impecable.

---

### Factura #10

- **Metadata (50%):** Proveedor (✗ - Alucinación: leyó "Comercializadora Central S.R.L." estando el nombre visible arriba al centro) | Fecha (✓) | N° Factura (✓) | Moneda (✗ - Detectó USD cuando era Bs)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Nueva alucinación de proveedor en encabezado claro y confusión de divisa (USD vs Bs). La extracción de ítems se mantuvo en 100%.

---

### Factura #11

- **Metadata (75%):** Proveedor (✗ - Visibilidad parcial/corte en foto; reincidió en alucinación "Distribuidora Andina C.A.") | Fecha (✓) | N° Factura (✓) | Moneda (✓)
- **Productos (100%):** Nombre (✓) | Cajas (✓) | Precio/Caja (✓)
- **Obs:** Reincidencia de alucinación del proveedor por oclusión parcial o recortes en la imagen de origen. Extracción de productos y resto de metadatos impecable.

---
