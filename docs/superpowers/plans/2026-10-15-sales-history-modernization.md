# Modernización del Historial de Ventas (Sales History Modernization)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar y elevar visualmente el Historial de Ventas (`/sales`) para que comparta el diseño limpio, profesional y refinado del módulo de Reportes (tarjetas KPI de resumen financiero, barra de filtros con presets rápidos de fecha, tabla estilizada con badges por método de pago, fecha/hora detallada, botón de acción visual y paginador con conteo de registros), sin romper la separación de responsabilidades ni alterar la lógica de negocio fundamental.

**Architecture:**
- **Backend Layer:** Extensión de `get_sales_paginated` en `backend/app/services/sale_service.py` y `backend/app/schemas/sale.py` para calcular en una única consulta SQL agregada `total_usd` y `total_ves` acumulados sobre los mismos filtros de búsqueda, retornándolos en `SalePaginationListOut` sin impacto de rendimiento.
- **Frontend State & Business Logic:** Actualización de `useSalesHistory.ts` para capturar los totales del servidor, calcular métricas de KPI (`totalVentas`, `totalUsd`, `totalVes`, `ticketPromedioUsd`) y dar soporte a selección rápida de presets de fecha (`Hoy`, `7 días`, `Este mes`, `Personalizado`).
- **Frontend Presentation:** Extracción y diseño de `SalesKpiCards.tsx`, modernización de `SalesFilters.tsx` (con presets rápidos y modo personalizado colapsable), y reestilización de `SalesTable.tsx` (incorporando encabezado de sección, renderizado de fecha + hora secundaria, badges coloreados de métodos de pago, botón `Eye` "Ver" y footer con `Mostrando X a Y de Z ventas` integrado con `Pagination`).
- **Orquestación:** `SalesPage.tsx` actúa como coordinador puro y limpio (<80 líneas).

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (`select`), Pydantic v2, SQLite, React 19, TypeScript 5.7, Tailwind CSS v4, Lucide React, Vitest, Testing Library.

---

## Global Constraints

- **Prohibido el uso de `any`** en cualquier archivo (regla de `frontend_rules.md`).
- **Decimales estrictos en Backend**: Cálculos monetarios en Python con `Decimal`, prohibido `float` (regla de `backend_rules.md`).
- **SQLAlchemy 2.0**: Usar sintaxis `select()`, prohibido `session.query()`.
- **Node & fnm en Windows**: Ejecutar comandos de Node anteponiendo en el mismo comando:
  `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;`
- **TDD Estricto**: Escribir pruebas unitarias antes de la implementación del hook y componentes de presentación.
- **No git push** ni git commit automáticos a menos que se solicite explícitamente.

---

## File Structure

```
Sistema_inventario/
├── backend/
│   ├── app/
│   │   ├── schemas/sale.py               # Extender SalePaginationListOut con total_usd y total_ves opcionales
│   │   ├── services/sale_service.py      # Agregar cálculo de sumas en get_sales_paginated
│   │   └── routes/sales.py               # Retornar total_usd y total_ves en endpoint paginado
│   └── tests/
│       └── test_sales_pagination_kpis.py # Test de validación de sumas agregadas en paginación
└── frontend/
    └── src/
        ├── types/api.ts                  # Actualizar SalePaginationListOut con total_usd y total_ves
        └── features/sales/
            ├── types.ts                  # Tipos SalesKpisData y presets
            ├── store/salesFiltersStore.ts# Persistencia de filtros
            ├── hooks/useSalesHistory.ts  # Captura de totales y cálculo de KPI
            ├── components/
            │   ├── SalesKpiCards.tsx     # NUEVO: 4 tarjetas KPI idénticas a Reportes
            │   ├── SalesFilters.tsx      # Barra con presets rápidos + inputs colapsables
            │   ├── SalesTable.tsx        # Tabla estilizada, badges, datetime y pie con conteo
            │   └── OperatorSalesNotice.tsx
            └── pages/
                └── SalesPage.tsx         # Orquestador refinado
```

---

## Task Breakdown

### Task 1: Backend - Totales Agregados en `get_sales_paginated`

**Files:**
- Modify: `backend/app/schemas/sale.py`
- Modify: `backend/app/services/sale_service.py`
- Modify: `backend/app/routes/sales.py`
- Test: `backend/tests/test_sales_pagination_kpis.py`

**Interfaces:**
- Consumes: SQLAlchemy `select`, `func`, modelo `Sale`
- Produces: `SalePaginationListOut` con campos `total_usd: Decimal` y `total_ves: Decimal`

- [ ] **Step 1: Escribir test en `backend/tests/test_sales_pagination_kpis.py` para verificar que la paginación retorne totales acumulados**

```python
import pytest
from datetime import datetime, timezone
from decimal import Decimal
from app.models.sale import Sale
from app.services.sale_service import get_sales_paginated

def test_get_sales_paginated_returns_aggregate_totals(db_session, test_user):
    # Crear 3 ventas de prueba
    v1 = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("10.00"),
        base_imponible_usd=Decimal("0.00"),
        iva_usd=Decimal("0.00"),
        total_usd=Decimal("10.00"),
        total_ves=Decimal("500.00"),
        fecha_venta=datetime.now(timezone.utc),
    )
    v2 = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("20.00"),
        base_imponible_usd=Decimal("0.00"),
        iva_usd=Decimal("0.00"),
        total_usd=Decimal("20.00"),
        total_ves=Decimal("1000.00"),
        fecha_venta=datetime.now(timezone.utc),
    )
    v3 = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("30.00"),
        base_imponible_usd=Decimal("0.00"),
        iva_usd=Decimal("0.00"),
        total_usd=Decimal("30.00"),
        total_ves=Decimal("1500.00"),
        fecha_venta=datetime.now(timezone.utc),
    )
    db_session.add_all([v1, v2, v3])
    db_session.commit()

    # Pedir página 1 con page_size=2 (para simular paginación parcial)
    res = get_sales_paginated(db_session, page=1, page_size=2)

    assert res["total"] == 3
    assert len(res["items"]) == 2
    assert res["total_usd"] == Decimal("60.00")
    assert res["total_ves"] == Decimal("3000.00")
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `pytest backend/tests/test_sales_pagination_kpis.py -v`
Expected: FAIL con `KeyError: 'total_usd'`

- [ ] **Step 3: Actualizar `backend/app/schemas/sale.py`, `backend/app/services/sale_service.py` y `backend/app/routes/sales.py`**

En `backend/app/schemas/sale.py`:
```python
class SalePaginationListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[SaleListOut]
    total: int
    total_usd: Decimal = Decimal("0")
    total_ves: Decimal = Decimal("0")
    page: int
    page_size: int
    pages: int
```

En `backend/app/services/sale_service.py`:
En `get_sales_paginated`, agregar la consulta agregada usando los mismos filtros:
```python
    sum_stmt = select(
        func.coalesce(func.sum(Sale.total_usd), Decimal("0")),
        func.coalesce(func.sum(Sale.total_ves), Decimal("0")),
    )
    if fecha_desde:
        ve_desde = _to_ve_boundary(fecha_desde)
        sum_stmt = sum_stmt.where(Sale.fecha_venta >= ve_desde)
    if fecha_hasta:
        ve_hasta = _to_ve_boundary(fecha_hasta, end_of_day=True)
        sum_stmt = sum_stmt.where(Sale.fecha_venta <= ve_hasta)
    if pm_filter is not None:
        sum_stmt = sum_stmt.where(pm_filter)
    if time_filter is not None:
        sum_stmt = sum_stmt.where(time_filter)

    sum_row = db.execute(sum_stmt).first()
    total_usd = sum_row[0] if sum_row else Decimal("0")
    total_ves = sum_row[1] if sum_row else Decimal("0")
```
Y retornar `total_usd` y `total_ves` en el diccionario devuelto.

En `backend/app/routes/sales.py` (líneas 80-96):
Pasar `total_usd=result["total_usd"]` y `total_ves=result["total_ves"]` a `SalePaginationListOut`.

- [ ] **Step 4: Ejecutar el test para verificar que pase**

Run: `pytest backend/tests/test_sales_pagination_kpis.py -v`
Expected: PASS

---

### Task 2: Frontend Types y Contrato de API

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/features/sales/types.ts`

**Interfaces:**
- Produces: `SalesKpisData` interface y soporte de campos en `SalePaginationListOut`

- [ ] **Step 1: Actualizar `frontend/src/types/api.ts` y `frontend/src/features/sales/types.ts`**

En `frontend/src/types/api.ts`:
```typescript
export interface SalePaginationListOut {
  items: SaleListOut[];
  total: number;
  total_usd?: number | string;
  total_ves?: number | string;
  page: number;
  page_size: number;
  pages: number;
}
```

En `frontend/src/features/sales/types.ts`:
```typescript
export interface SalesKpisData {
  totalVentas: number;
  totalUsd: number;
  totalVes: number;
  ticketPromedioUsd: number;
}

export type SalesDatePreset = "today" | "7d" | "this_month" | "all" | "custom";
```

- [ ] **Step 2: Verificar chequeo de tipos**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b`
Expected: PASS sin errores

---

### Task 3: Componente Presentacional `SalesKpiCards`

**Files:**
- Create: `frontend/src/features/sales/components/SalesKpiCards.tsx`
- Test: `frontend/src/__tests__/features/sales/components/SalesKpiCards.test.tsx`

**Interfaces:**
- Consumes: `SalesKpisData`
- Produces: `<SalesKpiCards totals={totals} loading={loading} />`

- [ ] **Step 1: Escribir test en `frontend/src/__tests__/features/sales/components/SalesKpiCards.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SalesKpiCards from "@/features/sales/components/SalesKpiCards";

describe("SalesKpiCards", () => {
  const sampleTotals = {
    totalVentas: 68,
    totalUsd: 298.17,
    totalVes: 256500.5,
    ticketPromedioUsd: 4.38,
  };

  it("renders metrics when loaded", () => {
    render(<SalesKpiCards totals={sampleTotals} loading={false} />);
    expect(screen.getByText("Ingresos (USD)")).toBeInTheDocument();
    expect(screen.getByText("$298,17")).toBeInTheDocument();
    expect(screen.getByText("68")).toBeInTheDocument();
    expect(screen.getByText("$4,38")).toBeInTheDocument();
  });

  it("renders skeletons when loading", () => {
    const { container } = render(<SalesKpiCards totals={sampleTotals} loading={true} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla (archivo no existe)**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/components/SalesKpiCards.test.tsx`
Expected: FAIL con `Cannot find module`

- [ ] **Step 3: Crear `frontend/src/features/sales/components/SalesKpiCards.tsx`**

```tsx
import { DollarSign, Banknote, ShoppingCart, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/ui-components/Skeleton";
import type { SalesKpisData } from "../types";

export interface SalesKpiCardsProps {
  totals: SalesKpisData;
  loading: boolean;
}

export default function SalesKpiCards({ totals, loading }: SalesKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total USD */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Ingresos (USD)</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <DollarSign className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.totalUsd)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Total facturado en el período</p>
        </div>
      </div>

      {/* Total VES */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Bolívares</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <Banknote className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.totalVes, "Bs ")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Equivalente en moneda nacional</p>
        </div>
      </div>

      {/* N° Transacciones */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">N° de Ventas</span>
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <ShoppingCart className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {totals.totalVentas.toLocaleString("es-VE")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Transacciones completadas</p>
        </div>
      </div>

      {/* Ticket Promedio */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Ticket Promedio</span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.ticketPromedioUsd)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Promedio facturado por venta</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/components/SalesKpiCards.test.tsx`
Expected: PASS

---

### Task 4: Modernización de `useSalesHistory`

**Files:**
- Modify: `frontend/src/features/sales/hooks/useSalesHistory.ts`
- Test: `frontend/src/__tests__/features/sales/hooks/useSalesHistory.test.ts`

**Interfaces:**
- Produces: `totals: SalesKpisData`, `totalSales: number`, `setPresetDates: (preset: SalesDatePreset) => void`

- [ ] **Step 1: Actualizar tests en `frontend/src/__tests__/features/sales/hooks/useSalesHistory.test.ts` para validar el cálculo de métricas**

Agregar aserciones para `result.current.totals` (`totalVentas`, `totalUsd`, `totalVes`, `ticketPromedioUsd`).

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/hooks/useSalesHistory.test.ts`
Expected: FAIL por falta de propiedad `totals`

- [ ] **Step 3: Actualizar `frontend/src/features/sales/hooks/useSalesHistory.ts`**

En `useSalesHistory.ts`:
- Guardar `totalSales`, `totalUsd`, `totalVes` del payload `api.getSalesPaginated`.
- Computar `totals: SalesKpisData` con `useMemo`:
  ```typescript
  const totals: SalesKpisData = useMemo(() => {
    const usd = Number(totalUsd) || 0;
    const ves = Number(totalVes) || 0;
    const count = totalSales || 0;
    return {
      totalVentas: count,
      totalUsd: usd,
      totalVes: ves,
      ticketPromedioUsd: count > 0 ? Math.round((usd / count) * 100) / 100 : 0,
    };
  }, [totalUsd, totalVes, totalSales]);
  ```
- Incorporar helper para aplicar presets rápidos:
  ```typescript
  const setPresetDates = useCallback((preset: SalesDatePreset) => {
    if (preset === "all") {
      setField("fechaDesde", "");
      setField("fechaHasta", "");
    } else if (preset === "today") {
      const today = new Date().toISOString().split("T")[0];
      setField("fechaDesde", today);
      setField("fechaHasta", today);
    } else if (preset === "7d") {
      const dates = getReportPresetDates("7d");
      setField("fechaDesde", dates.from);
      setField("fechaHasta", dates.to);
    } else if (preset === "this_month") {
      const dates = getReportPresetDates("this_month");
      setField("fechaDesde", dates.from);
      setField("fechaHasta", dates.to);
    }
    setField("page", 1);
  }, [setField]);
  ```
- Retornar `totals`, `totalSales`, `setPresetDates`.

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/hooks/useSalesHistory.test.ts`
Expected: PASS

---

### Task 5: Modernización de la Barra de Filtros `SalesFilters`

**Files:**
- Modify: `frontend/src/features/sales/components/SalesFilters.tsx`
- Test: `frontend/src/__tests__/features/sales/components/SalesFilters.test.tsx`

**Interfaces:**
- Consumes: `useSalesFiltersStore`, `useSalesPaymentMethods`
- Produces: `<SalesFilters onPresetChange?: (preset: SalesDatePreset) => void />`

- [ ] **Step 1: Escribir/actualizar tests en `frontend/src/__tests__/features/sales/components/SalesFilters.test.tsx`**

Comprobar que se renderizan los botones de presets rápidos (`Hoy`, `Últimos 7 días`, `Este mes`, `Personalizado`), y que al hacer click se aplican o se despliega el panel de fecha personalizada.

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/components/SalesFilters.test.tsx`
Expected: FAIL

- [ ] **Step 3: Actualizar `frontend/src/features/sales/components/SalesFilters.tsx`**

Diseño moderno con píldoras de presets rápidos (estilo Reportes) en la parte superior, botón para alternar filtros avanzados/personalizados (fechas exactas y horas desde/hasta), selector de método de pago con `MultiSelectTags` y botón "Limpiar filtros" sutil con icono o texto accesible.

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/components/SalesFilters.test.tsx`
Expected: PASS

---

### Task 6: Modernización y Enriquecimiento de `SalesTable`

**Files:**
- Modify: `frontend/src/features/sales/components/SalesTable.tsx`
- Test: `frontend/src/__tests__/features/sales/components/SalesTable.test.tsx`

**Interfaces:**
- Consumes: `SaleListItem[]`, `totalRows: number`, `page: number`, `totalPages: number`, `pageSize: number`, `onPageChange`
- Produces: `<SalesTable ... />` con card container, badge styling, datetime formateado, botón de acción con icono `Eye` y footer con conteo `Mostrando X a Y de Z ventas`.

- [ ] **Step 1: Escribir tests en `frontend/src/__tests__/features/sales/components/SalesTable.test.tsx`**

Probar:
- Renderizado de fecha y hora separadas.
- Renderizado de badges con clases de método de pago (ej. Punto de venta, Pago móvil, Divisas).
- Renderizado de botón de acción "Ver" con icono `Eye`.
- Renderizado del footer mostrando `Mostrando 1 a 20 de 68 ventas` cuando `totalRows > 0`.

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/components/SalesTable.test.tsx`
Expected: FAIL

- [ ] **Step 3: Actualizar `frontend/src/features/sales/components/SalesTable.tsx`**

- Formateo de fecha: día y mes legibles (ej. `9 Oct 2026`) en línea superior y hora en línea inferior con texto sutil (`14:30`).
- Badges dinámicos para `metodo_pago`:
  - `divisas` / `usd` -> `bg-emerald-50 text-emerald-700 border border-emerald-100`
  - `punto de venta` -> `bg-blue-50 text-brand-blue border border-blue-100`
  - `pago móvil` -> `bg-purple-50 text-purple-700 border border-purple-100`
  - `efectivo` -> `bg-amber-50 text-amber-700 border border-amber-100`
  - fallback -> `bg-slate-100 text-slate-700`
- Botón de acción:
  `<Button variant="ghost" size="sm" onClick={() => onViewSale(s.id)} className="gap-1 text-xs text-brand-blue hover:bg-blue-50"> <Eye className="size-3.5" /> Ver </Button>`
- Footer con conteo y paginador:
  ```tsx
  {totalRows > 0 && (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 p-4 bg-slate-50/50">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}</span> a{" "}
        <span className="font-semibold text-slate-700">{Math.min(page * pageSize, totalRows)}</span> de{" "}
        <span className="font-semibold text-slate-700">{totalRows}</span> ventas
      </p>
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )}
  ```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/components/SalesTable.test.tsx`
Expected: PASS

---

### Task 7: Orquestación Final en `SalesPage.tsx` y Tests Integrados

**Files:**
- Modify: `frontend/src/features/sales/pages/SalesPage.tsx`
- Test: `frontend/src/__tests__/features/sales/SalesPage.test.tsx`

**Interfaces:**
- Consumes: `useSalesHistory`, `SalesKpiCards`, `SalesFilters`, `SalesTable`, `OperatorSalesNotice`
- Produces: Página completa `/sales` con layout estilizado e integrado.

- [ ] **Step 1: Actualizar tests en `frontend/src/__tests__/features/sales/SalesPage.test.tsx`**

Verificar que:
- Se rendericen las tarjetas de KPI con los totales del hook.
- Se renderice la barra de filtros (o notice para operador).
- Se renderice la tabla y el botón de exportar Excel.

- [ ] **Step 2: Ejecutar el test para comprobar que pasa o falla según los cambios**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/SalesPage.test.tsx`

- [ ] **Step 3: Actualizar `frontend/src/features/sales/pages/SalesPage.tsx`**

Integrar armónicamente:
1. `PageHeader` (con título "Ventas", descripción "Historial de ventas del sistema", botones "Descargar Excel" y "+ Nueva Venta").
2. `SalesKpiCards` (con `totals` y `loading`).
3. Tarjeta contenedora con sombra suave (`rounded-2xl border border-slate-200 bg-white shadow-xs`):
   - Filtros (`isOperator ? <OperatorSalesNotice /> : <SalesFilters />`).
   - `SalesTable` con `sales`, `loading`, `totalRows={totalSales}`, `page`, `totalPages`, `pageSize={PAGE_SIZE}`, `onPageChange={handlePageChange}` y `onViewSale`.

- [ ] **Step 4: Ejecutar los tests de SalesPage**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales/SalesPage.test.tsx`
Expected: PASS

---

### Task 8: Verificación Global de la Suite

- [ ] **Step 1: Ejecutar la suite completa de tests de ventas en frontend**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/sales`
Expected: Todos los tests pasando (PASS).

- [ ] **Step 2: Ejecutar chequeo estricto de tipos de TypeScript en frontend**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b`
Expected: 0 errores de TypeScript.

- [ ] **Step 3: Ejecutar tests de backend para verificar consistencia**

Run: `pytest backend/tests/test_sales.py backend/tests/test_sales_pagination_kpis.py -v`
Expected: Todos los tests pasando (PASS).
