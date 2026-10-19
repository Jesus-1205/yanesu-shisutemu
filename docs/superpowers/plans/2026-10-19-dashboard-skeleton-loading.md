# Dashboard Skeleton UI and Smooth Fade-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the jarring full-page loading spinner in the Dashboard with a comprehensive, layout-matching skeleton UI (`DashboardSkeleton`) and a smooth, accessible fade-in animation (`motion-safe:animate-[fadeIn_250ms_ease-out]`).

**Architecture:** Following the `frontend-module-refactor` guidelines, presentational loading skeleton markup is encapsulated in a dedicated dumb component (`DashboardSkeleton.tsx`) that mirrors the exact responsive grid layout of shortcuts, KPI cards, pending invoice banner, and charts. `DashboardPage.tsx` coordinates loading state by persistently rendering the page title and swapping between the skeleton and the content wrapped in a gentle fade-in container.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Lucide React, Vitest, React Testing Library.

**Spec:** In-conversation design approval for Option 1 ("Skeleton Integral + Fade In") during brainstorming session on 2026-10-19.

## Global Constraints

- Prohibido el uso de `any` en TypeScript; tipado estricto en todas las props e interfaces.
- Utilizar componentes funcionales limpios con destructuración de props.
- Respetar los estilos y paleta de Tailwind v4 existentes (`bg-surface`, `border-slate-200`, `animate-pulse`, `motion-safe:animate-[fadeIn_250ms_ease-out]`).
- Los comandos de frontend deben anteponer el path de Node fnm: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend <command>`.
- Preservar accesibilidad utilizando atributos `aria-busy="true"` en el skeleton y `motion-safe` en las animaciones.

---

### Task 1: Create `DashboardSkeleton` Component and Unit Tests

**Files:**
- Create: `frontend/src/features/dashboard/components/DashboardSkeleton.tsx`
- Test: `frontend/src/__tests__/features/dashboard/DashboardSkeleton.test.tsx`

**Interfaces:**
- Produces: `export default function DashboardSkeleton(): JSX.Element`
- Consumes: Tailwind CSS utility classes and `ui-components/charts/ChartSkeleton`

- [ ] **Step 1: Write the failing unit test for `DashboardSkeleton`**

Create `frontend/src/__tests__/features/dashboard/DashboardSkeleton.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardSkeleton from "@/features/dashboard/components/DashboardSkeleton";

describe("DashboardSkeleton", () => {
  it("renderiza la estructura completa del skeleton con data-testid y aria-busy", () => {
    render(<DashboardSkeleton />);

    const skeletonRoot = screen.getByTestId("dashboard-skeleton");
    expect(skeletonRoot).toBeInTheDocument();
    expect(skeletonRoot).toHaveAttribute("aria-busy", "true");
  });

  it("renderiza los bloques de skeleton correspondientes a shortcuts, kpis, banner y graficos", () => {
    render(<DashboardSkeleton />);

    // Verifica la presencia de bloques con pulso
    const pulseElements = document.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThanOrEqual(10);

    // Verifica que existan 4 skeletons de accesos directos
    const shortcutSkeletons = screen.getByTestId("skeleton-shortcuts");
    expect(shortcutSkeletons.children.length).toBe(4);

    // Verifica que existan 5 skeletons de tarjetas KPI
    const kpiSkeletons = screen.getByTestId("skeleton-kpis");
    expect(kpiSkeletons.children.length).toBe(5);

    // Verifica la presencia del banner de facturas pendientes
    expect(screen.getByTestId("skeleton-pending-invoices")).toBeInTheDocument();

    // Verifica la presencia de los 2 contenedores de graficos
    const chartSkeletons = screen.getByTestId("skeleton-charts");
    expect(chartSkeletons.children.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend test src/__tests__/features/dashboard/DashboardSkeleton.test.tsx`
Expected: FAIL with "Cannot find module '@/features/dashboard/components/DashboardSkeleton'"

- [ ] **Step 3: Implement `DashboardSkeleton`**

Create `frontend/src/features/dashboard/components/DashboardSkeleton.tsx`:
```tsx
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";

export default function DashboardSkeleton() {
  return (
    <div
      data-testid="dashboard-skeleton"
      aria-busy="true"
      aria-label="Cargando panel principal"
      className="space-y-6"
    >
      {/* 1. Shortcuts Skeleton (4 tarjetas) */}
      <div
        data-testid="skeleton-shortcuts"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-surface p-4 shadow-xs"
          >
            <div className="size-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* 2. Micro KPIs Skeleton (5 tarjetas) */}
      <div
        data-testid="skeleton-kpis"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-12"
      >
        {/* 4 KPIs estándar (2 cols c/u en lg) */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 lg:col-span-2"
          >
            <div className="mb-2 flex items-start justify-between sm:mb-3">
              <div className="h-3.5 w-20 animate-pulse rounded bg-slate-200" />
              <div className="size-8 animate-pulse rounded-lg bg-slate-200" />
            </div>
            <div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}

        {/* 1 KPI Ventas Semanal (4 cols en lg) */}
        <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 lg:col-span-4">
          <div className="mb-2 flex items-start justify-between sm:mb-3">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
            <div className="size-8 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
        </div>
      </div>

      {/* 3. Facturas Pendientes Banner Skeleton */}
      <div
        data-testid="skeleton-pending-invoices"
        className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 sm:p-5"
      >
        <div className="mb-2 flex items-start justify-between sm:mb-3">
          <div className="h-3.5 w-64 animate-pulse rounded bg-amber-200/70" />
          <div className="size-8 animate-pulse rounded-lg bg-amber-200/70" />
        </div>
        <div className="h-8 w-36 animate-pulse rounded bg-amber-200/70" />
      </div>

      {/* 4. Charts Skeleton (7 cols + 5 cols) */}
      <div
        data-testid="skeleton-charts"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        {/* Gráfico Tendencia de Ventas (7 cols) */}
        <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-6 lg:col-span-7">
          <div className="mb-4 h-5 w-56 animate-pulse rounded bg-slate-200" />
          <ChartSkeleton height={280} />
        </div>

        {/* Gráfico Top 5 Productos (5 cols) */}
        <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-6 lg:col-span-5">
          <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200" />
          <ChartSkeleton height={280} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend test src/__tests__/features/dashboard/DashboardSkeleton.test.tsx`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/components/DashboardSkeleton.tsx frontend/src/__tests__/features/dashboard/DashboardSkeleton.test.tsx
git commit -m "feat(dashboard): create DashboardSkeleton component mimicking dashboard layout"
```

---

### Task 2: Integrate `DashboardSkeleton` and Smooth Fade-in in `DashboardPage`

**Files:**
- Modify: `frontend/src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `frontend/src/__tests__/features/dashboard/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `DashboardSkeleton` component from Task 1
- Produces: Updated `DashboardPage` that maintains persistent header and transitions smoothly between skeleton and data.

- [ ] **Step 1: Update `DashboardPage.test.tsx` to assert skeleton and persistent header**

In `frontend/src/__tests__/features/dashboard/DashboardPage.test.tsx`, update the loading test:
```tsx
  it("renderiza el skeleton y el titulo persistentemente durante la carga inicial", () => {
    vi.mocked(api.getDashboardStats).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getSalesSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTopSellingProducts).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getInvoicePendingSummary).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // El encabezado siempre esta presente (no desaparece ni salta)
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Resumen general y métricas clave del negocio"),
    ).toBeInTheDocument();

    // El skeleton se muestra mientras carga
    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();

    // Los datos reales todavia no estan presentes
    expect(screen.queryByText("Punto de Venta")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend test src/__tests__/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because `DashboardPage` currently renders `<Spinner />` and hides the header and skeleton.

- [ ] **Step 3: Update `DashboardPage.tsx`**

Replace `frontend/src/features/dashboard/pages/DashboardPage.tsx`:
```tsx
import { useDashboardData } from "../hooks/useDashboardData";
import DashboardShortcuts from "../components/DashboardShortcuts";
import DashboardKpis from "../components/DashboardKpis";
import DashboardCharts from "../components/DashboardCharts";
import DashboardSkeleton from "../components/DashboardSkeleton";

export default function DashboardPage() {
  const {
    loading,
    stats,
    ventasSemana,
    salesSummary,
    topProducts,
    pendingSummary,
    pendingCount,
  } = useDashboardData();

  return (
    <div className="space-y-6">
      {/* Encabezado persistente: no parpadea ni salta durante recargas */}
      <div>
        <h1 className="text-responsive-h1 text-text-main">Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Resumen general y métricas clave del negocio
        </p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6 motion-safe:animate-[fadeIn_250ms_ease-out]">
          <DashboardShortcuts />
          <DashboardKpis
            stats={stats}
            ventasSemana={ventasSemana}
            pendingSummary={pendingSummary}
            pendingCount={pendingCount}
          />
          <DashboardCharts
            salesSummary={salesSummary}
            topProducts={topProducts}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend test src/__tests__/features/dashboard/DashboardPage.test.tsx`
Expected: PASS (all tests in `DashboardPage.test.tsx` pass)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/pages/DashboardPage.tsx frontend/src/__tests__/features/dashboard/DashboardPage.test.tsx
git commit -m "feat(dashboard): replace spinner with DashboardSkeleton and smooth fade-in transition"
```

---

### Task 3: Comprehensive Test Suite & TypeScript Verification

**Files:**
- Test all: `frontend/src/__tests__/features/dashboard/`

**Requirements:**
- [ ] **Step 1: Run full frontend dashboard test suite**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend test src/__tests__/features/dashboard/`
Expected: All test files passing (6 files: DashboardSkeleton, DashboardPage, DashboardComponents, Charts, useDashboardData, useAnalyticsData), 100% pass rate.

- [ ] **Step 2: Run TypeScript compiler check**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend exec tsc --noEmit`
Expected: 0 errors, exit code 0.

- [ ] **Step 3: Verification confirmation**

Confirm no warnings, regressions, or unformatted files remain in `git status`.
```bash
git status -s
```
Expected: Clean working tree.
