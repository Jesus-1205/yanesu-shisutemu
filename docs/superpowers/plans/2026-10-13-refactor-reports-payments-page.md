# Refactor de ReportsPaymentsPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar el "God Component" `ReportsPaymentsPage.tsx` (461 líneas) separando la lógica y fetching en un custom hook (`usePaymentsReport`), la presentación en 4 componentes puros (`PaymentsKpiCards`, `PaymentsToolbar`, `PaymentsChartSection`, `PaymentsTable`), y reduciendo la página principal a un orquestador limpio de ~95 líneas siguiendo TDD sin alterar ni romper los 7 tests de integración existentes.

**Architecture:** 
- Hook de negocio `usePaymentsReport`: gestiona llamada a API con flag de cancelación, cálculo de micro-KPIs (total recaudado, método líder, transacciones, ticket promedio), conversión monetaria (USD/VES) con redondeo financiero estricto a 2 decimales, cálculo de porcentaje de participación, filtrado por sub-pestañas (`todos`, `divisas`, `bolivares`) y paginación.
- Componentes puros de presentación: reciben datos primitivos/tipados y callbacks vía props estrictos sin `any`.
- Orquestador `ReportsPaymentsPage`: lee search params de URL, coordina estados visuales (`viewMode`, `chartMode`, `tableTab`, `page`), invoca el hook, y distribuye props a los componentes de presentación.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Vitest, Testing Library, Lucide React, Recharts.

## Global Constraints

- **Prohibido el uso de `any`** en cualquier archivo (regla estricta de `frontend_rules.md`).
- **Redondeo monetario**: `Math.round(val * 100) / 100` en todas las operaciones financieras acumuladas o convertidas.
- **Formateo**: usar `formatCurrency` y `formatPaymentMethodName` de `@/lib/utils` para montos y nombres, y `toLocaleString("es-VE")` para enteros.
- **Preservar contratos y UI copy**: los 7 tests existentes en `ReportsPaymentsPage.test.tsx` no deben ser modificados y deben pasar al 100%.
- **Node & fnm en Windows**: anteponer `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;` antes de comandos node/pnpm.
- **No git push** a menos que se solicite explícitamente.

---

### Task 1: Definir tipos compartidos de métodos de pago en `types.ts`

**Files:**
- Modify: `frontend/src/features/reports/types.ts`

**Interfaces:**
- Consumes: `PaymentMethodSummaryItem` de `@/types/api`
- Produces: `PaymentChartMode`, `PaymentTableTab`, `PaymentKpis`, `PaymentTableRow`, `UsePaymentsReportParams`, `UsePaymentsReportReturn`

- [ ] **Step 1: Agregar tipos e interfaces en `frontend/src/features/reports/types.ts`**

Agregar al final de `frontend/src/features/reports/types.ts`:

```typescript
import type { PaymentMethodSummaryItem } from "@/types/api";

// (conservar tipos existentes de sales y products intactos)

export type PaymentChartMode = "donut" | "bars";
export type PaymentTableTab = "todos" | "divisas" | "bolivares";

export interface PaymentKpis {
  totalUsd: number;
  totalVes: number;
  totalTransacciones: number;
  totalEquivUsd: number;
  totalRecaudado: number;
  lider: PaymentMethodSummaryItem | null;
  ventaPromedio: number;
}

export interface PaymentTableRow {
  id: number;
  nombre: string;
  nombreFormatted: string;
  monedaDefault: "USD" | "VES";
  cantidadPagos: number;
  totalUsd: number;
  totalVes: number;
  totalEquiv: number;
  participacionPct: number;
  participacionFormatted: string;
}

export interface UsePaymentsReportParams {
  from: string;
  to: string;
  currency: "USD" | "VES";
  tableTab: PaymentTableTab;
  page: number;
  pageSize: number;
}

export interface UsePaymentsReportReturn {
  rawData: PaymentMethodSummaryItem[];
  kpis: PaymentKpis;
  tableData: PaymentTableRow[];
  paginatedData: PaymentTableRow[];
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
git commit -m "feat(reports): add shared types for payments report refactor"
```

---

### Task 2: Custom Hook `usePaymentsReport` (TDD)

**Files:**
- Test: `frontend/src/__tests__/features/reports/usePaymentsReport.test.ts`
- Create: `frontend/src/features/reports/hooks/usePaymentsReport.ts`

**Interfaces:**
- Consumes: `api.getPaymentMethodSummary` de `@/services/api`, `useExchangeRateStore` de `@/stores/exchangeRateStore`, `formatPaymentMethodName` de `@/lib/utils`, tipos de `../types`
- Produces: `usePaymentsReport(params: UsePaymentsReportParams): UsePaymentsReportReturn`

- [ ] **Step 1: Escribir tests que fallen para `usePaymentsReport`**

Crear `frontend/src/__tests__/features/reports/usePaymentsReport.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePaymentsReport } from "@/features/reports/hooks/usePaymentsReport";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethodSummary: vi.fn(),
  },
}));

const mockPaymentsData = [
  {
    metodo_pago_id: 1,
    metodo_pago_nombre: "EFECTIVO_USD",
    moneda_default: "USD" as const,
    cantidad_pagos: 20,
    total_usd: 200,
    total_ves: 0,
    total_equivalente_usd: 200,
  },
  {
    metodo_pago_id: 2,
    metodo_pago_nombre: "PAGO_MOVIL",
    moneda_default: "VES" as const,
    cantidad_pagos: 10,
    total_usd: 0,
    total_ves: 5000,
    total_equivalente_usd: 100,
  },
  {
    metodo_pago_id: 3,
    metodo_pago_nombre: "TRANSFERENCIA",
    moneda_default: "VES" as const,
    cantidad_pagos: 0,
    total_usd: 0,
    total_ves: 0,
    total_equivalente_usd: 0,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getPaymentMethodSummary).mockResolvedValue(mockPaymentsData);
  useExchangeRateStore.setState({ tasa: 50 });
});

describe("usePaymentsReport", () => {
  it("inicia en loading=true y luego carga datos", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
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

    expect(result.current.rawData).toEqual(mockPaymentsData);
    expect(result.current.currSymbol).toBe("$");
  });

  it("calcula kpis correctamente en USD", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
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

    // Total equiv USD: 200 + 100 = 300
    expect(result.current.kpis.totalEquivUsd).toBe(300);
    expect(result.current.kpis.totalRecaudado).toBe(300);
    // Transacciones: 20 + 10 = 30
    expect(result.current.kpis.totalTransacciones).toBe(30);
    // Venta Promedio: 300 / 30 = 10
    expect(result.current.kpis.ventaPromedio).toBe(10);
    // Líder es EFECTIVO_USD
    expect(result.current.kpis.lider?.metodo_pago_nombre).toBe("EFECTIVO_USD");
  });

  it("calcula kpis y totales convertidos a VES", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "VES",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currSymbol).toBe("Bs ");
    expect(result.current.conversionRate).toBe(50);
    // 300 USD equiv * 50 = 15000 VES
    expect(result.current.kpis.totalRecaudado).toBe(15000);
    // 15000 / 30 = 500 VES promedio
    expect(result.current.kpis.ventaPromedio).toBe(500);

    // Pago móvil en VES: 100 * 50 = 5000
    const pagoMovil = result.current.tableData.find((p) => p.id === 2)!;
    expect(pagoMovil.totalEquiv).toBe(5000);
  });

  it("filtra por pestañas de tabla correctamente", async () => {
    const { result, rerender } = renderHook(
      ({ tab }) =>
        usePaymentsReport({
          from: "2026-09-10",
          to: "2026-10-09",
          currency: "USD",
          tableTab: tab,
          page: 1,
          pageSize: 10,
        }),
      { initialProps: { tab: "divisas" as const } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Divisas sólo debe tener EFECTIVO_USD
    expect(result.current.tableData).toHaveLength(1);
    expect(result.current.tableData[0].nombre).toBe("EFECTIVO_USD");

    // Bolívares debe tener PAGO_MOVIL y TRANSFERENCIA
    rerender({ tab: "bolivares" });
    expect(result.current.tableData).toHaveLength(2);
    expect(result.current.tableData.map((p) => p.nombre)).toEqual([
      "PAGO_MOVIL",
      "TRANSFERENCIA",
    ]);
  });

  it("pagina los datos correctamente", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
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
    vi.mocked(api.getPaymentMethodSummary).mockRejectedValueOnce(new Error("Fallo de red"));

    const { result } = renderHook(() =>
      usePaymentsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Fallo de red");
    });

    vi.mocked(api.getPaymentMethodSummary).mockResolvedValueOnce(mockPaymentsData);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.rawData).toEqual(mockPaymentsData);
    });
  });
});
```

- [ ] **Step 2: Ejecutar test y verificar que falla**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/usePaymentsReport.test.ts
```
Expected: FAIL (Cannot find module `@/features/reports/hooks/usePaymentsReport`).

- [ ] **Step 3: Implementar `usePaymentsReport.ts`**

Crear `frontend/src/features/reports/hooks/usePaymentsReport.ts`:

```typescript
import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { formatPaymentMethodName } from "@/lib/utils";
import type {
  UsePaymentsReportParams,
  UsePaymentsReportReturn,
  PaymentKpis,
  PaymentTableRow,
} from "../types";

export function usePaymentsReport({
  from,
  to,
  currency,
  tableTab,
  page,
  pageSize,
}: UsePaymentsReportParams): UsePaymentsReportReturn {
  const tasaBCV = useExchangeRateStore((s) => s.tasa);
  const conversionRate = currency === "VES" && tasaBCV > 0 ? tasaBCV : 1;
  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const [rawData, setRawData] = useState<PaymentMethodSummaryItem[]>([]);
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
        const res = await api.getPaymentMethodSummary({
          fecha_desde: from,
          fecha_hasta: to,
        });
        if (!cancelled) {
          setRawData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar reporte de métodos de pago",
          );
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

  const kpis = useMemo<PaymentKpis>(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let totalTransacciones = 0;
    let totalEquivUsd = 0;

    for (const m of rawData) {
      totalUsd = Math.round((totalUsd + (Number(m.total_usd) || 0)) * 100) / 100;
      totalVes = Math.round((totalVes + (Number(m.total_ves) || 0)) * 100) / 100;
      totalTransacciones += m.cantidad_pagos || 0;
      totalEquivUsd =
        Math.round((totalEquivUsd + (Number(m.total_equivalente_usd) || 0)) * 100) / 100;
    }

    const conPagos = rawData.filter((m) => (m.cantidad_pagos || 0) > 0);
    const lider =
      conPagos.length > 0
        ? conPagos.reduce(
            (best, m) =>
              (Number(m.total_equivalente_usd) || 0) >
              (Number(best.total_equivalente_usd) || 0)
                ? m
                : best,
            conPagos[0],
          )
        : null;

    const totalRecaudado =
      currency === "USD"
        ? totalEquivUsd
        : Math.round(totalEquivUsd * conversionRate * 100) / 100;

    const ventaPromedio =
      totalTransacciones > 0
        ? Math.round((totalRecaudado / totalTransacciones) * 100) / 100
        : 0;

    return {
      totalUsd,
      totalVes,
      totalTransacciones,
      totalEquivUsd,
      totalRecaudado,
      lider,
      ventaPromedio,
    };
  }, [rawData, currency, conversionRate]);

  const tableData = useMemo<PaymentTableRow[]>(() => {
    const sorted = [...rawData].sort(
      (a, b) => (Number(b.total_equivalente_usd) || 0) - (Number(a.total_equivalente_usd) || 0),
    );

    let filtered: PaymentMethodSummaryItem[];
    switch (tableTab) {
      case "divisas":
        filtered = sorted.filter((m) => m.moneda_default === "USD");
        break;
      case "bolivares":
        filtered = sorted.filter((m) => m.moneda_default === "VES");
        break;
      default:
        filtered = sorted;
        break;
    }

    return filtered.map((m) => {
      const equiv = Number(m.total_equivalente_usd) || 0;
      const totalEquiv =
        currency === "USD" ? equiv : Math.round(equiv * conversionRate * 100) / 100;
      const participacionFormatted =
        kpis.totalEquivUsd > 0
          ? ((equiv / kpis.totalEquivUsd) * 100).toFixed(1)
          : "0.0";

      return {
        id: m.metodo_pago_id,
        nombre: m.metodo_pago_nombre,
        nombreFormatted: formatPaymentMethodName(m.metodo_pago_nombre),
        monedaDefault: m.moneda_default,
        cantidadPagos: m.cantidad_pagos || 0,
        totalUsd: Number(m.total_usd) || 0,
        totalVes: Number(m.total_ves) || 0,
        totalEquiv,
        participacionPct: Number(participacionFormatted),
        participacionFormatted,
      };
    });
  }, [rawData, tableTab, currency, conversionRate, kpis.totalEquivUsd]);

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
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/usePaymentsReport.test.ts
```
Expected: PASS (6/6 tests passed).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/reports/hooks/usePaymentsReport.ts frontend/src/__tests__/features/reports/usePaymentsReport.test.ts
git commit -m "feat(reports): add usePaymentsReport hook with TDD"
```

---

### Task 3: Componente `PaymentsKpiCards`

**Files:**
- Create: `frontend/src/features/reports/components/PaymentsKpiCards.tsx`

**Interfaces:**
- Consumes: `PaymentKpis` de `../types`, `formatCurrency`, `formatPaymentMethodName` de `@/lib/utils`
- Produces: `PaymentsKpiCardsProps`: `{ kpis: PaymentKpis; loading: boolean; currency: "USD" | "VES"; currSymbol: string }`

- [ ] **Step 1: Crear `PaymentsKpiCards.tsx`**

Crear `frontend/src/features/reports/components/PaymentsKpiCards.tsx`:

```tsx
import { DollarSign, Banknote, Trophy, Receipt, TrendingUp } from "lucide-react";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";
import { Skeleton } from "@/ui-components/Skeleton";
import type { PaymentKpis } from "../types";

export interface PaymentsKpiCardsProps {
  kpis: PaymentKpis;
  loading: boolean;
  currency: "USD" | "VES";
  currSymbol: string;
}

export default function PaymentsKpiCards({
  kpis,
  loading,
  currency,
  currSymbol,
}: PaymentsKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Recaudado */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Recaudado</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            {currency === "USD" ? (
              <DollarSign className="size-4" />
            ) : (
              <Banknote className="size-4" />
            )}
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(kpis.totalRecaudado, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Equivalente total recibido</p>
        </div>
      </div>

      {/* Método Principal */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Método Principal</span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
            <Trophy className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : kpis.lider ? (
            <>
              <div
                className="truncate text-xl font-bold tracking-tight text-slate-900"
                title={formatPaymentMethodName(kpis.lider.metodo_pago_nombre)}
              >
                {formatPaymentMethodName(kpis.lider.metodo_pago_nombre)}
              </div>
              <p className="mt-1 text-xs text-amber-600 font-medium">
                {kpis.totalEquivUsd > 0
                  ? `${(
                      ((Number(kpis.lider.total_equivalente_usd) || 0) / kpis.totalEquivUsd) *
                      100
                    ).toFixed(1)}% del total recibido`
                  : `${kpis.lider.cantidad_pagos} pagos`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Sin pagos en el período</p>
          )}
        </div>
      </div>

      {/* Total Transacciones */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Ventas</span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <Receipt className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.totalTransacciones.toLocaleString("es-VE")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Operaciones completadas</p>
        </div>
      </div>

      {/* Venta Promedio */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Venta Promedio</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-emerald-600">
              {formatCurrency(kpis.ventaPromedio, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Promedio por transacción</p>
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
git add frontend/src/features/reports/components/PaymentsKpiCards.tsx
git commit -m "feat(reports): add PaymentsKpiCards component"
```

---

### Task 4: Componente `PaymentsToolbar`

**Files:**
- Create: `frontend/src/features/reports/components/PaymentsToolbar.tsx`

**Interfaces:**
- Consumes: `PaymentChartMode`, `ReportViewMode` de `../types`
- Produces: `PaymentsToolbarProps`: `{ viewMode: ReportViewMode; chartMode: PaymentChartMode; onViewModeChange: (v: ReportViewMode) => void; onChartModeChange: (c: PaymentChartMode) => void; onExport: () => void }`

- [ ] **Step 1: Crear `PaymentsToolbar.tsx`**

Crear `frontend/src/features/reports/components/PaymentsToolbar.tsx`:

```tsx
import {
  PieChart as PieChartIcon,
  BarChart2,
  Table as TableIcon,
  Download,
} from "lucide-react";
import Button from "@/ui-components/Button";
import type { ReportViewMode, PaymentChartMode } from "../types";

export interface PaymentsToolbarProps {
  viewMode: ReportViewMode;
  chartMode: PaymentChartMode;
  onViewModeChange: (v: ReportViewMode) => void;
  onChartModeChange: (c: PaymentChartMode) => void;
  onExport: () => void;
}

export default function PaymentsToolbar({
  viewMode,
  chartMode,
  onViewModeChange,
  onChartModeChange,
  onExport,
}: PaymentsToolbarProps) {
  const chartTitle =
    chartMode === "donut"
      ? "Distribución por Método de Pago"
      : "Comparativa de Recaudación";

  const viewModeTitle =
    viewMode === "chart" ? chartTitle : "Tabla de Desglose de Pagos";

  const subtitle =
    viewMode === "chart"
      ? chartMode === "donut"
        ? "Participación porcentual y monto equivalente recibido por método"
        : "Monto total equivalente recibido por cada método de pago"
      : "Haz clic en las pestañas para filtrar por tipo de moneda";

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">{viewModeTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Chart mode toggle (only when chart view) */}
        {viewMode === "chart" && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => onChartModeChange("donut")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                chartMode === "donut"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PieChartIcon className="size-3.5" />
              Distribución
            </button>
            <button
              type="button"
              onClick={() => onChartModeChange("bars")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                chartMode === "bars"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart2 className="size-3.5" />
              Comparativa
            </button>
          </div>
        )}

        {/* View mode toggle: Gráfico vs Tabla */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange("chart")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "chart"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="size-3.5" />
            Gráfico
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="size-3.5" />
            Tabla
          </button>
        </div>

        {/* Export button (only table mode) */}
        {viewMode === "table" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-1.5 text-xs text-slate-700"
          >
            <Download className="size-3.5" />
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
git add frontend/src/features/reports/components/PaymentsToolbar.tsx
git commit -m "feat(reports): add PaymentsToolbar component"
```

---

### Task 5: Componente `PaymentsChartSection`

**Files:**
- Create: `frontend/src/features/reports/components/PaymentsChartSection.tsx`

**Interfaces:**
- Consumes: `PaymentMethodsDonut`, `PaymentMethodsBarChart`, `PaymentMethodSummaryItem` de `@/types/api`, `PaymentChartMode` de `../types`
- Produces: `PaymentsChartSectionProps`: `{ chartMode: PaymentChartMode; data: PaymentMethodSummaryItem[]; currency: "USD" | "VES"; currSymbol: string; conversionRate: number }`

- [ ] **Step 1: Crear `PaymentsChartSection.tsx`**

Crear `frontend/src/features/reports/components/PaymentsChartSection.tsx`:

```tsx
import { lazy, Suspense } from "react";
import { Skeleton } from "@/ui-components/Skeleton";
import type { PaymentMethodSummaryItem } from "@/types/api";
import type { PaymentChartMode } from "../types";

const PaymentMethodsDonut = lazy(() => import("./PaymentMethodsDonut"));
const PaymentMethodsBarChart = lazy(() => import("./PaymentMethodsBarChart"));

export interface PaymentsChartSectionProps {
  chartMode: PaymentChartMode;
  data: PaymentMethodSummaryItem[];
  currency: "USD" | "VES";
  currSymbol: string;
  conversionRate: number;
}

export default function PaymentsChartSection({
  chartMode,
  data,
  currency,
  currSymbol,
  conversionRate,
}: PaymentsChartSectionProps) {
  return (
    <div>
      <Suspense fallback={<Skeleton className="h-75 w-full" />}>
        {chartMode === "donut" ? (
          <PaymentMethodsDonut
            data={data}
            currency={currency}
            currSymbol={currSymbol}
            conversionRate={conversionRate}
          />
        ) : (
          <PaymentMethodsBarChart
            data={data}
            currency={currency}
            currSymbol={currSymbol}
            conversionRate={conversionRate}
          />
        )}
      </Suspense>
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
git add frontend/src/features/reports/components/PaymentsChartSection.tsx
git commit -m "feat(reports): add PaymentsChartSection component with Suspense"
```

---

### Task 6: Componente `PaymentsTable`

**Files:**
- Create: `frontend/src/features/reports/components/PaymentsTable.tsx`

**Interfaces:**
- Consumes: `Pagination`, `formatCurrency`, `PaymentTableRow`, `PaymentTableTab`
- Produces: `PaymentsTableProps`

- [ ] **Step 1: Crear `PaymentsTable.tsx`**

Crear `frontend/src/features/reports/components/PaymentsTable.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";
import Pagination from "@/ui-components/Pagination";
import type { PaymentTableRow, PaymentTableTab } from "../types";

export interface PaymentsTableProps {
  data: PaymentTableRow[];
  totalRows: number;
  page: number;
  totalPages: number;
  pageSize: number;
  tableTab: PaymentTableTab;
  currency: "USD" | "VES";
  currSymbol: string;
  onTabChange: (tab: PaymentTableTab) => void;
  onPageChange: (page: number) => void;
}

const TABLE_TABS: { id: PaymentTableTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "divisas", label: "Divisas (USD)" },
  { id: "bolivares", label: "Bolívares (VES)" },
];

export default function PaymentsTable({
  data,
  totalRows,
  page,
  totalPages,
  pageSize,
  tableTab,
  currency,
  currSymbol,
  onTabChange,
  onPageChange,
}: PaymentsTableProps) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs with horizontal scroll for mobile */}
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
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="py-3 px-4">Método de Pago</th>
              <th className="py-3 px-4 text-center">Transacciones</th>
              <th className="py-3 px-4 text-right">Total USD</th>
              <th className="py-3 px-4 text-right">Total VES</th>
              <th className="py-3 px-4 text-right">Equiv. ({currency})</th>
              <th className="py-3 px-4 text-right">Participación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                  No hay métodos de pago registrados en este filtro
                </td>
              </tr>
            ) : (
              data.map((m) => {
                const isUsd = m.monedaDefault === "USD";

                return (
                  <tr
                    key={m.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {m.nombreFormatted}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                            isUsd
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {m.monedaDefault}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">
                      {m.cantidadPagos}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(m.totalUsd, "$")}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(m.totalVes, "Bs ")}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-brand-blue">
                      {formatCurrency(m.totalEquiv, currSymbol)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-brand-blue rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, m.participacionPct),
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {m.participacionFormatted}%
                        </span>
                      </div>
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
            de <span className="font-medium text-slate-700">{totalRows}</span> métodos
          </p>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
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
git add frontend/src/features/reports/components/PaymentsTable.tsx
git commit -m "feat(reports): add PaymentsTable presentation component"
```

---

### Task 7: Tests unitarios de componentes de presentación

**Files:**
- Create: `frontend/src/__tests__/features/reports/PaymentsComponents.test.tsx`

**Interfaces:**
- Verifica: `PaymentsKpiCards`, `PaymentsToolbar`, `PaymentsTable`

- [ ] **Step 1: Crear `PaymentsComponents.test.tsx`**

Crear `frontend/src/__tests__/features/reports/PaymentsComponents.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentsKpiCards from "@/features/reports/components/PaymentsKpiCards";
import PaymentsToolbar from "@/features/reports/components/PaymentsToolbar";
import PaymentsTable from "@/features/reports/components/PaymentsTable";
import type { PaymentKpis, PaymentTableRow } from "@/features/reports/types";

describe("PaymentsKpiCards", () => {
  const mockKpis: PaymentKpis = {
    totalUsd: 1500,
    totalVes: 50000,
    totalTransacciones: 45,
    totalEquivUsd: 2500,
    totalRecaudado: 2500,
    lider: {
      metodo_pago_id: 1,
      metodo_pago_nombre: "PUNTO_VENTA",
      moneda_default: "VES",
      cantidad_pagos: 30,
      total_usd: 0,
      total_ves: 50000,
      total_equivalente_usd: 1500,
    },
    ventaPromedio: 55.55,
  };

  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(
      <PaymentsKpiCards kpis={mockKpis} loading={true} currency="USD" currSymbol="$" />,
    );
    expect(screen.getByText("Total Recaudado")).toBeInTheDocument();
    expect(screen.getByText("Método Principal")).toBeInTheDocument();
    expect(screen.getByText("Total Ventas")).toBeInTheDocument();
    expect(screen.getByText("Venta Promedio")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra valores formateados cuando loading es false", () => {
    render(
      <PaymentsKpiCards kpis={mockKpis} loading={false} currency="USD" currSymbol="$" />,
    );
    expect(screen.getByText("$2.500,00")).toBeInTheDocument();
    expect(screen.getByText("Punto Venta")).toBeInTheDocument();
    expect(screen.getByText("60.0% del total recibido")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("$55,55")).toBeInTheDocument();
  });
});

describe("PaymentsToolbar", () => {
  it("renderiza botones de modo de gráfico y responde al toggle", async () => {
    const onChartModeChange = vi.fn();
    render(
      <PaymentsToolbar
        viewMode="chart"
        chartMode="donut"
        onViewModeChange={vi.fn()}
        onChartModeChange={onChartModeChange}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText("Distribución por Método de Pago")).toBeInTheDocument();
    const comparativaBtn = screen.getByRole("button", { name: /comparativa/i });
    expect(comparativaBtn).toBeInTheDocument();
    await userEvent.click(comparativaBtn);
    expect(onChartModeChange).toHaveBeenCalledWith("bars");
  });

  it("muestra botón exportar solo en modo tabla", async () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <PaymentsToolbar
        viewMode="chart"
        chartMode="donut"
        onViewModeChange={vi.fn()}
        onChartModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();

    rerender(
      <PaymentsToolbar
        viewMode="table"
        chartMode="donut"
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

describe("PaymentsTable", () => {
  const mockRows: PaymentTableRow[] = [
    {
      id: 1,
      nombre: "ZELLE",
      nombreFormatted: "Zelle",
      monedaDefault: "USD",
      cantidadPagos: 15,
      totalUsd: 450,
      totalVes: 0,
      totalEquiv: 450,
      participacionPct: 50.0,
      participacionFormatted: "50.0",
    },
  ];

  it("renderiza columnas, badge de moneda, fila y responde al cambio de pestaña", async () => {
    const onTabChange = vi.fn();
    render(
      <PaymentsTable
        data={mockRows}
        totalRows={1}
        page={1}
        totalPages={1}
        pageSize={10}
        tableTab="todos"
        currency="USD"
        currSymbol="$"
        onTabChange={onTabChange}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Zelle")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("$450,00")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();

    const divisasTab = screen.getByRole("button", { name: /divisas \(usd\)/i });
    await userEvent.click(divisasTab);
    expect(onTabChange).toHaveBeenCalledWith("divisas");
  });
});
```

- [ ] **Step 2: Ejecutar tests y verificar que pasan**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/PaymentsComponents.test.tsx
```
Expected: PASS (5/5 tests passed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/features/reports/PaymentsComponents.test.tsx
git commit -m "test(reports): add unit tests for payments presentation components"
```

---

### Task 8: Refactorizar `ReportsPaymentsPage.tsx` como orquestador y verificar suite completa

**Files:**
- Modify: `frontend/src/features/reports/pages/ReportsPaymentsPage.tsx`

**Interfaces:**
- Consumes: `usePaymentsReport`, `PaymentsKpiCards`, `PaymentsToolbar`, `PaymentsChartSection`, `PaymentsTable`, `exportToExcel`, `ErrorBanner`

- [ ] **Step 1: Reescribir `ReportsPaymentsPage.tsx`**

Reemplazar `frontend/src/features/reports/pages/ReportsPaymentsPage.tsx` por la versión orquestadora:

```tsx
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { Skeleton } from "@/ui-components/Skeleton";
import type { Column } from "@/ui-components/Table";
import type {
  ReportViewMode,
  PaymentChartMode,
  PaymentTableTab,
  PaymentTableRow,
} from "../types";
import { usePaymentsReport } from "../hooks/usePaymentsReport";
import PaymentsKpiCards from "../components/PaymentsKpiCards";
import PaymentsToolbar from "../components/PaymentsToolbar";
import PaymentsChartSection from "../components/PaymentsChartSection";
import PaymentsTable from "../components/PaymentsTable";

export default function ReportsPaymentsPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [viewMode, setViewMode] = useState<ReportViewMode>("chart");
  const [chartMode, setChartMode] = useState<PaymentChartMode>("donut");
  const [tableTab, setTableTab] = useState<PaymentTableTab>("todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page when filtering or date changes
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
  } = usePaymentsReport({
    from,
    to,
    currency,
    tableTab,
    page,
    pageSize,
  });

  const handleExport = () => {
    const currKey = currency.toLowerCase();
    const columns: Column<PaymentTableRow>[] = [
      { key: "nombreFormatted", header: "Método de Pago" },
      { key: "monedaDefault", header: "Moneda Origen" },
      { key: "cantidadPagos", header: "Transacciones" },
      {
        key: "totalUsd",
        header: "Total Cobrado USD",
        exportValue: (r) => r.totalUsd,
      },
      {
        key: "totalVes",
        header: "Total Cobrado VES",
        exportValue: (r) => r.totalVes,
      },
      {
        key: "totalEquiv",
        header: `Total Equiv. (${currency})`,
        exportValue: (r) => r.totalEquiv,
      },
      {
        key: "participacionPct",
        header: "Participación %",
        exportValue: (r) => r.participacionPct,
      },
    ];

    exportToExcel({
      data: tableData,
      columns,
      filename: `reporte_metodos_pago_${tableTab}_${currKey}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={retry}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <PaymentsKpiCards
        kpis={kpis}
        loading={loading}
        currency={currency}
        currSymbol={currSymbol}
      />

      <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 shadow-xs min-w-0 max-w-full">
        <PaymentsToolbar
          viewMode={viewMode}
          chartMode={chartMode}
          onViewModeChange={setViewMode}
          onChartModeChange={setChartMode}
          onExport={handleExport}
        />

        {loading ? (
          <div className="flex h-75 items-center justify-center">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : viewMode === "chart" ? (
          <PaymentsChartSection
            chartMode={chartMode}
            data={rawData}
            currency={currency}
            currSymbol={currSymbol}
            conversionRate={conversionRate}
          />
        ) : (
          <PaymentsTable
            data={paginatedData}
            totalRows={totalRows}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            tableTab={tableTab}
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
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm test src/__tests__/features/reports/ReportsPaymentsPage.test.tsx
```
Expected: PASS (los 7 tests existentes pasan al 100% sin modificaciones en el archivo de prueba).

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
git add frontend/src/features/reports/pages/ReportsPaymentsPage.tsx
git commit -m "refactor(reports): rewrite ReportsPaymentsPage as lightweight orchestrator"
```
