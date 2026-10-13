# Refactor de ReportsSalesPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar el "God Component" `ReportsSalesPage.tsx` (530 líneas) separando la lógica y fetching en un custom hook (`useSalesSummary`), la presentación en 5 componentes puros (`SalesKpiCards`, `SalesChart`, `SalesChartTooltip`, `SalesTable`, `SalesToolbar`), y reduciendo la página principal a un orquestador limpio de ~80 líneas siguiendo TDD.

**Architecture:** 
- Hook de negocio `useSalesSummary`: gestiona llamada a API con flag de cancelación, cálculo de métricas financieras (USD/VES), formateo de periodos, y ordenamiento/paginación.
- Componentes puros de presentación: reciben datos primitivos/tipados y callbacks vía props estrictos sin `any`.
- Orquestador `ReportsSalesPage`: lee search params de URL, invoca el hook, y distribuye props a los componentes de presentación.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Recharts, Vitest, Testing Library, Lucide React.

**Spec:** C:\Users\USER\.opencode\plan\refactor-reports-sales-page.md

## Global Constraints

- Prohibido el uso de `any` (regla estricta de `frontend_rules.md`).
- Redondeo monetario con `Math.round(val * 100) / 100` en acumulaciones y cálculos de rentabilidad.
- Formateo de moneda con `formatCurrency(val, currSymbol)` de `@/lib/utils`.
- Preservar exactamente los textos, botones y roles accesibles para que los tests existentes pasen sin modificación.
- En Windows con fnm, anteponer el PATH de Node para comandos de test: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test ...`

---

### Task 1: Definir tipos compartidos del módulo Reports

**Files:**
- Create: `frontend/src/features/reports/types.ts`

**Interfaces:**
- Produces: `SalesGrouping`, `ReportViewMode`, `SalesChartRow`, `SalesKpis`, `UseSalesSummaryParams`, `UseSalesSummaryReturn`

- [ ] **Step 1: Crear archivo de tipos**

Crear `frontend/src/features/reports/types.ts` con el siguiente contenido exacto:

```typescript
import type { SalesSummaryItem } from "@/types/api";

export type SalesGrouping = "diario" | "semanal" | "mensual";
export type ReportViewMode = "chart" | "table";

export interface SalesChartRow {
  periodoRaw: string;
  periodoFormatted: string;
  ventas: number;
  ingresos: number;
  costos: number;
  margen: number;
}

export interface SalesKpis {
  totalVentas: number;
  ingresos: number;
  costos: number;
  margen: number;
  margenPct: number;
}

export interface UseSalesSummaryParams {
  grouping: SalesGrouping;
  from: string;
  to: string;
  currency: "USD" | "VES";
  page: number;
  pageSize: number;
}

export interface UseSalesSummaryReturn {
  rawData: SalesSummaryItem[];
  chartData: SalesChartRow[];
  paginatedData: SalesChartRow[];
  tableData: SalesChartRow[];
  totals: SalesKpis;
  totalPages: number;
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

---

### Task 2: Custom Hook `useSalesSummary` (TDD)

**Files:**
- Test: `frontend/src/__tests__/features/reports/useSalesSummary.test.ts`
- Create: `frontend/src/features/reports/hooks/useSalesSummary.ts`

**Interfaces:**
- Consumes: `api.getSalesSummary` de `@/services/api`, `formatPeriod` de `@/lib/utils`, tipos de `../types`
- Produces: `useSalesSummary(params: UseSalesSummaryParams): UseSalesSummaryReturn`

- [ ] **Step 1: Escribir tests que fallen para el hook**

Crear `frontend/src/__tests__/features/reports/useSalesSummary.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSalesSummary } from "@/features/reports/hooks/useSalesSummary";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getSalesSummary: vi.fn(),
  },
}));

const mockSalesData = [
  {
    periodo: "2026-10-01",
    total_ventas: 10,
    total_usd: 1000,
    total_ves: 860000,
    costo_usd: 700,
    margen_usd: 300,
  },
  {
    periodo: "2026-10-02",
    total_ventas: 15,
    total_usd: 1500,
    total_ves: 1290000,
    costo_usd: 1000,
    margen_usd: 500,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesData);
});

describe("useSalesSummary", () => {
  it("inicia en loading=true y luego carga datos", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.rawData).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rawData).toEqual(mockSalesData);
  });

  it("calcula totales correctamente en USD", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totals.totalVentas).toBe(25);
    expect(result.current.totals.ingresos).toBe(2500);
    expect(result.current.totals.costos).toBe(1700);
    expect(result.current.totals.margen).toBe(800);
    expect(result.current.totals.margenPct).toBeCloseTo(32.0, 1);
  });

  it("calcula totales y costos proporcionales en VES", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "VES",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totals.ingresos).toBe(2150000);
    // ratio = 2150000 / 2500 = 860. Costos VES = 1700 * 860 = 1462000
    expect(result.current.totals.costos).toBe(1462000);
    expect(result.current.totals.margen).toBe(688000);
  });

  it("transforma chartData y tableData en orden inverso", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.chartData).toHaveLength(2);
    expect(result.current.chartData[0].periodoRaw).toBe("2026-10-01");
    expect(result.current.chartData[1].periodoRaw).toBe("2026-10-02");

    // tableData debe ser descendente (más reciente primero)
    expect(result.current.tableData[0].periodoRaw).toBe("2026-10-02");
    expect(result.current.tableData[1].periodoRaw).toBe("2026-10-01");
  });

  it("pagina tableData correctamente", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedData).toHaveLength(1);
    expect(result.current.paginatedData[0].periodoRaw).toBe("2026-10-02");
  });

  it("maneja errores de la API correctamente", async () => {
    vi.mocked(api.getSalesSummary).mockRejectedValueOnce(new Error("Fallo de red"));

    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Fallo de red");
  });

  it("reintenta la carga al llamar a retry()", async () => {
    vi.mocked(api.getSalesSummary).mockRejectedValueOnce(new Error("Fallo"));

    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Fallo");
    });

    vi.mocked(api.getSalesSummary).mockResolvedValueOnce(mockSalesData);

    result.current.retry();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.rawData).toEqual(mockSalesData);
    });
  });
});
```

- [ ] **Step 2: Ejecutar test y verificar que falla**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/useSalesSummary.test.ts
```
Expected: FAIL (Cannot find module `@/features/reports/hooks/useSalesSummary`).

- [ ] **Step 3: Implementar `useSalesSummary.ts`**

Crear `frontend/src/features/reports/hooks/useSalesSummary.ts`:

```typescript
import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import type { SalesSummaryItem } from "@/types/api";
import { formatPeriod } from "@/lib/utils";
import type {
  UseSalesSummaryParams,
  UseSalesSummaryReturn,
  SalesChartRow,
  SalesKpis,
} from "../types";

export function useSalesSummary({
  grouping,
  from,
  to,
  currency,
  page,
  pageSize,
}: UseSalesSummaryParams): UseSalesSummaryReturn {
  const [rawData, setRawData] = useState<SalesSummaryItem[]>([]);
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
        const res = await api.getSalesSummary({
          rango: grouping,
          fecha_desde: from,
          fecha_hasta: to,
        });
        if (!cancelled) {
          setRawData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar resumen de ventas");
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
  }, [grouping, from, to, retryCount]);

  const totals = useMemo<SalesKpis>(() => {
    let totalVentas = 0;
    let totalIngresosUSD = 0;
    let totalIngresosVES = 0;
    let totalCostosUSD = 0;

    rawData.forEach((item) => {
      totalVentas += Number(item.total_ventas || 0);
      totalIngresosUSD += Number(item.total_usd || 0);
      totalIngresosVES += Number(item.total_ves || 0);
      totalCostosUSD += Number(item.costo_usd || 0);
    });

    const isUsd = currency === "USD";
    const ingresos = isUsd ? totalIngresosUSD : totalIngresosVES;
    const ratioVES = totalIngresosUSD > 0 ? totalIngresosVES / totalIngresosUSD : 0;
    const costos = isUsd ? totalCostosUSD : totalCostosUSD * ratioVES;
    const margen = ingresos - costos;
    const margenPct = ingresos > 0 ? (margen / ingresos) * 100 : 0;

    return {
      totalVentas,
      ingresos,
      costos,
      margen,
      margenPct,
    };
  }, [rawData, currency]);

  const chartData = useMemo<SalesChartRow[]>(() => {
    const isUsd = currency === "USD";
    return rawData.map((item) => {
      const ingresos = isUsd ? Number(item.total_usd) : Number(item.total_ves);
      const ratio = Number(item.total_usd) > 0 ? Number(item.total_ves) / Number(item.total_usd) : 0;
      const costos = isUsd ? Number(item.costo_usd) : Number(item.costo_usd) * ratio;
      const margen = ingresos - costos;

      return {
        periodoRaw: item.periodo,
        periodoFormatted: formatPeriod(item.periodo),
        ventas: Number(item.total_ventas),
        ingresos: Math.round(ingresos * 100) / 100,
        costos: Math.round(costos * 100) / 100,
        margen: Math.round(margen * 100) / 100,
      };
    });
  }, [rawData, currency]);

  const tableData = useMemo<SalesChartRow[]>(() => {
    return [...chartData].reverse();
  }, [chartData]);

  const totalPages = Math.ceil(tableData.length / pageSize) || 1;

  const paginatedData = useMemo<SalesChartRow[]>(() => {
    const start = (page - 1) * pageSize;
    return tableData.slice(start, start + pageSize);
  }, [tableData, page, pageSize]);

  return {
    rawData,
    chartData,
    paginatedData,
    tableData,
    totals,
    totalPages,
    loading,
    error,
    retry,
  };
}
```

- [ ] **Step 4: Ejecutar test y verificar que pasa**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/useSalesSummary.test.ts
```
Expected: PASS (7 tests passed).

---

### Task 3: Componentes `SalesChartTooltip` y `SalesKpiCards`

**Files:**
- Create: `frontend/src/features/reports/components/SalesChartTooltip.tsx`
- Create: `frontend/src/features/reports/components/SalesKpiCards.tsx`

**Interfaces:**
- `SalesChartTooltipProps`: `{ active?: boolean; payload?: any[]; label?: string; currSymbol: string }`
- `SalesKpiCardsProps`: `{ totals: SalesKpis; loading: boolean; currSymbol: string }`

- [ ] **Step 1: Crear `SalesChartTooltip.tsx`**

Crear `frontend/src/features/reports/components/SalesChartTooltip.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

export interface SalesChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  currSymbol: string;
}

export default function SalesChartTooltip({
  active,
  payload,
  label,
  currSymbol,
}: SalesChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-slate-800 border-b border-slate-100 pb-1">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}:
          </span>
          <span className="font-bold text-slate-900">
            {formatCurrency(entry.value, currSymbol)}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear `SalesKpiCards.tsx`**

Crear `frontend/src/features/reports/components/SalesKpiCards.tsx`:

```tsx
import { DollarSign, Package, TrendingUp, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/ui-components/Skeleton";
import type { SalesKpis } from "../types";

export interface SalesKpiCardsProps {
  totals: SalesKpis;
  loading: boolean;
  currSymbol: string;
}

export default function SalesKpiCards({
  totals,
  loading,
  currSymbol,
}: SalesKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Ingresos */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Ingresos Brutos</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <DollarSign className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.ingresos, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Total facturado en el período</p>
        </div>
      </div>

      {/* Costo de Mercancía */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Costo Mercancía</span>
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            <Package className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.costos, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Costo total de productos vendidos</p>
        </div>
      </div>

      {/* Margen de Ganancia */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Margen de Ganancia</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600">
                {formatCurrency(totals.margen, currSymbol)}
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                {totals.margenPct.toFixed(1)}%
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Ganancia neta libre calculada</p>
        </div>
      </div>

      {/* Total Transacciones */}
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
              {totals.totalVentas.toLocaleString()}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Transacciones completadas</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar compilación**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores.

---

### Task 4: Componente `SalesChart`

**Files:**
- Create: `frontend/src/features/reports/components/SalesChart.tsx`

**Interfaces:**
- Consumes: `SalesChartTooltip`, `SalesChartRow` de `../types`
- Produces: `SalesChartProps`: `{ data: SalesChartRow[]; currSymbol: string }`

- [ ] **Step 1: Crear `SalesChart.tsx`**

Crear `frontend/src/features/reports/components/SalesChart.tsx`:

```tsx
import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SalesChartRow } from "../types";
import SalesChartTooltip from "./SalesChartTooltip";

export interface SalesChartProps {
  data: SalesChartRow[];
  currSymbol: string;
}

export default function SalesChart({ data, currSymbol }: SalesChartProps) {
  const [visibleSeries, setVisibleSeries] = useState({
    ingresos: true,
    costos: true,
    margen: true,
  });

  const handleLegendClick = (dataKey: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey as keyof typeof prev],
    }));
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="periodoFormatted"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) =>
              val >= 1000 ? `${currSymbol}${(val / 1000).toFixed(0)}k` : `${currSymbol}${val}`
            }
          />
          <Tooltip
            content={(props) => (
              <SalesChartTooltip
                active={props.active}
                payload={props.payload as any}
                label={props.label}
                currSymbol={currSymbol}
              />
            )}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "12px", fontSize: "12px", cursor: "pointer", userSelect: "none" }}
            formatter={(value, entry) => {
              const dataKey = entry.dataKey as keyof typeof visibleSeries;
              const isVisible = visibleSeries[dataKey];
              return (
                <span
                  className={`transition-opacity ${
                    isVisible ? "text-slate-700 font-medium opacity-100" : "text-slate-400 opacity-40 line-through"
                  }`}
                >
                  {value}
                </span>
              );
            }}
            onClick={(e) => {
              if (e && e.dataKey) {
                handleLegendClick(e.dataKey as string);
              }
            }}
          />

          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill="#3b82f6"
            hide={!visibleSeries.ingresos}
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
          />
          <Bar
            dataKey="costos"
            name="Costos"
            fill="#64748b"
            hide={!visibleSeries.costos}
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
          />
          <Line
            type="monotone"
            dataKey="margen"
            name="Margen"
            stroke="#10b981"
            strokeWidth={2.5}
            hide={!visibleSeries.margen}
            dot={{ r: 3, fill: "#10b981" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
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

---

### Task 5: Componentes `SalesTable` y `SalesToolbar`

**Files:**
- Create: `frontend/src/features/reports/components/SalesTable.tsx`
- Create: `frontend/src/features/reports/components/SalesToolbar.tsx`

**Interfaces:**
- `SalesTableProps`: `{ data: SalesChartRow[]; totalRows: number; page: number; totalPages: number; pageSize: number; currency: string; currSymbol: string; onPageChange: (p: number) => void }`
- `SalesToolbarProps`: `{ grouping: SalesGrouping; viewMode: ReportViewMode; onGroupingChange: (g: SalesGrouping) => void; onViewModeChange: (v: ReportViewMode) => void; onExport: () => void }`

- [ ] **Step 1: Crear `SalesTable.tsx`**

Crear `frontend/src/features/reports/components/SalesTable.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";
import Pagination from "@/ui-components/Pagination";
import type { SalesChartRow } from "../types";

export interface SalesTableProps {
  data: SalesChartRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  currency: string;
  currSymbol: string;
  onPageChange: (page: number) => void;
}

export default function SalesTable({
  data,
  totalRows,
  page,
  totalPages,
  pageSize,
  currency,
  currSymbol,
  onPageChange,
}: SalesTableProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3 text-center">N° de Ventas</th>
              <th className="px-4 py-3 text-right">Ingresos ({currency})</th>
              <th className="px-4 py-3 text-right">Costos ({currency})</th>
              <th className="px-4 py-3 text-right">Margen ({currency})</th>
              <th className="px-4 py-3 text-right">Rentabilidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => {
              const pct = row.ingresos > 0 ? ((row.margen / row.ingresos) * 100).toFixed(1) : "0.0";
              return (
                <tr key={row.periodoRaw} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.periodoFormatted}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs">{row.ventas}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">
                    {formatCurrency(row.ingresos, currSymbol)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(row.costos, currSymbol)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {formatCurrency(row.margen, currSymbol)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalRows)} de {totalRows} registros
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `SalesToolbar.tsx`**

Crear `frontend/src/features/reports/components/SalesToolbar.tsx`:

```tsx
import { BarChart2, Table as TableIcon, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import type { SalesGrouping, ReportViewMode } from "../types";

export interface SalesToolbarProps {
  grouping: SalesGrouping;
  viewMode: ReportViewMode;
  onGroupingChange: (g: SalesGrouping) => void;
  onViewModeChange: (v: ReportViewMode) => void;
  onExport: () => void;
}

const GROUPINGS: SalesGrouping[] = ["diario", "semanal", "mensual"];

export default function SalesToolbar({
  grouping,
  viewMode,
  onGroupingChange,
  onViewModeChange,
  onExport,
}: SalesToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">
          {viewMode === "chart" ? "Evolución de Ventas vs. Costos" : "Tabla de Desglose de Ventas"}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Haz clic en la leyenda para ocultar/mostrar métricas en la gráfica
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Grouping Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          {GROUPINGS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGroupingChange(g)}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                grouping === g
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

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

        {/* Export Button if table mode */}
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

- [ ] **Step 3: Verificar compilación**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b
```
Expected: 0 errores.

---

### Task 6: Tests unitarios para componentes de presentación

**Files:**
- Create: `frontend/src/__tests__/features/reports/SalesComponents.test.tsx`

**Interfaces:**
- Verifica: `SalesKpiCards`, `SalesTable`, `SalesToolbar`

- [ ] **Step 1: Crear `SalesComponents.test.tsx`**

Crear `frontend/src/__tests__/features/reports/SalesComponents.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesKpiCards from "@/features/reports/components/SalesKpiCards";
import SalesTable from "@/features/reports/components/SalesTable";
import SalesToolbar from "@/features/reports/components/SalesToolbar";
import type { SalesKpis, SalesChartRow } from "@/features/reports/types";

describe("SalesKpiCards", () => {
  const mockTotals: SalesKpis = {
    totalVentas: 42,
    ingresos: 5000,
    costos: 3500,
    margen: 1500,
    margenPct: 30.0,
  };

  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(
      <SalesKpiCards totals={mockTotals} loading={true} currSymbol="$" />,
    );
    expect(screen.getByText("Ingresos Brutos")).toBeInTheDocument();
    expect(screen.getByText("Costo Mercancía")).toBeInTheDocument();
    expect(screen.getByText("Margen de Ganancia")).toBeInTheDocument();
    expect(screen.getByText("N° de Ventas")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra valores formateados cuando loading es false", () => {
    render(<SalesKpiCards totals={mockTotals} loading={false} currSymbol="$" />);
    expect(screen.getByText("$5.000,00")).toBeInTheDocument();
    expect(screen.getByText("$3.500,00")).toBeInTheDocument();
    expect(screen.getByText("$1.500,00")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

describe("SalesToolbar", () => {
  it("renderiza botones de agrupación y modos de vista", () => {
    render(
      <SalesToolbar
        grouping="diario"
        viewMode="chart"
        onGroupingChange={vi.fn()}
        onViewModeChange={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /diario/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /semanal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mensual/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gráfico/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tabla/i })).toBeInTheDocument();
    // En modo chart NO debe haber botón de exportar
    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();
  });

  it("muestra botón exportar solo en modo tabla y responde al click", async () => {
    const onExport = vi.fn();
    render(
      <SalesToolbar
        grouping="diario"
        viewMode="table"
        onGroupingChange={vi.fn()}
        onViewModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    const exportBtn = screen.getByRole("button", { name: /exportar excel/i });
    expect(exportBtn).toBeInTheDocument();
    await userEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});

describe("SalesTable", () => {
  const mockRows: SalesChartRow[] = [
    {
      periodoRaw: "2026-10-02",
      periodoFormatted: "2 Oct",
      ventas: 15,
      ingresos: 1500,
      costos: 1000,
      margen: 500,
    },
  ];

  it("renderiza columnas y datos de filas", () => {
    render(
      <SalesTable
        data={mockRows}
        totalRows={1}
        page={1}
        totalPages={1}
        pageSize={10}
        currency="USD"
        currSymbol="$"
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Período")).toBeInTheDocument();
    expect(screen.getByText("N° de Ventas")).toBeInTheDocument();
    expect(screen.getByText("2 Oct")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("$1.500,00")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar tests de componentes y verificar que pasan**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/SalesComponents.test.tsx
```
Expected: PASS (5 tests passed).

---

### Task 7: Refactorizar `ReportsSalesPage.tsx` como orquestador y verificar suite completa

**Files:**
- Modify: `frontend/src/features/reports/pages/ReportsSalesPage.tsx`

**Interfaces:**
- Consumes: `useSalesSummary`, `SalesKpiCards`, `SalesChart`, `SalesTable`, `SalesToolbar`, `exportToExcel`, `ErrorBanner`

- [ ] **Step 1: Reemplazar contenido de `ReportsSalesPage.tsx`**

Sobrescribir `frontend/src/features/reports/pages/ReportsSalesPage.tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart2 } from "lucide-react";
import { getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import ErrorBanner from "@/ui-components/ErrorBanner";
import type { Column } from "@/ui-components/Table";
import type { SalesGrouping, ReportViewMode, SalesChartRow } from "../types";
import { useSalesSummary } from "../hooks/useSalesSummary";
import SalesKpiCards from "../components/SalesKpiCards";
import SalesChart from "../components/SalesChart";
import SalesTable from "../components/SalesTable";
import SalesToolbar from "../components/SalesToolbar";

export default function ReportsSalesPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [grouping, setGrouping] = useState<SalesGrouping>("diario");
  const [viewMode, setViewMode] = useState<ReportViewMode>("chart");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page when grouping or dates change
  useEffect(() => {
    setPage(1);
  }, [grouping, from, to]);

  const {
    chartData,
    paginatedData,
    tableData,
    totals,
    totalPages,
    loading,
    error,
    retry,
  } = useSalesSummary({
    grouping,
    from,
    to,
    currency,
    page,
    pageSize,
  });

  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const handleExport = () => {
    const columns: Column<SalesChartRow>[] = [
      { key: "periodoFormatted", header: "Período" },
      { key: "ventas", header: "N° de Ventas" },
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
    ];

    exportToExcel({
      data: tableData,
      columns,
      filename: `reporte_ventas_${grouping}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={retry}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <SalesKpiCards totals={totals} loading={loading} currSymbol={currSymbol} />

      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs">
        <SalesToolbar
          grouping={grouping}
          viewMode={viewMode}
          onGroupingChange={setGrouping}
          onViewModeChange={setViewMode}
          onExport={handleExport}
        />

        {loading ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            Cargando analíticas...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <BarChart2 className="size-10 stroke-1 mb-2" />
            <p className="text-sm">No hay registros de ventas para el rango seleccionado</p>
          </div>
        ) : viewMode === "chart" ? (
          <SalesChart data={chartData} currSymbol={currSymbol} />
        ) : (
          <SalesTable
            data={paginatedData}
            totalRows={tableData.length}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            currency={currency}
            currSymbol={currSymbol}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ejecutar los tests originales de `ReportsSalesPage.test.tsx`**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/ReportsSalesPage.test.tsx
```
Expected: PASS (los 6 tests existentes deben pasar sin cambios).

- [ ] **Step 3: Ejecutar suite completa de tests de reports**

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
