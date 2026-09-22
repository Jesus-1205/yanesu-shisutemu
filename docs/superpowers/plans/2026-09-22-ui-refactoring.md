# UI Refactoring and Global State Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor frontend domain pages (Sales and Invoices) to extract inline filtering UI into dedicated components and migrate local filter states to global Zustand stores. This ensures state persistence across navigations and dramatically reduces file size and complexity in main page components without altering business logic.

**Architecture:** We will adopt the established `invoices` pattern across domains by creating specialized Zustand stores for filter state management (e.g., `salesFiltersStore`). To prevent the "Fat Page" anti-pattern, we will completely decouple bloated inline UI elements from `*Page.tsx` files into granular functional components (`<SalesFilters />`, `<SaleSummaryCards />`, `<InvoiceFilters />`). The main page components will be responsible solely for laying out components and mounting the data table.

**Tech Stack:** React 19, TypeScript 5.7, Zustand 5, Tailwind v4, vitest

**Spec:** UI Refactoring and Global State Domain Plan

## Global Constraints

- No business logic, calculation engines, or API payload formats can be changed or omitted.
- Zustand stores must follow the exact interface pattern currently used in `invoiceFiltersStore.ts` (`INITIAL_STATE`, `setField`, `clearAll`).
- TypeScript strict mode applies (no `any`). Interfaces must be exported and typed properly.
- Never write tests that require a live DOM element not provided by standard `@testing-library/react`.

---

### Task 1: Create Sales Filters Zustand Store

**Files:**
- Create: `frontend/src/features/sales/store/salesFiltersStore.ts`
- Create: `frontend/src/__tests__/features/sales/salesFiltersStore.test.ts`

**Interfaces:**
- Produces: `useSalesFiltersStore` containing `fechaDesde`, `fechaHasta`, `horaDesde`, `horaHasta`, `metodoPagoIds`, `page`, and mutators `setField`, `clearAll`.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/features/sales/salesFiltersStore.test.ts
import { describe, it, expect } from "vitest";
import { useSalesFiltersStore } from "../../../features/sales/store/salesFiltersStore";

describe("useSalesFiltersStore", () => {
  it("initializes with default values", () => {
    const state = useSalesFiltersStore.getState();
    expect(state.page).toBe(1);
    expect(state.metodoPagoIds).toEqual([]);
    expect(state.fechaDesde).toBe("");
  });

  it("updates fields correctly", () => {
    useSalesFiltersStore.getState().setField("page", 2);
    expect(useSalesFiltersStore.getState().page).toBe(2);
  });

  it("clears all fields", () => {
    useSalesFiltersStore.getState().setField("fechaDesde", "2024-01-01");
    useSalesFiltersStore.getState().clearAll();
    expect(useSalesFiltersStore.getState().fechaDesde).toBe("");
    expect(useSalesFiltersStore.getState().page).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- salesFiltersStore.test.ts`
Expected: FAIL with "Cannot find module" or "useSalesFiltersStore is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// frontend/src/features/sales/store/salesFiltersStore.ts
import { create } from "zustand";

interface SalesFiltersState {
  fechaDesde: string;
  fechaHasta: string;
  horaDesde: string;
  horaHasta: string;
  metodoPagoIds: number[];
  page: number;
}

interface SalesFiltersActions {
  setField: <K extends keyof SalesFiltersState>(field: K, value: SalesFiltersState[K]) => void;
  clearAll: () => void;
}

const INITIAL_STATE: SalesFiltersState = {
  fechaDesde: "",
  fechaHasta: "",
  horaDesde: "",
  horaHasta: "",
  metodoPagoIds: [],
  page: 1,
};

export const useSalesFiltersStore = create<SalesFiltersState & SalesFiltersActions>((set) => ({
  ...INITIAL_STATE,
  setField: (field, value) => set({ [field]: value }),
  clearAll: () => set(INITIAL_STATE),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- salesFiltersStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/__tests__/features/sales/salesFiltersStore.test.ts frontend/src/features/sales/store/salesFiltersStore.ts
git commit -m "refactor(sales): create global zustand store for filters to maintain state"
```

### Task 2: Extract Sales Filters UI Component

**Files:**
- Create: `frontend/src/features/sales/components/SalesFilters.tsx`

**Interfaces:**
- Consumes: `useSalesFiltersStore` from Task 1. `useAuth` hook. `api.getPaymentMethods`.
- Produces: `<SalesFilters />` functional component.

- [ ] **Step 1: Write minimal implementation**

```tsx
// frontend/src/features/sales/components/SalesFilters.tsx
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { api } from "@/services/api";
import type { PaymentMethodOut } from "@/types/api";
import { useAuth } from "@/features/auth/context/AuthContext";
import Button from "@/ui-components/Button";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import { useSalesFiltersStore } from "../store/salesFiltersStore";

export default function SalesFilters() {
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);

  const fechaDesde = useSalesFiltersStore((s) => s.fechaDesde);
  const fechaHasta = useSalesFiltersStore((s) => s.fechaHasta);
  const horaDesde = useSalesFiltersStore((s) => s.horaDesde);
  const horaHasta = useSalesFiltersStore((s) => s.horaHasta);
  const metodoPagoIds = useSalesFiltersStore((s) => s.metodoPagoIds);
  const setField = useSalesFiltersStore((s) => s.setField);
  const clearAll = useSalesFiltersStore((s) => s.clearAll);

  useEffect(() => {
    if (!isOperator) {
      api.getPaymentMethods(true).then(setPaymentMethods).catch(() => {});
    }
  }, [isOperator]);

  if (isOperator) {
    return (
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <Calendar className="size-4" />
          Mostrando ventas del día de hoy
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setField("fechaDesde", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setField("fechaHasta", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Hora desde</label>
          <input
            type="time"
            value={horaDesde}
            onChange={(e) => { setField("horaDesde", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Hora hasta</label>
          <input
            type="time"
            value={horaHasta}
            onChange={(e) => { setField("horaHasta", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div className="min-w-48">
          <MultiSelectTags
            label="Método de pago"
            selected={metodoPagoIds}
            options={paymentMethods.map((m) => ({ value: m.id, label: m.nombre }))}
            onChange={(ids) => { setField("metodoPagoIds", ids); setField("page", 1); }}
            placeholder="Todos"
          />
        </div>
        {(fechaDesde || fechaHasta || horaDesde || horaHasta || metodoPagoIds.length > 0) && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="mb-0.5">
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/sales/components/SalesFilters.tsx
git commit -m "refactor(sales): extract reusable SalesFilters component"
```

### Task 3: Integrate SalesFilters and Store into SalesPage

**Files:**
- Modify: `frontend/src/features/sales/pages/SalesPage.tsx`

**Interfaces:**
- Consumes: `useSalesFiltersStore`, `SalesFilters`

- [ ] **Step 1: Open SalesPage.tsx and apply replacements**
- Remove `<SearchForm />` local states (`fechaDesde`, `fechaHasta`, `horaDesde`, `horaHasta`, `metodoPagoIds`, `page`, `paymentMethods`). Keep `sales`, `loading`, `error`, `totalPages`.
- Import `useSalesFiltersStore` and `<SalesFilters />`.
- Pull values from store directly:
```typescript
  const { fechaDesde, fechaHasta, horaDesde, horaHasta, metodoPagoIds, page, setField } = useSalesFiltersStore();
```
- Update `handleExportAll` to use `page_size: 200` but pass the Zustand values.
- Replace the giant `isOperator ? ... : ...` block above the `<Table>` with `<SalesFilters />`.
- Point Pagination `onPageChange={setPage}` to `(page) => setField("page", page)`.
- Ensure all compilation aligns and component drops by >70 lines.

- [ ] **Step 2: Start vitest to ensure compiler passes (no syntax errors)**
Run: `npm test` or typecheck

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/sales/pages/SalesPage.tsx
git commit -m "refactor(sales): decouple bloated filters UI from SalesPage"
```

### Task 4: Extract SaleSummaryCards Component

**Files:**
- Create: `frontend/src/features/sales/components/SaleSummaryCards.tsx`
- Modify: `frontend/src/features/sales/pages/SaleDetailPage.tsx`

**Interfaces:**
- Consumes: `Sale` type.
- Produces: `<SaleSummaryCards sale={sale} />` component.

- [ ] **Step 1: Write explicit implementation for SaleSummaryCards**

```tsx
// frontend/src/features/sales/components/SaleSummaryCards.tsx
import type { Sale } from "../types";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";

export default function SaleSummaryCards({ sale }: { sale: Sale }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Usuario</p>
        <p className="text-lg font-semibold">{sale.usuario_nombre || `Usuario #${sale.usuario_id}`}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Tasa BCV</p>
        <p className="text-lg font-semibold">{formatRate(sale.tasa_bcv_aplicada)}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Total USD</p>
        <p className="text-lg font-semibold text-info">{formatCurrency(sale.total_usd)}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Total VES</p>
        <p className="text-lg font-semibold text-success">{formatCurrency(sale.total_ves, "Bs ")}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface p-4">
        <p className="mb-1 text-xs text-slate-500">Método de Pago</p>
        <p className="text-lg font-semibold">{sale.metodo_pago ? sale.metodo_pago.split(", ").map(formatPaymentMethodName).join(", ") : "-"}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Refactor SaleDetailPage.tsx**
Remove the `div` containing the `grid-cols-2 sm:grid-cols-5` inside `SaleDetailPage.tsx` and place `<SaleSummaryCards sale={sale} />` right below `<PageHeader />`. Drop the unused imports of `formatRate` if no longer used.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/sales/components/SaleSummaryCards.tsx frontend/src/features/sales/pages/SaleDetailPage.tsx
git commit -m "refactor(sales): extract header summary block from SaleDetailPage"
```

### Task 5: Extract InvoiceFilters Component

**Files:**
- Create: `frontend/src/features/invoices/components/InvoiceFilters.tsx`
- Modify: `frontend/src/features/invoices/pages/InvoicesPage.tsx`

**Interfaces:**
- Consumes: `useInvoiceFiltersStore`, `SupplierOut` objects (optional array passed via props).
- Produces: `<InvoiceFilters suppliers={suppliers} />` component.

- [ ] **Step 1: Write explicit implementation for InvoiceFilters**

```tsx
// frontend/src/features/invoices/components/InvoiceFilters.tsx
import { X } from "lucide-react";
import type { SupplierOut } from "@/types/api";
import SearchInput from "@/ui-components/SearchInput";
import Combobox from "@/ui-components/Combobox";
import Select from "@/ui-components/Select";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { useInvoiceFiltersStore } from "../store/invoiceFiltersStore";

interface InvoiceFiltersProps {
  suppliers: SupplierOut[];
}

export default function InvoiceFilters({ suppliers }: InvoiceFiltersProps) {
  const { search, proveedorId, tipoDocumento, estadoPago, sortBy, fechaDesde, fechaHasta, setField, clearAll } = useInvoiceFiltersStore();
  const hasActiveFilters = search || proveedorId || tipoDocumento || estadoPago || fechaDesde || fechaHasta;

  return (
    <>
      {/* Filtros - Fila 1 */}
      <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs sm:min-w-50 sm:flex-1">
          <SearchInput
            value={search}
            onChange={(e) => { setField("search", e.target.value); setField("page", 1); }}
            onClear={() => { setField("search", ""); setField("page", 1); }}
            placeholder="Buscar factura..."
          />
        </div>
        <div className="w-full sm:w-56">
          <Combobox
            value={proveedorId}
            options={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
            onChange={(v) => { setField("proveedorId", v ? Number(v) : null); setField("page", 1); }}
            placeholder="Buscar proveedor..."
            allowClear
            clearLabel="Todos"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={tipoDocumento}
            onChange={(e) => { setField("tipoDocumento", e.target.value); setField("page", 1); }}
            options={[
              { value: "", label: "Todos los tipos" },
              { value: "FACTURA", label: "Factura" },
              { value: "NOTA_ENTREGA", label: "Nota de Entrega" },
            ]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={sortBy}
            onChange={(e) => { setField("sortBy", e.target.value); setField("page", 1); }}
            options={[
              { value: "", label: "Fecha" },
              { value: "fecha_limite_pago", label: "Por vencer" },
              { value: "precio_desc", label: "Mayor a menor precio" },
              { value: "precio_asc", label: "Menor a mayor precio" },
            ]}
          />
        </div>
      </div>

      {/* Filtros - Fila 2: fechas */}
      <div className="mb-3 flex items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setField("fechaDesde", e.target.value); setField("page", 1); }}
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setField("fechaHasta", e.target.value); setField("page", 1); }}
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        {(fechaDesde || fechaHasta) && (
          <Button variant="ghost" size="sm" onClick={() => { setField("fechaDesde", ""); setField("fechaHasta", ""); setField("page", 1); }}>
            Limpiar fechas
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Filtros activos:</span>
          {search && (
            <Badge variant="neutral" className="gap-1">
              &quot;{search}&quot;<button onClick={() => { setField("search", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main"><X className="size-3" /></button>
            </Badge>
          )}
          {proveedorId && (
            <Badge variant="neutral" className="gap-1">
              {suppliers.find((s) => s.id === proveedorId)?.nombre}
              <button onClick={() => { setField("proveedorId", null); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main"><X className="size-3" /></button>
            </Badge>
          )}
          {tipoDocumento && (
            <Badge variant="neutral" className="gap-1">
              {tipoDocumento === "FACTURA" ? "Factura" : "Nota de Entrega"}
              <button onClick={() => { setField("tipoDocumento", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main"><X className="size-3" /></button>
            </Badge>
          )}
          {fechaDesde && (
            <Badge variant="neutral" className="gap-1">
              Desde: {fechaDesde}<button onClick={() => { setField("fechaDesde", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main"><X className="size-3" /></button>
            </Badge>
          )}
          {fechaHasta && (
            <Badge variant="neutral" className="gap-1">
              Hasta: {fechaHasta}<button onClick={() => { setField("fechaHasta", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main"><X className="size-3" /></button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAll}>Limpiar todo</Button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Refactor InvoicesPage.tsx**
Remove the massive inline blocks from lines 151-274. Import `<InvoiceFilters suppliers={suppliers} />` and place it exactly below `<Tabs />`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/invoices/components/InvoiceFilters.tsx frontend/src/features/invoices/pages/InvoicesPage.tsx
git commit -m "refactor(invoices): decouple inline filters into dedicated InvoiceFilters component"
```
