# Refactor de ReportsProductsPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar el "God Component" `ReportsProductsPage.tsx` (474 líneas) separando la lógica y fetching en un custom hook (`useProductsReport`), la presentación en 4 componentes puros (`ProductsKpiCards`, `ProductsToolbar`, `ProductsChartSection`, `ProductsTable`), y reduciendo la página principal a un orquestador limpio de ~85 líneas siguiendo TDD sin romper los 9 tests de integración existentes.

**Architecture:** 
- Hook de negocio `useProductsReport`: gestiona llamada a API con flag de cancelación, cálculo de micro-KPIs (unidades, líder, margen promedio, sin rotación), conversión monetaria (USD/VES) con redondeo financiero estricto a 2 decimales, filtrado por sub-pestañas y paginación.
- Componentes puros de presentación: reciben datos primitivos/tipados y callbacks vía props estrictos sin `any`.
- Orquestador `ReportsProductsPage`: lee search params de URL, coordina estados visuales (`viewMode`, `chartMode`, `tableTab`, `page`), invoca el hook, y distribuye props a los componentes de presentación.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Vitest, Testing Library, Lucide React, Recharts.

## Global Constraints

- **Prohibido el uso de `any`** en cualquier archivo (regla estricta de `frontend_rules.md`).
- **Redondeo monetario**: `Math.round(val * 100) / 100` en todas las operaciones financieras.
- **Formateo**: usar `formatCurrency` de `@/lib/utils` para montos y `toLocaleString("es-VE")` para números enteros.
- **Preservar contratos y UI copy**: los 9 tests existentes en `ReportsProductsPage.test.tsx` no deben ser modificados y deben pasar al 100%.
- **Node & fnm en Windows**: anteponer `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;` antes de comandos node/pnpm.
- **No git push** a menos que se solicite explícitamente.

---

### Task 1: Definir tipos compartidos de productos en `types.ts`

**Files:**
- Modify: `frontend/src/features/reports/types.ts`

**Interfaces:**
- Consumes: `ProductMatrixItem` de `@/types/api`
- Produces: `ProductChartMode`, `ProductTableTab`, `ProductKpis`, `ProductTableRow`, `UseProductsReportParams`, `UseProductsReportReturn`

- [ ] **Step 1: Agregar tipos e interfaces en `frontend/src/features/reports/types.ts`**

Agregar al final de `frontend/src/features/reports/types.ts`:

```typescript
import type { ProductMatrixItem } from "@/types/api";

export type ProductChartMode = "matrix" | "top10";
export type ProductTableTab = "todos" | "mas_vendidos" | "mayor_margen" | "menor_margen" | "sin_rotacion";

export interface ProductKpis {
  totalUnidades: number;
  lider: ProductMatrixItem | null;
  margenPromedio: number;
  sinRotacion: number;
}

export interface ProductTableRow {
  id: number;
  nombre: string;
  total_vendido: number;
  ingresos: number;
  costos: number;
  margen: number;
  rentabilidad_pct: number;
  stock_unidades: number;
}

export interface UseProductsReportParams {
  from: string;
  to: string;
  currency: "USD" | "VES";
  tableTab: ProductTableTab;
  page: number;
  pageSize: number;
}

export interface UseProductsReportReturn {
  rawData: ProductMatrixItem[];
  kpis: ProductKpis;
  tableData: ProductTableRow[];
  paginatedData: ProductTableRow[];
  totalPages: number;
  totalRows: number;
  conversionRate: number;
  currSymbol: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
}
```

- [ ] **Step 2: Verificar compilación de tipos**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/reports/types.ts
git commit -m "feat(reports): add shared types for products report refactor"
```

---

### Task 2: Custom Hook `useProductsReport` (TDD)

**Files:**
- Test: `frontend/src/__tests__/features/reports/useProductsReport.test.ts`
- Create: `frontend/src/features/reports/hooks/useProductsReport.ts`

**Interfaces:**
- Consumes: `api.getProductsMatrix` de `@/services/api`, `useExchangeRateStore` de `@/stores/exchangeRateStore`, tipos de `../types`
- Produces: `useProductsReport(params: UseProductsReportParams): UseProductsReportReturn`

- [ ] **Step 1: Escribir tests que fallen para `useProductsReport`**

Crear `frontend/src/__tests__/features/reports/useProductsReport.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useProductsReport } from "@/features/reports/hooks/useProductsReport";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

vi.mock("@/services/api", () => ({
  api: {
    getProductsMatrix: vi.fn(),
  },
}));

const mockMatrixData = [
  {
    id: 1,
    nombre: "Ron Cacique",
    total_vendido: 38,
    precio_unidad_usd: 10,
    precio_costo_usd: 5,
    margen_porcentaje: 50,
    stock_unidades: 24,
  },
  {
    id: 2,
    nombre: "Whisky Black Label",
    total_vendido: 12,
    precio_unidad_usd: 30,
    precio_costo_usd: 18,
    margen_porcentaje: 40,
    stock_unidades: 8,
  },
  {
    id: 3,
    nombre: "Producto Sin Venta",
    total_vendido: 0,
    precio_unidad_usd: 5,
    precio_costo_usd: 3,
    margen_porcentaje: 40,
    stock_unidades: 100,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getProductsMatrix).mockResolvedValue(mockMatrixData);
  useExchangeRateStore.setState({ tasa: 40 });
});

describe("useProductsReport", () => {
  it("inicia en loading=true y luego carga datos", async () => {
    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.rawData).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rawData).toEqual(mockMatrixData);
    expect(result.current.currSymbol).toBe("$");
  });

  it("calcula kpis correctamente", async () => {
    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 38 + 12 = 50 totalUnidades
    expect(result.current.kpis.totalUnidades).toBe(50);
    // Ron Cacique tiene 38 unidades
    expect(result.current.kpis.lider?.nombre).toBe("Ron Cacique");
    // (50 + 40) / 2 = 45 margenPromedio
    expect(result.current.kpis.margenPromedio).toBe(45);
    // 1 producto sin rotación
    expect(result.current.kpis.sinRotacion).toBe(1);
  });

  it("calcula valores monetarios en USD y VES correctamente", async () => {
    const { result: resUsd } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(resUsd.current.loading).toBe(false);
    });

    // Ron Cacique en USD: 10 * 38 = 380 ingresos, 5 * 38 = 190 costos, 190 margen
    const ronUsd = resUsd.current.tableData.find((p) => p.id === 1)!;
    expect(ronUsd.ingresos).toBe(380);
    expect(ronUsd.costos).toBe(190);
    expect(ronUsd.margen).toBe(190);

    const { result: resVes } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "VES",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(resVes.current.loading).toBe(false);
    });

    expect(resVes.current.currSymbol).toBe("Bs ");
    expect(resVes.current.conversionRate).toBe(40);
    // Ron Cacique en VES: 380 * 40 = 15200 ingresos, 190 * 40 = 7600 costos
    const ronVes = resVes.current.tableData.find((p) => p.id === 1)!;
    expect(ronVes.ingresos).toBe(15200);
    expect(ronVes.costos).toBe(7600);
    expect(ronVes.margen).toBe(7600);
  });

  it("filtra por pestañas de tabla correctamente", async () => {
    const { result, rerender } = renderHook(
      ({ tab }) =>
        useProductsReport({
          from: "2026-09-10",
          to: "2026-10-09",
          currency: "USD",
          tableTab: tab,
          page: 1,
          pageSize: 10,
        }),
      { initialProps: { tab: "sin_rotacion" as const } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tableData).toHaveLength(1);
    expect(result.current.tableData[0].nombre).toBe("Producto Sin Venta");

    rerender({ tab: "mas_vendidos" });
    expect(result.current.tableData).toHaveLength(2);
    expect(result.current.tableData[0].nombre).toBe("Ron Cacique");
  });

  it("pagina los datos correctamente", async () => {
    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 2,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.totalRows).toBe(3);
    expect(result.current.paginatedData).toHaveLength(2);
  });

  it("maneja errores y permite retry()", async () => {
    vi.mocked(api.getProductsMatrix).mockRejectedValueOnce(new Error("Error de conexión"));

    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Error de conexión");
    });

    vi.mocked(api.getProductsMatrix).mockResolvedValueOnce(mockMatrixData);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.rawData).toEqual(mockMatrixData);
    });
  });
});
```

- [ ] **Step 2: Ejecutar test y verificar que falla**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/useProductsReport.test.ts
```
Expected: FAIL (Cannot find module `@/features/reports/hooks/useProductsReport`).

- [ ] **Step 3: Implementar `useProductsReport.ts`**

Crear `frontend/src/features/reports/hooks/useProductsReport.ts`:

```typescript
import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { ProductMatrixItem } from "@/types/api";
import type {
  UseProductsReportParams,
  UseProductsReportReturn,
  ProductKpis,
  ProductTableRow,
} from "../types";

export function useProductsReport({
  from,
  to,
  currency,
  tableTab,
  page,
  pageSize,
}: UseProductsReportParams): UseProductsReportReturn {
  const tasaBCV = useExchangeRateStore((s) => s.tasa);
  const conversionRate = currency === "VES" && tasaBCV > 0 ? tasaBCV : 1;
  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const [rawData, setRawData] = useState<ProductMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getProductsMatrix({
          fecha_desde: from,
          fecha_hasta: to,
          limit: 200,
        });
        if (!cancelled) {
          setRawData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar datos de productos");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, retryCount]);

  const kpis = useMemo<ProductKpis>(() => {
    const conVentas = rawData.filter((p) => p.total_vendido > 0);
    const totalUnidades = conVentas.reduce((acc, p) => acc + p.total_vendido, 0);

    const lider =
      conVentas.length > 0
        ? conVentas.reduce(
            (best, p) => (p.total_vendido > best.total_vendido ? p : best),
            conVentas[0],
          )
        : null;

    const margenPromedio =
      conVentas.length > 0
        ? conVentas.reduce((acc, p) => acc + Number(p.margen_porcentaje), 0) / conVentas.length
        : 0;

    const sinRotacion = rawData.filter((p) => p.total_vendido === 0).length;

    return { totalUnidades, lider, margenPromedio, sinRotacion };
  }, [rawData]);

  const tableData = useMemo<ProductTableRow[]>(() => {
    const mapToRow = (p: ProductMatrixItem): ProductTableRow => {
      const rawIncome = Number(p.precio_unidad_usd) * p.total_vendido;
      const rawCost = Number(p.precio_costo_usd) * p.total_vendido;
      const ingresos = Math.round(rawIncome * conversionRate * 100) / 100;
      const costos = Math.round(rawCost * conversionRate * 100) / 100;
      const margen = Math.round((ingresos - costos) * 100) / 100;

      return {
        id: p.id,
        nombre: p.nombre,
        total_vendido: p.total_vendido,
        ingresos,
        costos,
        margen,
        rentabilidad_pct: Number(p.margen_porcentaje) || 0,
        stock_unidades: p.stock_unidades,
      };
    };

    const sortedBySales = [...rawData].sort((a, b) => b.total_vendido - a.total_vendido);

    let filtered: ProductMatrixItem[];
    switch (tableTab) {
      case "mas_vendidos":
        filtered = sortedBySales.filter((p) => p.total_vendido > 0).slice(0, 50);
        break;
      case "mayor_margen":
        filtered = [...rawData].sort(
          (a, b) => Number(b.margen_porcentaje) - Number(a.margen_porcentaje),
        );
        break;
      case "menor_margen":
        filtered = [...rawData].sort(
          (a, b) => Number(a.margen_porcentaje) - Number(b.margen_porcentaje),
        );
        break;
      case "sin_rotacion":
        filtered = rawData.filter((p) => p.total_vendido === 0);
        break;
      default:
        filtered = sortedBySales;
        break;
    }

    return filtered.map(mapToRow);
  }, [rawData, tableTab, conversionRate]);

  const totalRows = tableData.length;
  const totalPages = useMemo(
    () => Math.ceil(totalRows / pageSize) || 1,
    [totalRows, pageSize],
  );

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableData.slice(start, start + pageSize);
  }, [tableData, page, pageSize]);

  return {
    rawData,
    kpis,
    tableData,
    paginatedData,
    totalPages,
    totalRows,
    conversionRate,
    currSymbol,
    loading,
    error,
    retry,
  };
}
```

- [ ] **Step 4: Ejecutar test y verificar que pasa**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/useProductsReport.test.ts
```
Expected: PASS (6/6 tests passed).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/reports/hooks/useProductsReport.ts frontend/src/__tests__/features/reports/useProductsReport.test.ts
git commit -m "feat(reports): add useProductsReport hook with TDD"
```

---

### Task 3: Componente `ProductsKpiCards`

**Files:**
- Create: `frontend/src/features/reports/components/ProductsKpiCards.tsx`

**Interfaces:**
- Consumes: `ProductKpis` de `../types`
- Produces: `ProductsKpiCardsProps`: `{ kpis: ProductKpis; loading: boolean }`

- [ ] **Step 1: Crear `ProductsKpiCards.tsx`**

Crear `frontend/src/features/reports/components/ProductsKpiCards.tsx`:

```tsx
import { Package, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/ui-components/Skeleton";
import type { ProductKpis } from "../types";

export interface ProductsKpiCardsProps {
  kpis: ProductKpis;
  loading: boolean;
}

export default function ProductsKpiCards({ kpis, loading }: ProductsKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Unidades Vendidas */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Unidades Vendidas</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <Package className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.totalUnidades.toLocaleString("es-VE")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Total rotado en el período</p>
        </div>
      </div>

      {/* Producto Líder */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Producto Líder</span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
            <Trophy className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : kpis.lider ? (
            <>
              <div className="truncate text-xl font-bold tracking-tight text-slate-900" title={kpis.lider.nombre}>
                {kpis.lider.nombre}
              </div>
              <p className="mt-1 text-xs text-amber-600 font-medium">{kpis.lider.total_vendido} unidades vendidas</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Sin ventas en el período</p>
          )}
        </div>
      </div>

      {/* Margen Promedio */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Margen Promedio</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600">
                {kpis.margenPromedio.toFixed(1)}%
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Rentabilidad del catálogo</p>
        </div>
      </div>

      {/* Sin Rotación */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Sin Rotación</span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-500">
            <AlertTriangle className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.sinRotacion}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Productos sin mov. en el período</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/reports/components/ProductsKpiCards.tsx
git commit -m "feat(reports): add ProductsKpiCards component"
```

---

### Task 4: Componente `ProductsToolbar`

**Files:**
- Create: `frontend/src/features/reports/components/ProductsToolbar.tsx`

**Interfaces:**
- Consumes: `ProductChartMode`, `ReportViewMode` de `../types`
- Produces: `ProductsToolbarProps`

- [ ] **Step 1: Crear `ProductsToolbar.tsx`**

Crear `frontend/src/features/reports/components/ProductsToolbar.tsx`:

```tsx
import { BarChart2, Table as TableIcon, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import type { ReportViewMode, ProductChartMode } from "../types";

export interface ProductsToolbarProps {
  viewMode: ReportViewMode;
  chartMode: ProductChartMode;
  onViewModeChange: (v: ReportViewMode) => void;
  onChartModeChange: (c: ProductChartMode) => void;
  onExport: () => void;
}

export default function ProductsToolbar({
  viewMode,
  chartMode,
  onViewModeChange,
  onChartModeChange,
  onExport,
}: ProductsToolbarProps) {
  const chartTitle =
    chartMode === "matrix"
      ? "Matriz de Rendimiento: Rotación vs. Margen %"
      : "Top 10 Productos Más Vendidos";

  const viewModeTitle = viewMode === "chart" ? chartTitle : "Tabla de Desglose de Productos";

  const subtitle =
    viewMode === "chart"
      ? chartMode === "matrix"
        ? "Cada punto representa un producto; cuadrantes según rotación y margen"
        : "Productos con mayor número de unidades despachadas en el período"
      : "Haz clic en las pestañas para filtrar el catálogo";

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">{viewModeTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Chart mode toggle (only when chart view) */}
        {viewMode === "chart" && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onChartModeChange("matrix")}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
                chartMode === "matrix"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Matriz
            </button>
            <button
              type="button"
              onClick={() => onChartModeChange("top10")}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
                chartMode === "top10"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Top 10
            </button>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onViewModeChange("chart")}
            className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              viewMode === "chart"
                ? "bg-white text-brand-blue shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="size-3.5" />
            Gráfico
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              viewMode === "table"
                ? "bg-white text-brand-blue shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="size-3.5" />
            Tabla
          </button>
        </div>

        {/* Export (only table mode) */}
        {viewMode === "table" && (
          <Button variant="outline" size="sm" onClick={onExport} className="text-xs">
            <Download className="size-3.5 mr-1" />
            Exportar Excel
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/reports/components/ProductsToolbar.tsx
git commit -m "feat(reports): add ProductsToolbar component"
```

---

### Task 5: Componente `ProductsChartSection`

**Files:**
- Create: `frontend/src/features/reports/components/ProductsChartSection.tsx`

**Interfaces:**
- Consumes: `RentabilityScatterChart`, `ProductsTop10Chart`, `ProductMatrixItem` de `@/types/api`, `ProductChartMode` de `../types`
- Produces: `ProductsChartSectionProps`: `{ chartMode: ProductChartMode; data: ProductMatrixItem[]; currency: "USD" | "VES"; currSymbol: string; vesRate: number }`

- [ ] **Step 1: Crear `ProductsChartSection.tsx`**

Crear `frontend/src/features/reports/components/ProductsChartSection.tsx`:

```tsx
import { lazy, Suspense } from "react";
import type { ProductMatrixItem } from "@/types/api";
import type { ProductChartMode } from "../types";
import ProductsTop10Chart from "./ProductsTop10Chart";

const RentabilityScatterChart = lazy(() => import("./RentabilityScatterChart"));

export interface ProductsChartSectionProps {
  chartMode: ProductChartMode;
  data: ProductMatrixItem[];
  currency: "USD" | "VES";
  currSymbol: string;
  vesRate: number;
}

export default function ProductsChartSection({
  chartMode,
  data,
  currency,
  currSymbol,
  vesRate,
}: ProductsChartSectionProps) {
  return (
    <div className="min-h-80 w-full">
      {chartMode === "matrix" ? (
        <Suspense
          fallback={
            <div className="flex h-80 items-center justify-center">
              <span className="text-sm text-slate-400">Cargando gráfico...</span>
            </div>
          }
        >
          <RentabilityScatterChart data={data} />
        </Suspense>
      ) : (
        <ProductsTop10Chart
          data={data}
          currency={currency}
          currSymbol={currSymbol}
          vesRate={vesRate}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/reports/components/ProductsChartSection.tsx
git commit -m "feat(reports): add ProductsChartSection component with Suspense"
```

---

### Task 6: Componente `ProductsTable`

**Files:**
- Create: `frontend/src/features/reports/components/ProductsTable.tsx`

**Interfaces:**
- Consumes: `Pagination`, `formatCurrency`, `ProductTableRow`, `ProductTableTab`
- Produces: `ProductsTableProps`

- [ ] **Step 1: Crear `ProductsTable.tsx`**

Crear `frontend/src/features/reports/components/ProductsTable.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";
import Pagination from "@/ui-components/Pagination";
import type { ProductTableRow, ProductTableTab } from "../types";

export interface ProductsTableProps {
  data: ProductTableRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  tableTab: ProductTableTab;
  sinRotacionCount: number;
  currency: string;
  currSymbol: string;
  onTabChange: (tab: ProductTableTab) => void;
  onPageChange: (page: number) => void;
}

const TABLE_TABS: { id: ProductTableTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "mas_vendidos", label: "Más Vendidos" },
  { id: "mayor_margen", label: "Mayor Margen" },
  { id: "menor_margen", label: "Menor Margen" },
  { id: "sin_rotacion", label: "Sin Rotación" },
];

export default function ProductsTable({
  data,
  totalRows,
  page,
  totalPages,
  pageSize,
  tableTab,
  sinRotacionCount,
  currency,
  currSymbol,
  onTabChange,
  onPageChange,
}: ProductsTableProps) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-100 pb-3 -mx-1 px-1 flex-nowrap">
        {TABLE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`cursor-pointer shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tableTab === tab.id
                ? "bg-brand-blue text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label}
            {tab.id === "sin_rotacion" && sinRotacionCount > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tableTab === tab.id ? "bg-white/20" : "bg-purple-100 text-purple-700"
                }`}
              >
                {sinRotacionCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3 text-center">Vendidos</th>
              <th className="px-4 py-3 text-right">Ingresos ({currency})</th>
              <th className="px-4 py-3 text-right">Costos ({currency})</th>
              <th className="px-4 py-3 text-right">Margen ({currency})</th>
              <th className="px-4 py-3 text-right">Rentabilidad</th>
              <th className="px-4 py-3 text-center">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No hay productos en esta categoría para el período seleccionado
                </td>
              </tr>
            ) : (
              data.map((p) => {
                const rentPct = p.rentabilidad_pct.toFixed(1);
                const stockBadge =
                  p.stock_unidades === 0
                    ? "bg-red-50 text-red-600"
                    : p.stock_unidades <= 5
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-50 text-slate-600";

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px]">
                      <span className="block truncate" title={p.nombre}>
                        {p.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{p.total_vendido}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {formatCurrency(p.ingresos, currSymbol)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(p.costos, currSymbol)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(p.margen, currSymbol)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          Number(rentPct) >= 30
                            ? "bg-emerald-50 text-emerald-700"
                            : Number(rentPct) >= 15
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {rentPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stockBadge}`}>
                        {p.stock_unidades} u
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + count */}
      {totalRows > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Mostrando{" "}
            <span className="font-medium text-slate-700">
              {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalRows)}
            </span>{" "}
            de <span className="font-medium text-slate-700">{totalRows}</span> productos
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/reports/components/ProductsTable.tsx
git commit -m "feat(reports): add ProductsTable presentation component"
```

---

### Task 7: Tests unitarios de componentes de presentación

**Files:**
- Create: `frontend/src/__tests__/features/reports/ProductsComponents.test.tsx`

**Interfaces:**
- Verifica: `ProductsKpiCards`, `ProductsToolbar`, `ProductsTable`

- [ ] **Step 1: Crear `ProductsComponents.test.tsx`**

Crear `frontend/src/__tests__/features/reports/ProductsComponents.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductsKpiCards from "@/features/reports/components/ProductsKpiCards";
import ProductsToolbar from "@/features/reports/components/ProductsToolbar";
import ProductsTable from "@/features/reports/components/ProductsTable";
import type { ProductKpis, ProductTableRow } from "@/features/reports/types";

describe("ProductsKpiCards", () => {
  const mockKpis: ProductKpis = {
    totalUnidades: 125,
    lider: {
      id: 1,
      nombre: "Cerveza Polar",
      total_vendido: 80,
      precio_unidad_usd: 1.5,
      precio_costo_usd: 1,
      margen_porcentaje: 33.3,
      stock_unidades: 200,
    },
    margenPromedio: 28.5,
    sinRotacion: 4,
  };

  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(<ProductsKpiCards kpis={mockKpis} loading={true} />);
    expect(screen.getByText("Unidades Vendidas")).toBeInTheDocument();
    expect(screen.getByText("Producto Líder")).toBeInTheDocument();
    expect(screen.getByText("Margen Promedio")).toBeInTheDocument();
    expect(screen.getByText("Sin Rotación")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra valores formateados cuando loading es false", () => {
    render(<ProductsKpiCards kpis={mockKpis} loading={false} />);
    expect(screen.getByText("125")).toBeInTheDocument();
    expect(screen.getByText("Cerveza Polar")).toBeInTheDocument();
    expect(screen.getByText("80 unidades vendidas")).toBeInTheDocument();
    expect(screen.getByText("28.5%")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

describe("ProductsToolbar", () => {
  it("renderiza botones de modo de gráfico y responde al toggle", async () => {
    const onChartModeChange = vi.fn();
    render(
      <ProductsToolbar
        viewMode="chart"
        chartMode="matrix"
        onViewModeChange={vi.fn()}
        onChartModeChange={onChartModeChange}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText("Matriz de Rendimiento: Rotación vs. Margen %")).toBeInTheDocument();
    const top10Btn = screen.getByRole("button", { name: /top 10/i });
    expect(top10Btn).toBeInTheDocument();
    await userEvent.click(top10Btn);
    expect(onChartModeChange).toHaveBeenCalledWith("top10");
  });

  it("muestra botón exportar solo en modo tabla", async () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <ProductsToolbar
        viewMode="chart"
        chartMode="matrix"
        onViewModeChange={vi.fn()}
        onChartModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();

    rerender(
      <ProductsToolbar
        viewMode="table"
        chartMode="matrix"
        onViewModeChange={vi.fn()}
        onChartModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    const exportBtn = screen.getByRole("button", { name: /exportar excel/i });
    expect(exportBtn).toBeInTheDocument();
    await userEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});

describe("ProductsTable", () => {
  const mockRows: ProductTableRow[] = [
    {
      id: 1,
      nombre: "Ron Santa Teresa",
      total_vendido: 20,
      ingresos: 400,
      costos: 260,
      margen: 140,
      rentabilidad_pct: 35.0,
      stock_unidades: 12,
    },
  ];

  it("renderiza columnas, filas y responde al cambio de pestaña", async () => {
    const onTabChange = vi.fn();
    render(
      <ProductsTable
        data={mockRows}
        totalRows={1}
        page={1}
        totalPages={1}
        pageSize={10}
        tableTab="todos"
        sinRotacionCount={2}
        currency="USD"
        currSymbol="$"
        onTabChange={onTabChange}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Ron Santa Teresa")).toBeInTheDocument();
    expect(screen.getByText("$400,00")).toBeInTheDocument();
    expect(screen.getByText("35.0%")).toBeInTheDocument();
    expect(screen.getByText("12 u")).toBeInTheDocument();

    const sinRotTab = screen.getByRole("button", { name: /sin rotación/i });
    await userEvent.click(sinRotTab);
    expect(onTabChange).toHaveBeenCalledWith("sin_rotacion");
  });
});
```

- [ ] **Step 2: Ejecutar tests y verificar que pasan**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/ProductsComponents.test.tsx
```
Expected: PASS (5/5 tests passed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/features/reports/ProductsComponents.test.tsx
git commit -m "test(reports): add unit tests for products presentation components"
```

---

### Task 8: Refactorizar `ReportsProductsPage.tsx` como orquestador y verificar suite completa

**Files:**
- Modify: `frontend/src/features/reports/pages/ReportsProductsPage.tsx`

**Interfaces:**
- Consumes: `useProductsReport`, `ProductsKpiCards`, `ProductsToolbar`, `ProductsChartSection`, `ProductsTable`, `exportToExcel`, `ErrorBanner`

- [ ] **Step 1: Reescribir `ReportsProductsPage.tsx`**

Reemplazar `frontend/src/features/reports/pages/ReportsProductsPage.tsx` por la versión limpia orquestadora:

```tsx
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Package } from "lucide-react";
import { getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import ErrorBanner from "@/ui-components/ErrorBanner";
import type { Column } from "@/ui-components/Table";
import type { ReportViewMode, ProductChartMode, ProductTableTab, ProductTableRow } from "../types";
import { useProductsReport } from "../hooks/useProductsReport";
import ProductsKpiCards from "../components/ProductsKpiCards";
import ProductsToolbar from "../components/ProductsToolbar";
import ProductsChartSection from "../components/ProductsChartSection";
import ProductsTable from "../components/ProductsTable";

export default function ReportsProductsPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [viewMode, setViewMode] = useState<ReportViewMode>("chart");
  const [chartMode, setChartMode] = useState<ProductChartMode>("matrix");
  const [tableTab, setTableTab] = useState<ProductTableTab>("todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [tableTab, from, to]);

  const {
    rawData,
    kpis,
    tableData,
    paginatedData,
    totalPages,
    totalRows,
    conversionRate,
    currSymbol,
    loading,
    error,
    retry,
  } = useProductsReport({
    from,
    to,
    currency,
    tableTab,
    page,
    pageSize,
  });

  const handleExport = () => {
    const currKey = currency.toLowerCase();
    const columns: Column<ProductTableRow>[] = [
      { key: "nombre", header: "Producto" },
      { key: "total_vendido", header: "Vendidos" },
      {
        key: "ingresos",
        header: `Ingresos (${currency})`,
        exportValue: (r) => r.ingresos,
      },
      {
        key: "costos",
        header: `Costos (${currency})`,
        exportValue: (r) => r.costos,
      },
      {
        key: "margen",
        header: `Margen (${currency})`,
        exportValue: (r) => r.margen,
      },
      {
        key: "rentabilidad_pct",
        header: "Rentabilidad %",
        exportValue: (r) => r.rentabilidad_pct,
      },
      { key: "stock_unidades", header: "Stock" },
    ];

    exportToExcel({
      data: tableData,
      columns,
      filename: `reporte_productos_${tableTab}_${currKey}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={retry}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <ProductsKpiCards kpis={kpis} loading={loading} />

      <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 shadow-xs min-w-0 max-w-full">
        <ProductsToolbar
          viewMode={viewMode}
          chartMode={chartMode}
          onViewModeChange={setViewMode}
          onChartModeChange={setChartMode}
          onExport={handleExport}
        />

        {loading ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            Cargando analíticas...
          </div>
        ) : rawData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Package className="size-10 stroke-1 mb-2" />
            <p className="text-sm">No hay datos de productos para el rango seleccionado</p>
          </div>
        ) : viewMode === "chart" ? (
          <ProductsChartSection
            chartMode={chartMode}
            data={rawData}
            currency={currency}
            currSymbol={currSymbol}
            vesRate={conversionRate}
          />
        ) : (
          <ProductsTable
            data={paginatedData}
            totalRows={totalRows}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            tableTab={tableTab}
            sinRotacionCount={kpis.sinRotacion}
            currency={currency}
            currSymbol={currSymbol}
            onTabChange={(tab) => {
              setTableTab(tab);
              setPage(1);
            }}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ejecutar los tests de integración originales**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/ReportsProductsPage.test.tsx
```
Expected: PASS (los 9 tests existentes pasan al 100% sin modificaciones en el archivo de prueba).

- [ ] **Step 3: Ejecutar la suite completa de reports**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/
```
Expected: PASS (todos los archivos de test de reports en verde).

- [ ] **Step 4: Comprobación estricta de tipos TypeScript**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/reports/pages/ReportsProductsPage.tsx
git commit -m "refactor(reports): rewrite ReportsProductsPage as lightweight orchestrator"
```
