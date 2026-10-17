# AppLayout Refactoring Implementation Plan (frontend-module-refactor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desacoplar y refactorizar el componente "God" `frontend/src/App.tsx` (AppLayout, 236 líneas) dividiéndolo en módulos especializados bajo `src/layout/`: configuración estática de navegación, hook async de breadcrumbs, hook de estado del layout y componentes puros de presentación, manteniendo el 100% de compatibilidad y todos los tests existentes en verde.

**Architecture:** Arquitectura limpia por capas bajo `frontend/src/layout/`:
- `config/navigation.ts`: Estructura de items de menú por rol (`adminSidebarItems`, `operatorSidebarItems`, `getSidebarItems`), mapa de migas de pan (`breadcrumbMap`) y constantes de ruta (`POS_PATH`).
- `hooks/useBreadcrumbs.ts`: Hook dedicado para segmentar la URL, resolver nombres de entidades dinámicas mediante `api.getProduct` y componer las migas de pan.
- `hooks/useLayoutState.ts`: Hook que encapsula el estado reactivo del layout (colapso de sidebar por ruta POS, visibilidad móvil, resize responsive, stream BCV en vivo con toasts y logout).
- `components/LayoutOverlay.tsx`: Componente de presentación puro para el backdrop oscuro en móviles.
- `components/LayoutHeader.tsx`: Componente de presentación de la cabecera superior (hamburguesa móvil, breadcrumbs, indicador BCV y botón de settings).
- `index.ts`: Punto de entrada barrel que expone los hooks y subcomponentes.
- `frontend/src/App.tsx`: Orquestador delgado (~50 líneas) que provee el `ToastProvider`, enlaza `useLayoutState` y distribuye props a `Sidebar`, `LayoutHeader`, `LayoutOverlay` y `<Outlet />`.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Lucide React, React Router DOM 6/7, Vitest, Testing Library.

**Spec:** Especificación técnica definida en la sesión de brainstorming según las directrices de `frontend-module-refactor`.

## Global Constraints

- Prohibido el uso de `any` en TypeScript.
- Respetar la exportación por defecto de `App.tsx` (`export default function AppLayout()`) para no alterar `frontend/src/router.tsx` ni `src/__tests__/App.test.tsx`.
- Anteponer fnm para la ejecución de comandos de Node en PowerShell:
  `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;`
- Los 6 tests existentes en `frontend/src/__tests__/App.test.tsx` deben continuar pasando al 100% sin modificaciones requeridas en los tests.
- La ejecución de `pnpm exec tsc -b` dentro de `frontend/` debe compilar limpiamente con 0 errores.
- NO realizar commits automáticos de git a menos que el usuario lo solicite explícitamente (conforme a las reglas del repositorio).

---

## File Structure

```
frontend/src/
├── App.tsx                                                # Orquestador principal AppLayout (~50 líneas)
├── layout/
│   ├── config/
│   │   └── navigation.ts                                  # Items de menú, breadcrumbMap, POS_PATH
│   ├── hooks/
│   │   ├── useBreadcrumbs.ts                              # Hook para migas de pan y fetch de producto
│   │   └── useLayoutState.ts                              # Hook de estado de colapso, móvil, BCV y logout
│   ├── components/
│   │   ├── LayoutOverlay.tsx                              # Backdrop para menú móvil
│   │   └── LayoutHeader.tsx                               # Cabecera superior con breadcrumbs y BCV
│   └── index.ts                                           # Barrel de exportación
└── __tests__/
    ├── App.test.tsx                                       # Tests de integración existentes (6 tests intactos)
    └── layout/
        ├── navigation.test.ts                             # Tests de configuración de navegación
        ├── LayoutOverlay.test.tsx                         # Tests de presentación del overlay móvil
        ├── useBreadcrumbs.test.tsx                        # Tests unitarios del hook useBreadcrumbs
        ├── LayoutHeader.test.tsx                          # Tests de presentación de la cabecera
        └── useLayoutState.test.tsx                        # Tests del hook de estado del layout
```

---

## Task Breakdown

### Task 1: Configuración de Navegación (`layout/config/navigation.ts`)

**Files:**
- Create: `frontend/src/layout/config/navigation.ts`
- Test: `frontend/src/__tests__/layout/navigation.test.ts`

**Interfaces:**
- Consumes: `SidebarItem` de `frontend/src/ui-components/Sidebar`
- Produces: `adminSidebarItems: SidebarItem[]`, `operatorSidebarItems: SidebarItem[]`, `getSidebarItems(rolNombre?: string): SidebarItem[]`, `breadcrumbMap: Record<string, string>`, `POS_PATH: string`

- [ ] **Step 1: Escribir el test fallido para la configuración de navegación**

Crear `frontend/src/__tests__/layout/navigation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  adminSidebarItems,
  operatorSidebarItems,
  getSidebarItems,
  breadcrumbMap,
  POS_PATH,
} from "../../layout/config/navigation";

describe("navigation config", () => {
  it("defines POS_PATH as /sales/new", () => {
    expect(POS_PATH).toBe("/sales/new");
  });

  it("returns admin items for ADMINISTRADOR role", () => {
    const items = getSidebarItems("ADMINISTRADOR");
    expect(items).toBe(adminSidebarItems);
    expect(items.some((i) => i.label === "Dashboard")).toBe(true);
    expect(items.some((i) => i.label === "VENTAS")).toBe(true);
    expect(items.some((i) => i.label === "CONTROL")).toBe(true);
  });

  it("returns operator items for OPERADOR or undefined role", () => {
    expect(getSidebarItems("OPERADOR")).toBe(operatorSidebarItems);
    expect(getSidebarItems(undefined)).toBe(operatorSidebarItems);
    expect(operatorSidebarItems.some((i) => i.label === "OPERACIONES")).toBe(true);
    expect(operatorSidebarItems.some((i) => i.label === "CONTROL")).toBe(false);
  });

  it("contains required mappings in breadcrumbMap", () => {
    expect(breadcrumbMap.dashboard).toBe("Dashboard");
    expect(breadcrumbMap.buys).toBe("Compras");
    expect(breadcrumbMap.products).toBe("Productos");
    expect(breadcrumbMap.categories).toBe("Categorías");
    expect(breadcrumbMap.sales).toBe("Ventas");
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/navigation.test.ts
```
Resultado esperado: Error de resolución de módulo `../../layout/config/navigation`.

- [ ] **Step 3: Implementar `frontend/src/layout/config/navigation.tsx` (o `.ts`)**

Crear `frontend/src/layout/config/navigation.ts`:

```typescript
import type { SidebarItem } from "../../ui-components/Sidebar";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  BarChart3,
} from "lucide-react";
import React from "react";

export const POS_PATH = "/sales/new";

export const adminSidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: React.createElement(LayoutDashboard, { size: 18 }), to: "/dashboard" },
  {
    label: "VENTAS",
    icon: React.createElement(ShoppingCart, { size: 18 }),
    items: [
      { label: "Punto de Venta (POS)", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  {
    label: "INVENTARIO",
    icon: React.createElement(Package, { size: 18 }),
    items: [
      { label: "Productos", to: "/products" },
      { label: "Categorías", to: "/categories" },
    ],
  },
  { label: "Facturas de Compra", icon: React.createElement(Truck, { size: 18 }), to: "/buys" },
  { label: "Tasas de Cambio", icon: React.createElement(DollarSign, { size: 18 }), to: "/exchange-rates" },
  {
    label: "CONTROL",
    icon: React.createElement(BarChart3, { size: 18 }),
    items: [
      { label: "Reportes", to: "/reports" },
      { label: "Retornables", to: "/retornables" },
    ],
  },
];

export const operatorSidebarItems: SidebarItem[] = [
  {
    label: "OPERACIONES",
    icon: React.createElement(ShoppingCart, { size: 18 }),
    items: [
      { label: "Nueva Venta", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  { label: "Consulta de Productos", icon: React.createElement(Package, { size: 18 }), to: "/products" },
  { label: "Tasas de Cambio", icon: React.createElement(DollarSign, { size: 18 }), to: "/exchange-rates" },
];

export function getSidebarItems(rolNombre: string | undefined): SidebarItem[] {
  if (rolNombre === "ADMINISTRADOR") {
    return adminSidebarItems;
  }
  return operatorSidebarItems;
}

export const breadcrumbMap: Record<string, string> = {
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
  combos: "Combos",
  settings: "Configuración",
  system: "API Keys",
  new: "Nuevo",
};
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/navigation.test.ts
```
Resultado esperado: PASS (todos los tests en verde).

---

### Task 2: Componente Presentacional `LayoutOverlay` (`layout/components/LayoutOverlay.tsx`)

**Files:**
- Create: `frontend/src/layout/components/LayoutOverlay.tsx`
- Test: `frontend/src/__tests__/layout/LayoutOverlay.test.tsx`

**Interfaces:**
- Produces: `LayoutOverlayProps`, `LayoutOverlay: React.FC<LayoutOverlayProps>`

- [ ] **Step 1: Escribir el test fallido para `LayoutOverlay`**

Crear `frontend/src/__tests__/layout/LayoutOverlay.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutOverlay } from "../../layout/components/LayoutOverlay";

describe("LayoutOverlay", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(<LayoutOverlay open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders overlay backdrop when open is true", () => {
    render(<LayoutOverlay open={true} onClose={vi.fn()} />);
    const overlay = screen.getByTestId("layout-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay.className).toContain("fixed inset-0");
  });

  it("calls onClose when overlay is clicked", async () => {
    const onClose = vi.fn();
    render(<LayoutOverlay open={true} onClose={onClose} />);
    await userEvent.click(screen.getByTestId("layout-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/LayoutOverlay.test.tsx
```
Resultado esperado: Error de resolución de módulo `../../layout/components/LayoutOverlay`.

- [ ] **Step 3: Implementar `frontend/src/layout/components/LayoutOverlay.tsx`**

Crear `frontend/src/layout/components/LayoutOverlay.tsx`:

```typescript
export interface LayoutOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function LayoutOverlay({ open, onClose }: LayoutOverlayProps) {
  if (!open) return null;

  return (
    <div
      data-testid="layout-overlay"
      className="fixed inset-0 z-20 bg-black/40 lg:hidden"
      onClick={onClose}
    />
  );
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/LayoutOverlay.test.tsx
```
Resultado esperado: PASS (3 tests pasados).

---

### Task 3: Hook de Migas de Pan `useBreadcrumbs` (`layout/hooks/useBreadcrumbs.ts`)

**Files:**
- Create: `frontend/src/layout/hooks/useBreadcrumbs.ts`
- Test: `frontend/src/__tests__/layout/useBreadcrumbs.test.tsx`

**Interfaces:**
- Consumes: `api.getProduct` de `frontend/src/services/api`, `breadcrumbMap` de `../config/navigation`, `Crumb` de `../../ui-components/Breadcrumbs`
- Produces: `useBreadcrumbs(): Crumb[]`

- [ ] **Step 1: Escribir el test fallido para `useBreadcrumbs`**

Crear `frontend/src/__tests__/layout/useBreadcrumbs.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useBreadcrumbs } from "../../layout/hooks/useBreadcrumbs";
import { api } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    getProduct: vi.fn(),
  },
}));

function createWrapper(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

describe("useBreadcrumbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty crumbs on root route", () => {
    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/"),
    });
    expect(result.current).toEqual([]);
  });

  it("maps single segment routes correctly", () => {
    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/sales"),
    });
    expect(result.current).toEqual([{ label: "Ventas" }]);
  });

  it("maps nested segment routes with intermediate href links", () => {
    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/products/new"),
    });
    expect(result.current).toEqual([
      { label: "Productos", href: "/products" },
      { label: "Nuevo" },
    ]);
  });

  it("fetches product name asynchronously for /products/:id/edit", async () => {
    vi.mocked(api.getProduct).mockResolvedValueOnce({
      id: 42,
      nombre: "Ron Santa Teresa 1996",
    } as any);

    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/products/42/edit"),
    });

    await waitFor(() => {
      expect(result.current).toEqual([
        { label: "Productos", href: "/products" },
        { label: "Ron Santa Teresa 1996" },
        { label: "edit" },
      ]);
    });
    expect(api.getProduct).toHaveBeenCalledWith(42);
  });

  it("falls back to #id if api.getProduct fails", async () => {
    vi.mocked(api.getProduct).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/products/99/edit"),
    });

    await waitFor(() => {
      expect(result.current).toEqual([
        { label: "Productos", href: "/products" },
        { label: "#99" },
        { label: "edit" },
      ]);
    });
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/useBreadcrumbs.test.tsx
```
Resultado esperado: Error de resolución de módulo `../../layout/hooks/useBreadcrumbs`.

- [ ] **Step 3: Implementar `frontend/src/layout/hooks/useBreadcrumbs.ts`**

Crear `frontend/src/layout/hooks/useBreadcrumbs.ts`:

```typescript
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { Crumb } from "../../ui-components/Breadcrumbs";
import { api } from "../../services/api";
import { breadcrumbMap } from "../config/navigation";

export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const isProductEdit = segments[0] === "products" && segments.length === 3 && segments[2] === "edit";
  const productId = isProductEdit ? segments[1] : null;

  useEffect(() => {
    if (productId && !entityNames[productId] && !requestedRef.current.has(productId)) {
      requestedRef.current.add(productId);
      api.getProduct(Number(productId))
        .then((p) => setEntityNames((prev) => ({ ...prev, [productId]: p.nombre })))
        .catch(() => setEntityNames((prev) => ({ ...prev, [productId]: `#${productId}` })));
    }
  }, [productId, entityNames]);

  const crumbs = useMemo<Crumb[]>(() => {
    const result: Crumb[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (i === 1 && isProductEdit && productId) {
        const name = entityNames[productId] || `Producto #${productId}`;
        result.push({ label: name });
        continue;
      }

      const label = breadcrumbMap[segment] ?? segment;
      if (i < segments.length - 1) {
        result.push({ label, href: `/${segments.slice(0, i + 1).join("/")}` });
      } else {
        result.push({ label });
      }
    }
    return result;
  }, [segments, isProductEdit, productId, entityNames]);

  return crumbs;
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/useBreadcrumbs.test.tsx
```
Resultado esperado: PASS (5 tests pasados).

---

### Task 4: Componente Presentacional `LayoutHeader` (`layout/components/LayoutHeader.tsx`)

**Files:**
- Create: `frontend/src/layout/components/LayoutHeader.tsx`
- Test: `frontend/src/__tests__/layout/LayoutHeader.test.tsx`

**Interfaces:**
- Consumes: `useBreadcrumbs` de `../hooks/useBreadcrumbs`, `Breadcrumbs` de `../../ui-components/Breadcrumbs`, `TasaBcvIndicator` de `../../ui-components/TasaBcvIndicator`
- Produces: `LayoutHeaderProps`, `LayoutHeader: React.FC<LayoutHeaderProps>`

- [ ] **Step 1: Escribir el test fallido para `LayoutHeader`**

Crear `frontend/src/__tests__/layout/LayoutHeader.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LayoutHeader } from "../../layout/components/LayoutHeader";

vi.mock("../../ui-components/TasaBcvIndicator", () => ({
  default: () => <div data-testid="tasa-bcv-indicator">BCV 45.00</div>,
}));

vi.mock("../../layout/hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: () => [{ label: "Inventario", href: "/products" }, { label: "Productos" }],
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LayoutHeader", () => {
  it("renders menu open/close toggle and handles clicks", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={onToggle} menuOpen={false} isOperator={false} />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByLabelText("Abrir menú");
    expect(toggleBtn).toBeInTheDocument();
    await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={onToggle} menuOpen={true} isOperator={false} />
      </MemoryRouter>
    );
    expect(screen.getByLabelText("Cerrar menú")).toBeInTheDocument();
  });

  it("renders breadcrumbs and TasaBcvIndicator", () => {
    render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={vi.fn()} menuOpen={false} isOperator={false} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("tasa-bcv-indicator")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
  });

  it("renders settings button for administrator and triggers navigation", async () => {
    render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={vi.fn()} menuOpen={false} isOperator={false} />
      </MemoryRouter>
    );

    const settingsBtn = screen.getByTitle("Configuración");
    expect(settingsBtn).toBeInTheDocument();
    await userEvent.click(settingsBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("does not render settings button for operator", () => {
    render(
      <MemoryRouter>
        <LayoutHeader onMenuToggle={vi.fn()} menuOpen={false} isOperator={true} />
      </MemoryRouter>
    );

    expect(screen.queryByTitle("Configuración")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/LayoutHeader.test.tsx
```
Resultado esperado: Error de resolución de módulo `../../layout/components/LayoutHeader`.

- [ ] **Step 3: Implementar `frontend/src/layout/components/LayoutHeader.tsx`**

Crear `frontend/src/layout/components/LayoutHeader.tsx`:

```typescript
import { useNavigate } from "react-router-dom";
import { Menu, X, Settings } from "lucide-react";
import Breadcrumbs from "../../ui-components/Breadcrumbs";
import TasaBcvIndicator from "../../ui-components/TasaBcvIndicator";
import { useBreadcrumbs } from "../hooks/useBreadcrumbs";

export interface LayoutHeaderProps {
  onMenuToggle: () => void;
  menuOpen: boolean;
  isOperator: boolean;
}

export function LayoutHeader({
  onMenuToggle,
  menuOpen,
  isOperator,
}: LayoutHeaderProps) {
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-surface px-4 sm:h-16 sm:gap-4 sm:px-6">
      <button
        onClick={onMenuToggle}
        className="shrink-0 cursor-pointer p-1 text-slate-500 transition-colors hover:text-slate-800 lg:hidden"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {/* Breadcrumbs - hidden on mobile, show last segment as mobile title */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <Breadcrumbs items={crumbs} />
      </div>

      {/* Mobile: show last crumb as page title */}
      {crumbs.length > 0 && (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-main sm:hidden">
          {crumbs[crumbs.length - 1].label}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <TasaBcvIndicator />
        {!isOperator && (
          <button
            onClick={() => navigate("/settings")}
            className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title="Configuración"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/LayoutHeader.test.tsx
```
Resultado esperado: PASS (4 tests pasados).

---

### Task 5: Hook de Estado de Layout `useLayoutState` (`layout/hooks/useLayoutState.ts`)

**Files:**
- Create: `frontend/src/layout/hooks/useLayoutState.ts`
- Test: `frontend/src/__tests__/layout/useLayoutState.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useExchangeRateStore`, `useRateStream`, `useToast`, `getSidebarItems`, `POS_PATH`
- Produces:
  ```typescript
  export interface UseLayoutStateReturn {
    collapsed: boolean;
    setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    mobileOpen: boolean;
    setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isMobile: boolean;
    user: ReturnType<typeof useAuth>["user"];
    isOperator: boolean;
    sidebarItems: SidebarItem[];
    handleLogout: () => Promise<void>;
  }
  ```

- [ ] **Step 1: Escribir el test fallido para `useLayoutState`**

Crear `frontend/src/__tests__/layout/useLayoutState.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useLayoutState } from "../../layout/hooks/useLayoutState";

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockToast = vi.fn();
const mockLoadTasa = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, username: "admin", email: "admin@test.com", rol_nombre: "ADMINISTRADOR" },
    logout: mockLogout,
    loading: false,
  }),
}));

vi.mock("../../ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("../../stores/exchangeRateStore", () => ({
  useExchangeRateStore: (selector: (s: any) => any) =>
    selector({
      loadTasa: mockLoadTasa,
    }),
}));

vi.mock("../../hooks/useRateStream", () => ({
  useRateStream: vi.fn(),
}));

function createWrapper(initialPath = "/") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

describe("useLayoutState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes layout state and calls loadTasa", () => {
    const { result } = renderHook(() => useLayoutState(), {
      wrapper: createWrapper("/dashboard"),
    });

    expect(result.current.collapsed).toBe(false);
    expect(result.current.mobileOpen).toBe(false);
    expect(result.current.isOperator).toBe(false);
    expect(result.current.sidebarItems.length).toBeGreaterThan(0);
    expect(mockLoadTasa).toHaveBeenCalledTimes(1);
  });

  it("handles logout successfully and navigates to /login", async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLayoutState(), {
      wrapper: createWrapper("/dashboard"),
    });

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("shows error toast if logout fails", async () => {
    mockLogout.mockRejectedValueOnce(new Error("Logout error"));
    const { result } = renderHook(() => useLayoutState(), {
      wrapper: createWrapper("/dashboard"),
    });

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockToast).toHaveBeenCalledWith("Error al cerrar sesión", "error");
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/useLayoutState.test.tsx
```
Resultado esperado: Error de resolución de módulo `../../layout/hooks/useLayoutState`.

- [ ] **Step 3: Implementar `frontend/src/layout/hooks/useLayoutState.ts`**

Crear `frontend/src/layout/hooks/useLayoutState.ts`:

```typescript
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { useToast } from "../../ui-components/Toast";
import { useExchangeRateStore } from "../../stores/exchangeRateStore";
import { useRateStream } from "../../hooks/useRateStream";
import { formatBs } from "../../lib/text";
import { getSidebarItems, POS_PATH } from "../config/navigation";
import type { SidebarItem } from "../../ui-components/Sidebar";

export interface UseLayoutStateReturn {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  user: ReturnType<typeof useAuth>["user"];
  isOperator: boolean;
  sidebarItems: SidebarItem[];
  handleLogout: () => Promise<void>;
}

export function useLayoutState(): UseLayoutStateReturn {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const loadTasa = useExchangeRateStore((s) => s.loadTasa);

  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const sidebarItems = getSidebarItems(user?.rol_nombre);

  // Responsive breakpoint tracking (< 1024px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carga inicial de tasa
  useEffect(() => {
    loadTasa();
  }, [loadTasa]);

  // Sincronización SSE en vivo de tasa BCV
  useRateStream((newUsd) => {
    toast(`Nueva tasa BCV sincronizada: ${formatBs(newUsd)} Bs/USD`, "info");
  });

  // Auto-colapso al entrar a POS y restauración al salir
  const prevPathRef = useRef<string | null>(null);
  const prePosCollapsedRef = useRef(false);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    const isPos = pathname === POS_PATH;
    const wasPos = prev === POS_PATH;
    if (isPos && !wasPos) {
      prePosCollapsedRef.current = collapsed;
      setCollapsed(true);
    } else if (!isPos && wasPos) {
      setCollapsed(prePosCollapsedRef.current);
    }
  }, [pathname, collapsed]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast("Error al cerrar sesión", "error");
    }
  };

  return {
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    isMobile,
    user,
    isOperator,
    sidebarItems,
    handleLogout,
  };
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/useLayoutState.test.tsx
```
Resultado esperado: PASS (3 tests pasados).

---

### Task 6: Archivo Barrel / Re-exports (`frontend/src/layout/index.ts`)

**Files:**
- Create: `frontend/src/layout/index.ts`

**Interfaces:**
- Produces: Exportaciones públicas limpias de `navigation`, `useBreadcrumbs`, `useLayoutState`, `LayoutHeader`, `LayoutOverlay`.

- [ ] **Step 1: Crear `frontend/src/layout/index.ts`**

```typescript
export * from "./config/navigation";
export * from "./hooks/useBreadcrumbs";
export * from "./hooks/useLayoutState";
export * from "./components/LayoutHeader";
export * from "./components/LayoutOverlay";
```

- [ ] **Step 2: Verificar la compilación con TypeScript**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b
```
Resultado esperado: 0 errores de TypeScript.

---

### Task 7: Refactorización y Composición en `frontend/src/App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/__tests__/App.test.tsx` (Suite existente de 6 pruebas)

**Interfaces:**
- Consumes: `ToastProvider` de `./ui-components/Toast`, `Sidebar` de `./ui-components/Sidebar`, `BrandLogo` de `./ui-components/BrandLogo`, `LayoutHeader`, `LayoutOverlay`, `useLayoutState` de `./layout`
- Produces: `export default function AppLayout()`

- [ ] **Step 1: Reemplazar el contenido de `frontend/src/App.tsx` con la versión desacoplada**

Actualizar `frontend/src/App.tsx`:

```typescript
import { Outlet } from "react-router-dom";
import Sidebar from "./ui-components/Sidebar";
import BrandLogo from "./ui-components/BrandLogo";
import { ToastProvider } from "./ui-components/Toast";
import { LayoutHeader, LayoutOverlay, useLayoutState } from "./layout";

export default function AppLayout() {
  return (
    <ToastProvider>
      <AppLayoutInner />
    </ToastProvider>
  );
}

function AppLayoutInner() {
  const {
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    isMobile,
    user,
    isOperator,
    sidebarItems,
    handleLogout,
  } = useLayoutState();

  return (
    <div className="min-h-screen bg-background">
      <LayoutOverlay
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div
        className={`
          fixed inset-y-0 left-0 z-30 overflow-y-auto pr-4
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          items={sidebarItems}
          logo={<BrandLogo collapsed={collapsed} />}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          expandAll={isOperator}
          forceExpanded={isMobile && mobileOpen}
          user={user ? { name: user.nombre_completo || user.username, email: user.email } : undefined}
          onLogout={handleLogout}
        />
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? "lg:ml-[4.94rem]" : "lg:ml-60"
        }`}
      >
        <LayoutHeader
          onMenuToggle={() => setMobileOpen((prev) => !prev)}
          menuOpen={mobileOpen}
          isOperator={isOperator}
        />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ejecutar los tests de integración de `AppLayout` existentes**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/App.test.tsx
```
Resultado esperado: PASS (los 6 tests existentes pasan sin errores).

- [ ] **Step 3: Ejecutar la suite completa de tests de layout**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/layout/
```
Resultado esperado: PASS (todos los tests unitarios de layout pasan en verde).

- [ ] **Step 4: Comprobación estricta de TypeScript**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b
```
Resultado esperado: 0 errores de compilación de tipos.
