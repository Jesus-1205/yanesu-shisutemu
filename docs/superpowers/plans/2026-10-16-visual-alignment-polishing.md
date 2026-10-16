# Visual Alignment Polishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harmonize visual inconsistencies in Compras Hub and Dashboard to achieve 100% design system alignment across the application.

**Architecture:**
- Update `breadcrumbMap` in `frontend/src/App.tsx` to map `"buys"` to localized `"Compras"`.
- Refactor `ComprasHubStats.tsx` from fully-tinted backgrounds to standard white SaaS cards (`bg-surface border-slate-200`) with accent icon badges, using centralized `formatCurrency` (`es-VE` locale).
- Add subtitle to `DashboardPage.tsx` header for typographic rhythm consistency with other main views.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Vitest, Testing Library.

**Spec:** Visual alignment review observations from October 16, 2026.

## Global Constraints

- TypeScript strict mode: zero usage of `any`.
- Currency formatting: always use `formatCurrency(amount)` from `@/lib/utils` (Venezuelan `es-VE` standard: dot for thousands, comma for decimals).
- All Node commands in non-interactive PowerShell shells must prepend fnm PATH:
  `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;`
- Do NOT make git commits or git push unless explicitly requested by the user.

---

### Task 1: Breadcrumb Localization for `/buys` Route

**Files:**
- Modify: `frontend/src/App.tsx:74-93`
- Test: `frontend/src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `breadcrumbMap` in `frontend/src/App.tsx`
- Produces: Correct breadcrumb label `"Compras"` when visiting `/buys`

- [ ] **Step 1: Write the failing test in `frontend/src/__tests__/App.test.tsx`**

Add an integration test verifying that visiting `/buys` displays `"Compras"` in the breadcrumb rather than raw `"buys"`:

```tsx
  it("displays 'Compras' in breadcrumb when navigating to /buys", async () => {
    renderApp("/buys");
    const breadcrumbNav = screen.getByRole("navigation", { name: /Breadcrumb/i });
    expect(within(breadcrumbNav).getByText("Compras")).toBeInTheDocument();
    expect(within(breadcrumbNav).queryByText("buys")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/App.test.tsx
```
Expected: FAIL (renders "buys", not "Compras").

- [ ] **Step 3: Update `breadcrumbMap` in `frontend/src/App.tsx`**

Add `buys: "Compras"` to `breadcrumbMap`:

```tsx
const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  buys: "Compras",
  compras: "Compras",
  products: "Productos",
  categories: "Categorías",
  suppliers: "Proveedores",
  sales: "Ventas",
  users: "Usuarios",
  "exchange-rates": "Tasas de Cambio",
  reports: "Reportes",
  retornables: "Retornables",
  invoices: "Facturas de Compra",
  "payment-methods": "Métodos de Pago",
  "price-rules": "Precios Div.",
  "combos": "Combos",
  settings: "Configuración",
  system: "API Keys",
  new: "Nuevo",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/App.test.tsx
```
Expected: PASS (5/5 tests passing).

---

### Task 2: Standardize Compras Hub KPI Cards and Venezuelan Currency Formatting

**Files:**
- Modify: `frontend/src/features/invoices/components/ComprasHubStats.tsx`
- Modify: `frontend/src/__tests__/features/invoices/ComprasHubComponents.test.tsx`
- Modify: `frontend/src/__tests__/features/invoices/ComprasHubPage.test.tsx`

**Interfaces:**
- Consumes: `InvoiceStatsOut`, `InvoicePendingSummaryOut`, `formatCurrency` from `@/lib/utils`
- Produces: `<ComprasHubStats pending={...} stats={...} upcomingDueCount={...} />`

- [ ] **Step 1: Update unit tests for `es-VE` formatting and standard layout**

In `frontend/src/__tests__/features/invoices/ComprasHubComponents.test.tsx`:
Change assertion from `"$1,250.75"` to `"$1.250,75"`:

```tsx
    expect(screen.getByText("Total Pendiente (USD)")).toBeInTheDocument();
    expect(screen.getByText("$1.250,75")).toBeInTheDocument();
    expect(screen.getByText("Facturas Pagadas")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Por Vencer (7 días)")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
```

In `frontend/src/__tests__/features/invoices/ComprasHubPage.test.tsx`:
Change assertion from `"$150.00"` to `"$150,00"`:

```tsx
  it("displays pending total USD KPI", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("$150,00")).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/invoices/ComprasHubComponents.test.tsx src/__tests__/features/invoices/ComprasHubPage.test.tsx
```
Expected: FAIL due to string mismatch (`$1,250.75` vs `$1.250,75`).

- [ ] **Step 3: Refactor `ComprasHubStats.tsx` to match system card standard**

Replace the implementation of `frontend/src/features/invoices/components/ComprasHubStats.tsx`:

```tsx
import React from "react";
import { DollarSign, CheckCircle2, Clock, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceStatsOut, InvoicePendingSummaryOut } from "@/types/api";

export interface ComprasHubStatsProps {
  pending: InvoicePendingSummaryOut | null;
  stats: InvoiceStatsOut | null;
  upcomingDueCount: number;
}

export const ComprasHubStats: React.FC<ComprasHubStatsProps> = ({
  pending,
  stats,
  upcomingDueCount,
}) => {
  const isPendingAlert = (pending?.total_pendiente_usd ?? 0) > 0;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Pendiente */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Pendiente (USD)
          </span>
          <div
            className={`rounded-lg p-2 ${
              isPendingAlert ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <DollarSign className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(pending?.total_pendiente_usd ?? 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Saldo por pagar a proveedores</p>
        </div>
      </div>

      {/* Facturas Pagadas */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Facturas Pagadas
          </span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {stats?.pagadas ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Comprobantes liquidados</p>
        </div>
      </div>

      {/* Por Vencer (7 días) */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Por Vencer (7 días)
          </span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
            <Clock className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {upcomingDueCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Vencimiento próximo</p>
        </div>
      </div>

      {/* Proveedores */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Proveedores
          </span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <Building2 className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {stats?.total ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Registrados con compras</p>
        </div>
      </div>
    </div>
  );
};

export default ComprasHubStats;
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/invoices/ComprasHubComponents.test.tsx src/__tests__/features/invoices/ComprasHubPage.test.tsx
```
Expected: PASS.

---

### Task 3: Dashboard Header Subtitle Alignment

**Files:**
- Modify: `frontend/src/features/dashboard/pages/DashboardPage.tsx:26-30`
- Test: `frontend/src/__tests__/features/dashboard/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `<DashboardPage />`
- Produces: Header with title "Dashboard" and subtitle "Resumen general y métricas clave del negocio"

- [ ] **Step 1: Write test for header and subtitle in `DashboardPage.test.tsx`**

Add test to `frontend/src/__tests__/features/dashboard/DashboardPage.test.tsx`:

```tsx
  it("renderiza el titulo y subtitulo descriptivo del dashboard", async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesSummary);
    vi.mocked(api.getTopSellingProducts).mockResolvedValue([]);
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockInvoiceStats);
    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue(mockPendingSummary);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByText("Resumen general y métricas clave del negocio")).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/dashboard/DashboardPage.test.tsx
```
Expected: FAIL (subtitle text not found).

- [ ] **Step 3: Update `DashboardPage.tsx` header**

In `frontend/src/features/dashboard/pages/DashboardPage.tsx`:

```tsx
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-responsive-h1 text-text-main">Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Resumen general y métricas clave del negocio
        </p>
      </div>

      <DashboardShortcuts />
...
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/dashboard/DashboardPage.test.tsx
```
Expected: PASS.

---

### Task 4: Global Verification (Typecheck & Suite Regression)

**Files:**
- Full suite verification across touched features.

- [ ] **Step 1: Run TypeScript compiler check**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b
```
Expected: 0 errors.

- [ ] **Step 2: Run unit and integration tests for affected features**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/App.test.tsx src/__tests__/features/dashboard/DashboardPage.test.tsx src/__tests__/features/invoices/ComprasHubComponents.test.tsx src/__tests__/features/invoices/ComprasHubPage.test.tsx
```
Expected: ALL PASS.
