# Modernización del Sidebar y Navegación Principal (Yanesu Shisutemu)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la navegación principal y el Sidebar para eliminar la barra de búsqueda innecesaria, incorporar el logo oficial del sistema, reorganizar las categorías en "Inventario" (Productos + Categorías) y "Reportes y Control" (Reportes + Retornables), reemplazar el tosco tooltip nativo del navegador por un flyout flotante moderno en modo colapsado y dotar de transiciones fluidas con CSS Grid al desplegar subitems.

**Architecture:** Componente `BrandLogo` reutilizable; `Sidebar` refactorizado con eliminación de `title` nativo y sustitución por tooltips flotantes en portal; transiciones de acordeón mediante CSS Grid `grid-rows-[0fr]` a `grid-rows-[1fr]` para evitar alturas prefijadas; configuración declarativa de items en `App.tsx`.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Lucide React, React Router DOM, Vitest, Testing Library.

## Global Constraints
- Prohibido el uso de `any` en TypeScript.
- Respetar compatibilidad con el colapso automático al entrar a POS (`/sales/new`).
- No utilizar el atributo HTML nativo `title="..."` en los botones o enlaces del Sidebar para evitar colisiones con tooltips del navegador.
- En shells no interactivos de Windows, ejecutar comandos de Node anteponiendo la ruta de fnm:
  `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;`

---

## File Structure

```
frontend/
├── src/
│   ├── ui-components/
│   │   ├── BrandLogo.tsx         # NUEVO: Isotipo y logo institucional estilizado
│   │   └── Sidebar.tsx           # MODIFICAR: Acordeón Grid, Flyout flotante, sin barra de búsqueda
│   ├── App.tsx                   # MODIFICAR: Estructura de items (Inventario, Reportes y Control)
│   └── __tests__/
│       └── ui-components/
│           ├── BrandLogo.test.tsx# NUEVO: Tests para el logo institucional
│           └── Sidebar.test.tsx  # ACTUALIZAR: Tests de navegación, acordeón y flyouts
```

---

## Task Breakdown

### Task 1: Componente Institucional `BrandLogo`

**Files:**
- Create: `frontend/src/ui-components/BrandLogo.tsx`
- Test: `frontend/src/__tests__/ui-components/BrandLogo.test.tsx`

**Interfaces:**
- Produces: `<BrandLogo collapsed?: boolean; className?: string />`

- [ ] **Step 1: Escribir el test en `frontend/src/__tests__/ui-components/BrandLogo.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandLogo from "@/ui-components/BrandLogo";

describe("BrandLogo", () => {
  it("renders the brand name when not collapsed", () => {
    render(<BrandLogo collapsed={false} />);
    expect(screen.getByText("Yanesu Shisutemu")).toBeInTheDocument();
  });

  it("hides the brand text when collapsed but renders icon", () => {
    const { container } = render(<BrandLogo collapsed={true} />);
    expect(screen.queryByText("Yanesu Shisutemu")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/BrandLogo.test.tsx`
Expected: FAIL (módulo no existe)

- [ ] **Step 3: Crear `frontend/src/ui-components/BrandLogo.tsx`**

```tsx
export interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
}

export default function BrandLogo({ collapsed = false, className = "" }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 overflow-hidden ${className}`}>
      {/* Isotipo con estilizado Katakana Ne / Yanesu */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-blue to-blue-500 text-white shadow-xs">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          {/* Geometría estilizada de control e inventario */}
          <path d="M4 7V4h16v3" />
          <path d="M9 20h6" />
          <path d="M12 4v16" />
          <path d="M8 12h8" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col overflow-hidden whitespace-nowrap">
          <span className="text-base font-bold tracking-tight text-slate-900">
            Yanesu Shisutemu
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Control de Inventario
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/BrandLogo.test.tsx`
Expected: PASS

---

### Task 2: Modernización de `Sidebar.tsx` (Sin Búsqueda, Grid Accordion y Flyouts Flotantes)

**Files:**
- Modify: `frontend/src/ui-components/Sidebar.tsx`
- Modify: `frontend/src/__tests__/ui-components/Sidebar.test.tsx`

**Interfaces:**
- Produces: `Sidebar` con flyout interactivo sin colisión de tooltip nativo y apertura fluida con CSS Grid.

- [ ] **Step 1: Actualizar tests en `frontend/src/__tests__/ui-components/Sidebar.test.tsx`**

Eliminar los tests que buscaban el input `"Search..."` y agregar pruebas para:
- Renderizado de items normales sin atributo `title` nativo.
- Apertura suave de submenús al clickear.
- Presencia del flyout en hover cuando está colapsado.

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../../ui-components/Sidebar";

const items = [
  { label: "Dashboard", to: "/" },
  { label: "Products", to: "/products" },
  {
    label: "Settings",
    items: [
      { label: "Profile", to: "/settings/profile" },
      { label: "Security", to: "/settings/security" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users", to: "/admin/users" },
      { label: "Roles", to: "/admin/roles" },
    ],
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Sidebar", () => {
  it("renders navigation items", () => {
    renderWithRouter(<Sidebar items={items} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("renders brand when provided", () => {
    renderWithRouter(<Sidebar items={items} brand="MiApp" />);
    expect(screen.getByText("MiApp")).toBeInTheDocument();
  });

  it("renders user section when user provided", () => {
    renderWithRouter(
      <Sidebar items={items} user={{ name: "Juan Perez", email: "juan@test.com" }} />,
    );
    expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    expect(screen.getByText("juan@test.com")).toBeInTheDocument();
  });

  it("toggles submenu when clicking dropdown item", async () => {
    renderWithRouter(<Sidebar items={items} />);
    const settings = screen.getByText("Settings");
    await userEvent.click(settings);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("accordion: closes other dropdown when opening a new one", async () => {
    renderWithRouter(<Sidebar items={items} />);
    const settings = screen.getByText("Settings");
    const admin = screen.getByText("Admin");

    await userEvent.click(settings);
    expect(screen.getByText("Profile")).toBeInTheDocument();

    await userEvent.click(admin);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("toggles collapsed state", async () => {
    const onCollapsedChange = vi.fn();
    renderWithRouter(
      <Sidebar items={items} collapsed={false} onCollapsedChange={onCollapsedChange} />,
    );
    await userEvent.click(screen.getByLabelText("Collapse sidebar"));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("uses h-dvh on the aside element", () => {
    const { container } = renderWithRouter(<Sidebar items={items} />);
    const aside = container.querySelector("aside");
    expect(aside).toBeInTheDocument();
    expect(aside!.className).toMatch(/\bh-dvh\b/);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para comprobar el estado actual**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/Sidebar.test.tsx`

- [ ] **Step 3: Actualizar `frontend/src/ui-components/Sidebar.tsx`**

En `Sidebar.tsx`:
1. Remover el estado `search`, el input `Search...` y la lógica de filtrado por búsqueda.
2. Quitar `title={item.label}` en `SidebarLink` y en el botón de `SidebarDropdown` para evitar que el navegador muestre el tooltip nativo negro.
3. Incorporar micro-tooltip flotante estilizado para `SidebarLink` cuando `collapsed` está activo:
   - Posicionado vía portal o flotante al lado derecho del ícono con delay y fade suave.
4. Para `SidebarDropdown` en modo colapsado:
   - Flyout con portal a `document.body` posicionado al lado derecho del botón (`rect.right + 10`).
   - Cabecera estilizada con el nombre de la sección padre (`text-[11px] font-bold text-slate-400 uppercase tracking-wider`).
   - Opciones con padding agradable y highlight de ruta activa.
   - Timeout de salida de 120ms para permitir movimiento fluido del mouse hacia el popover sin que se cierre inmediatamente.
5. En modo expandido:
   - Acordeón usando CSS Grid:
   ```tsx
   <div
     className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
       expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
     }`}
   >
     <div className="overflow-hidden pl-8 space-y-0.5">
       {submenuItems}
     </div>
   </div>
   ```

- [ ] **Step 4: Ejecutar los tests de Sidebar**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/Sidebar.test.tsx`
Expected: PASS

---

### Task 3: Reorganización de la Navegación en `App.tsx` (Inventario y Reportes y Control)

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `BrandLogo`, `adminSidebarItems`, `operatorSidebarItems`
- Produces: Layout con menú agrupado y nuevo logo integrado.

- [ ] **Step 1: Actualizar `adminSidebarItems` y `operatorSidebarItems` en `frontend/src/App.tsx`**

Importar `BrandLogo` desde `./ui-components/BrandLogo` y actualizar la estructura:

```tsx
const adminSidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={18} />, to: "/dashboard" },
  {
    label: "VENTAS",
    icon: <ShoppingCart size={18} />,
    items: [
      { label: "Punto de Venta (POS)", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  {
    label: "INVENTARIO",
    icon: <Package size={18} />,
    items: [
      { label: "Productos", to: "/products" },
      { label: "Categorías", to: "/categories" },
    ],
  },
  { label: "Facturas de Compra", icon: <Truck size={18} />, to: "/buys" },
  { label: "Tasas de Cambio", icon: <DollarSign size={18} />, to: "/exchange-rates" },
  {
    label: "REPORTES Y CONTROL",
    icon: <BarChart3 size={18} />,
    items: [
      { label: "Reportes", to: "/reports" },
      { label: "Retornables", to: "/retornables" },
    ],
  },
];

const operatorSidebarItems: SidebarItem[] = [
  {
    label: "OPERACIONES",
    icon: <ShoppingCart size={18} />,
    items: [
      { label: "Nueva Venta", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  { label: "Consulta de Productos", icon: <Package size={18} />, to: "/products" },
  { label: "Tasas de Cambio", icon: <DollarSign size={18} />, to: "/exchange-rates" },
];
```

Y en el renderizado del `<Sidebar ... />` en `App.tsx`:
```tsx
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
```

- [ ] **Step 2: Ejecutar los tests de `App.test.tsx`**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/App.test.tsx`
Expected: PASS

---

### Task 4: Verificación Integral de Calidad y Tipos

**Files:**
- Test global: Vitest y TypeScript check.

- [ ] **Step 1: Ejecutar verificación de TypeScript estricto**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b` inside `frontend/`
Expected: 0 errores

- [ ] **Step 2: Ejecutar la suite completa de tests de frontend**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test` inside `frontend/`
Expected: Todos los tests pasando (100% GREEN)
