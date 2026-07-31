# Especificación Técnico-Funcional: Estructura Analítica y UI/UX (`/dashboard`, CRUDs y `/reportes`)

Este documento define la arquitectura visual, la jerarquía de información, las preguntas de negocio clave y las visualizaciones requeridas para cada sección del sistema.

---

## Estado de Implementación (Junio 2026)

| Módulo | Ruta Actual | Estado | Notas |
|---|---|---|---|
| Dashboard | `/dashboard` | ✅ Implementado (parcial) | KPIs + tablas simples. Sin gráficas (AreaChart, BarChart). |
| Categorías | `/categories` | ✅ Implementado (CRUD básico) | Tabla CRUD sin micro-KPIs ni drawer analítico. |
| Proveedores | `/suppliers` | ✅ Implementado (CRUD básico) | Tabla CRUD sin micro-KPIs ni drawer analítico. |
| Reportes | `/reports` | ✅ Implementado | 4 pestañas con tablas. Filtros por fecha. Sin gráficas. |

> **Nota:** Las rutas del proyecto son `/categories`, `/suppliers`, `/reports` (no `/inventario/categorias`, `/inventario/proveedores`, `/finanzas/reportes`).

---

## 1. Módulo `/dashboard` (Centro de Mando Operativo)

* **Filosofía UI:** Visibilidad instantánea (*At-a-glance*). Responde al estado actual del negocio en el día/semana sin cargar datos de archivo profundos.

### A. Elementos y Contenido UI — ✅ IMPLEMENTADO

* **Top KPIs (6 Tarjetas — `StatCard`):**
  1. *Productos:* Conteo total de productos activos.
  2. *Categorías:* Conteo total de categorías registradas.
  3. *Proveedores:* Conteo total de proveedores activos.
  4. *Sin stock:* Conteo de productos con `stock_unidades === 0`. Resaltado dinámico con `variant="danger"` si es `> 0`.
  5. *Ventas semanal:* Monto total en USD del período semanal actual.
  6. *Mejor semana:* Cifra histórica de referencia (récord).

  > **Nota:** El componente `StatCard` soporta prop `trend` con dirección `up`/`down` y valor string. Actualmente no se usa en el Dashboard.

* **Cuerpo Principal (grid 2 cols):**
  * Resumen de Ventas (semanal): Barras horizontales con proporción visual.
  * Productos más vendidos: Tabla con nombre y cantidad vendida.

* **Cuerpo Inferior (grid 2 cols):**
  * Mayor margen: Tabla de productos con mayor margen bruto (costo vs. venta).
  * Menor rotación: Tabla de productos con menor volumen de ventas.

### B. Preguntas de Negocio que Responde
1. ¿Cómo van las ventas de esta semana en comparación con el desempeño reciente? ✅
2. ¿Hay productos agotados que estén haciendo perder ventas en este momento? ✅
3. ¿Cuáles son los 5 productos que están moviendo el flujo de caja diario? ✅
4. ¿Qué mercancía lleva demasiado tiempo estancada en el inventario? ✅

### C. Gráficas y Visualizaciones — ❌ PENDIENTE (Backlog)

* **Gráfica 1: Tendencia de Ventas Diarias**
  * **Tipo:** `AreaChart` (Línea suave con degradado inferior).
  * **Ejes:** Eje X = Días de la semana (Lun - Dom); Eje Y = Monto ($ USD).
  * **Propósito:** Mostrar la fluctuación diaria e identificar días pico de venta.
* **Gráfica 2: Top 5 Productos Más Vendidos**
  * **Tipo:** `HorizontalBarChart` (Barras Horizontales).
  * **Ejes:** Eje X = Cantidad vendida (Unidades); Eje Y = Nombre del Producto.
  * **Propósito:** Evitar el solapamiento de nombres de productos largos y permitir comparación rápida de volumen.

### D. Layout Propuesto (Backlog)

```
┌─────────────────────────────────────────────────────────────┐
│  [KPI1] [KPI2] [KPI3] [KPI4] [KPI5] [KPI6]               │
├──────────────────────────────┬──────────────────────────────┤
│  AreaChart: Tendencia (8col) │  HorizontalBarChart (4col)   │
├──────────────────────────────┴──────────────────────────────┤
│  Tabla: Productos de Menor Rotación / Bajo Margen           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Módulo `/categories` (CRUD + Micro-KPIs + Drawer Analítico)

* **Filosofía UI:** Transaccionalidad ágil en la vista principal con analítica contextual bajo demanda (lazy loaded).

### A. Elementos y Contenido UI — ✅ IMPLEMENTADO (CRUD básico)

* **Data Table Principal (CRUD):**
  * Columnas actuales: `ID`, `Nombre`, `Descripción`, `Acciones (Editar/Eliminar)`.
  * Componente: `Table` reutilizable de `@/ui-components/Table`.
  * Acciones: Navegación a formulario de edición (`/categories/:id`), eliminación con `ConfirmDialog`.

* **Formulario CRUD:**
  * Ruta: `/categories/new` (crear), `/categories/:id` (editar).
  * Componente: `CategoryFormPage.tsx`.

* **Tipos disponibles en `types/api.ts`:**
  * `CategoryOut` — respuesta de la API (id, nombre, descripcion).
  * `CategoryCreate` / `CategoryUpdate` — payloads de escritura.
  * `CategoryAnalyticsOut` — analytics por categoría (total_productos, stock_total, margen_promedio, unidades_vendidas, ingresos_usd).
  * `CategoryAnalyticsResponse` — respuesta agregada de analytics de todas las categorías.

### B. Preguntas de Negocio que Responde
1. ¿Cuáles son las categorías que sostienen la facturación del negocio? ✅ (en módulo Reportes)
2. ¿Tengo categorías con demasiados productos registrados que casi no aportan volumen? ❌ Pendiente
3. ¿Cómo ha variado la venta de una categoría específica (ej. "Rones") en los últimos meses? ❌ Pendiente

### C. Gráficas y Visualizaciones — ❌ PENDIENTE (Backlog)

* **Micro-KPIs Superiores (3 Tarjetas horizontales compactas):**
  1. *Categoría Líder:* Nombre de la categoría más vendida del mes + Monto.
  2. *Categoría de Mayor Margen:* Categoría con el `%` de ganancia más alto.
  3. *Total Ítems Activos:* Conteo global de productos categorizados.

* **Drawer Lateral / Slide-over (Analítica por Categoría):**
  * Se despliega al hacer clic en una fila.
  * Endpoint: `GET /api/v1/categories/{id}/analytics` (ya implementado en backend).
  * Servicio frontend: `api.getCategoryAnalytics()` (ya implementado).

* **Gráfica 1 (Dentro del Drawer Lateral): Evolución de Ventas de la Categoría**
  * **Tipo:** `LineChart` o `BarChart`.
  * **Ejes:** Eje X = Meses/Semanas; Eje Y = USD Generados.
  * **Propósito:** Analizar la estacionalidad de una categoría específica.

* **Gráfica 2 (Dentro del Drawer Lateral): Participación de Productos en la Categoría**
  * **Tipo:** `DonutChart` (Gráfico de Dona).
  * **Métrica:** Porcentaje de ventas que representa cada producto dentro de esa categoría específica.
  * **Propósito:** Identificar si la categoría depende de un solo producto o si las ventas están distribuídas.

---

## 3. Módulo `/suppliers` (CRUD + Micro-KPIs + Drawer Analítico)

* **Filosofía UI:** Control de la cadena de suministro, facturación pendiente y evaluación de proveedores.

### A. Elementos y Contenido UI — ✅ IMPLEMENTADO (CRUD básico)

* **Data Table Principal (CRUD):**
  * Columnas actuales: `ID`, `Nombre`, `Teléfono`, `Email`, `Acciones (Editar/Eliminar)`.
  * Componente: `Table` reutilizable de `@/ui-components/Table`.
  * Acciones: Navegación a formulario de edición (`/suppliers/:id`), eliminación con `ConfirmDialog`.

* **Formulario CRUD:**
  * Ruta: `/suppliers/new` (crear), `/suppliers/:id` (editar).
  * Componente: `SupplierFormPage.tsx`.

* **Tipos disponibles en `types/api.ts`:**
  * `SupplierOut` — respuesta de la API (id, nombre, telefono, email).
  * `SupplierCreate` / `SupplierUpdate` — payloads de escritura.
  * `SupplierAnalyticsOut` — analytics por proveedor (total_productos, stock_total, margen_promedio, unidades_vendidas, ingresos_usd).
  * `SupplierAnalyticsResponse` — respuesta agregada de analytics de todos los proveedores.

### B. Preguntas de Negocio que Responde
1. ¿A qué proveedor le estamos comprando más mercancía? ✅ (en módulo Reportes)
2. ¿Qué margen de ganancia promedio nos dejan los productos comprados a X proveedor? ✅ (en módulo Reportes)
3. ¿Qué productos de determinado proveedor tienen baja rotación y no deberíamos volver a pedir en cantidad? ❌ Pendiente

### C. Gráficas y Visualizaciones — ❌ PENDIENTE (Backlog)

* **Micro-KPIs Superiores (3 Tarjetas):**
  1. *Proveedor Principal:* Proveedor con mayor volumen de compra en el mes.
  2. *Compras Totales (Mes):* Monto gastado en reposición de inventario.
  3. *Cuentas / Facturas Pendientes:* Alerta de pagos a proveedores o facturas por saldar.

* **Drawer Lateral / Slide-over (Analítica por Proveedor):**
  * Se activa al seleccionar un proveedor específico.
  * Endpoint: `GET /api/v1/suppliers/{id}/analytics` (ya implementado en backend).
  * Servicio frontend: `api.getSupplierAnalytics()` (ya implementado).

* **Gráfica 1 (Dentro del Drawer Lateral): Rendimiento de Productos del Proveedor**
  * **Tipo:** `HorizontalBarChart`.
  * **Ejes:** Eje X = Unidades vendidas; Eje Y = Productos suministrados por el proveedor.
  * **Propósito:** Saber qué productos de ese catálogo específico valen la pena reordenar.

* **Gráfica 2 (Dentro del Drawer Lateral): Relación Costo vs. Ganancia Generada**
  * **Tipo:** `ComposedChart` (Barras Agrupadas: Inversión en Compras vs. Retorno en Ventas).
  * **Propósito:** Visualizar el retorno de inversión (ROI) directo por comercializadora.

---

## 4. Módulo `/reports` (Business Intelligence / Analítica Profunda)

* **Filosofía UI:** Análisis estratégico e histórico para el dueño/administrador. Utiliza filtros de rango de fechas.

### A. Elementos y Contenido UI — ✅ IMPLEMENTADO

* **Filtros (Drawer lateral):**
  * Fecha desde (input type="date").
  * Fecha hasta (input type="date").
  * Agrupar por: Diario, Semanal, Quincenal, Mensual, Trimestral, Semestral.
  * Límite por tabla: 5, 10, 20, 50.
  * Componente: `Drawer` + `Input` + `Select`.

* **Pestañas de Navegación Interna (4 tabs — `Tabs`):**
  * `[Resumen]` — Resumen de ventas, top semana, top vendidos.
  * `[Productos]` — Más vendidos, mayor margen, menor margen, menor rotación.
  * `[Categorías]` — Analytics completo de categorías (6 KPIs + tablas).
  * `[Proveedores]` — Analytics completo de proveedores (6 KPIs + tablas).

* **Tipos disponibles en `types/api.ts` y `features/reports/types.ts`:**
  * `SalesSummaryItem` — resumen de ventas por período.
  * `CategoryAnalyticsOut` / `CategoryAnalyticsResponse` — analytics de categorías.
  * `SupplierAnalyticsOut` / `SupplierAnalyticsResponse` — analytics de proveedores.

### B. Preguntas de Negocio que Responde por Pestaña

#### Pestaña 1: Resumen ✅
* **Preguntas:** ¿Cuál es la rentabilidad neta del negocio en el periodo seleccionado? ¿Cómo se comparan los ingresos brutos vs. el costo de los bienes vendidos (COGS)?
* **Estado actual:** Tabla de resumen de ventas + KPIs básicos. Sin gráfica ComposedChart.

#### Pestaña 2: Productos ✅
* **Preguntas:** ¿Qué productos son "Estrella" (Alto margen, Alta rotación) y cuáles son "Hueso/Riesgo" (Bajo margen, Baja rotación)?
* **Estado actual:** 4 tablas (Más Vendidos, Mayor Margen, Menor Margen, Menor Rotación). Sin ScatterChart.

#### Pestaña 3: Categorías ✅
* **Preguntas:** ¿Qué porcentaje del mercado/ventas internas representa cada categoría?
* **Estado actual:** 6 KPIs + 4 tablas (Top Ventas, Bajas Ventas, Mayor Margen, Menor Margen) + tabla detalle. Sin DonutChart.

#### Pestaña 4: Proveedores ✅
* **Preguntas:** ¿Qué proveedores concentran el mayor riesgo de inventario estancado?
* **Estado actual:** 6 KPIs + 4 tablas (Top Ventas, Bajas Ventas, Mayor Margen, Menor Margen) + tabla detalle. Sin BarChart agrupado.

### C. Gráficas y Visualizaciones — ❌ PENDIENTE (Backlog)

* **Gráfica 1 (Pestaña Resumen):** `ComposedChart` (Línea + Barras) de **Ventas vs. Costos vs. Margen Bruto**.
* **Gráfica 2 (Pestaña Productos):** `ScatterChart` (Gráfico de Dispersión / Matriz de Rentabilidad). Eje X = Rotación; Eje Y = Margen %; Tamaño = Ventas en $.
* **Gráfica 3 (Pestaña Categorías):** `DonutChart` de **Cuota de Ventas por Categoría**.
* **Gráfica 4 (Pestaña Proveedores):** `BarChart` Agrupado comparando **Monto Comprado a Proveedor vs. Monto Facturado en Ventas**.

---

## Estándares Visuales (Actuales del Proyecto)

El proyecto utiliza **tokens de diseño personalizados** definidos en `index.css` (no clases raw de Tailwind como `bg-white dark:bg-slate-900`).

### Tokens de Color (CSS Custom Properties)

| Token | Valor | Uso |
|---|---|---|
| `--color-brand-blue` | `#1E40AF` | Color principal de marca |
| `--color-accent-orange` | `#EA580C` | Acento naranja |
| `--color-background` | `#F8FAFC` | Fondo general |
| `--color-surface` | `#FFFFFF` | Superficies (cards, header) |
| `--color-text-main` | `#0F172A` | Texto principal |
| `--color-success` | `#16A34A` | Verde (éxito, tendencias positivas) |
| `--color-danger` | `#DC2626` | Rojo (peligro, stock agotado) |
| `--color-info` | `#2563EB` | Azul (informativo) |

### Clases Tailwind del Proyecto

* **Tarjetas / Superficies:** `bg-surface rounded-xl border border-slate-200 p-5`
* **Textos Métrica (StatCard):** `text-2xl font-bold text-text-main`
* **Labels / Subtextos:** `text-sm font-medium text-slate-500`
* **Color Semántico:**
  * `success` (verde): Ganancias, tendencias positivas, estados saludables.
  * `danger` (rojo): Pérdidas, stock agotado (`0 uds`), margen crítico.
  * `info` (azul): Referencia informativa.
  * `accent` (naranja): Botones de acción principal.

### Componentes UI Reutilizables Disponibles

| Componente | Archivo | Uso en especificación |
|---|---|---|
| `StatCard` | `ui-components/StatCard.tsx` | KPIs del Dashboard, Reportes. Soporta `trend` y `variant`. |
| `Table` | `ui-components/Table.tsx` | Todas las tablas de datos. |
| `Drawer` | `ui-components/Drawer.tsx` | Filtros de Reportes. Pendiente para drawers analíticos. |
| `Tabs` | `ui-components/Tabs.tsx` | Navegación por pestañas en Reportes. |
| `Badge` | `ui-components/Badge.tsx` | Estados de stock, roles. |
| `Button` | `ui-components/Button.tsx` | Acciones CRUD. Variantes: `accent`, `ghost`, `outline`. |
| `PageHeader` | `ui-components/PageHeader.tsx` | Encabezados de página con título y acciones. |
| `ConfirmDialog` | `ui-components/ConfirmDialog.tsx` | Confirmación de eliminación. |
| `ErrorBanner` | `ui-components/ErrorBanner.tsx` | Errores de carga con retry. |
| `Spinner` | `ui-components/Spinner.tsx` | Estados de carga. |
| `Skeleton` | `ui-components/Skeleton.tsx` | Skeleton loading (Skeleton, SkeletonText, SkeletonCard). |
| `Select` | `ui-components/Select.tsx` | Selectores de filtro. |
| `Input` | `ui-components/Input.tsx` | Campos de formulario y filtro. |
| `SearchInput` | `ui-components/SearchInput.tsx` | Búsqueda en tablas. |
| `Toast` | `ui-components/Toast.tsx` | Notificaciones (ToastProvider + useToast). |
| `Modal` | `ui-components/Modal.tsx` | Modales de formulario. |

---

## Backlog de Mejoras (Por Implementar)

### Prioridad Alta

| # | Módulo | Mejora | Dependencias |
|---|---|---|---|
| 1 | Dashboard | **AreaChart** de Tendencia de Ventas Diarias | Instalar librería de gráficas (recharts, nivo, o similar) |
| 2 | Dashboard | **HorizontalBarChart** Top 5 Productos Más Vendidos | Misma librería de gráficas |
| 3 | Categorías | **Micro-KPIs** (Categoría Líder, Mayor Margen, Total Ítems) | Endpoint ya existe |
| 4 | Categorías | **Drawer Analítico** por categoría con gráficas | Endpoint `getCategoryAnalytics` ya existe |

### Prioridad Media

| # | Módulo | Mejora | Dependencias |
|---|---|---|---|
| 5 | Proveedores | **Micro-KPIs** (Proveedor Principal, Compras Totales, Facturas Pendientes) | Puede requerir nuevo endpoint |
| 6 | Proveedores | **Drawer Analítico** por proveedor con gráficas | Endpoint `getSupplierAnalytics` ya existe |
| 7 | Reportes | **ScatterChart** Matriz de Rentabilidad (Pestaña Productos) | Instalar librería de gráficas |
| 8 | Reportes | **DonutChart** Cuota de Ventas por Categoría (Pestaña Categorías) | Instalar librería de gráficas |

### Prioridad Baja

| # | Módulo | Mejora | Dependencias |
|---|---|---|---|
| 9 | Reportes | **ComposedChart** Ventas vs. Costos vs. Margen (Pestaña Resumen) | Instalar librería de gráficas |
| 10 | Reportes | **BarChart** Agrupado Compras vs. Ventas (Pestaña Proveedores) | Instalar librería de gráficas |
| 11 | Reportes | **DateRangePicker** reemplazar inputs de fecha | Evaluar librería (react-datepicker, etc.) |
| 12 | Global | **Dark Mode** soporte completo | Configurar Tailwind dark mode + tokens |
| 13 | Categorías | Columna `% Aporte a Ventas` en tabla principal | Calcular o consumir de API |
| 14 | Proveedores | Columnas `SKUs Suministrados` y `Última Compra` | Puede requerir nuevo endpoint |

### Decisión Técnica Pendiente: Librería de Gráficas

El proyecto actualmente **no incluye ninguna librería de gráficas**. Opciones recomendadas:

| Librería | Pros | Contras |
|---|---|---|
| **Recharts** | Popular, API declarativa, buenas docs | Bundle size mediano |
| **Nivo** | Visualmente premium, muchos wrappers | Más pesado, curva de aprendizaje |
| **Chart.js + react-chartjs-2** | Ligero, muy maduro | Menos declarativo, más imperative |
| **Victory** | React-native friendly | Menos adoptado en web |

> **Recomendación:** `Recharts` por madurez, adopción comunitaria y compatibilidad con React 19.