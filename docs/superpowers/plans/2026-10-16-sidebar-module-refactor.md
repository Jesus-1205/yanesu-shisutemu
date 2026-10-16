# Refactorización Modular de Sidebar (frontend-module-refactor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desacoplar y refactorizar el componente `Sidebar.tsx` (405 líneas) dividiéndolo en tipos independientes, hooks dedicados para lógica/estado, subcomponentes puros de presentación y un orquestador limpio y conciso, manteniendo total compatibilidad con la API pública y el 100% de los tests pasando sin regresiones.

**Architecture:** Módulo modular bajo `src/ui-components/sidebar/`:
- `types.ts`: Definición estricta de interfaces (`SidebarItem`, `SidebarUser`, `SidebarProps`).
- Hooks en `sidebar/hooks/`: `useSidebarCollapse` (estado controlado/incontrolado y forceExpanded), `useSidebarAccordion` (acordeón y expandAll), `useHoverFlyout` (timers y posicionamiento del menú flotante) y `useTooltipPosition` (coordenadas del tooltip).
- Componentes en `sidebar/components/`: `DefaultIcon`, `SidebarBrand`, `SidebarToggleButton`, `SidebarUserFooter`, `SidebarLink`, `SidebarDropdown`.
- Fachada en `Sidebar.tsx`: Orquestador principal de 60-80 líneas que compone los hooks y subcomponentes y re-exporta los tipos públicos.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Lucide React, React Router DOM, Vitest, Testing Library.

**Spec:** Análisis arquitectónico y plan de refactorización según skill `frontend-module-refactor`.

## Global Constraints

- Prohibido el uso de `any` en TypeScript.
- Respetar la API pública existente de `Sidebar`:
  - `export interface SidebarItem`
  - `export interface SidebarUser` (o equivalente)
  - `export interface SidebarProps`
  - `export default function Sidebar(...)`
- Mantener compatibilidad absoluta con `App.tsx` y `frontend/src/ui-components/index.ts`.
- En shells de Windows, anteponer fnm para comandos de Node:
  `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;`
- Prohibido romper los 11 tests de integración existentes en `src/__tests__/ui-components/Sidebar.test.tsx`.
- Cada hook y componente nuevo debe contar con su correspondiente suite de pruebas unitarias.

---

## File Structure

```
frontend/src/
├── ui-components/
│   ├── Sidebar.tsx                                        # Fachada / Orquestador principal
│   └── sidebar/
│       ├── types.ts                                       # Interfaces estrictas compartidas
│       ├── hooks/
│       │   ├── useSidebarCollapse.ts                      # Hook: estado collapsed y forceExpanded
│       │   ├── useSidebarAccordion.ts                     # Hook: acordeón de submenús
│       │   ├── useHoverFlyout.ts                          # Hook: timers y flyout en collapsed
│       │   └── useTooltipPosition.ts                      # Hook: cálculo geométrico de tooltip
│       └── components/
│           ├── DefaultIcon.tsx                            # SVG fallback
│           ├── SidebarBrand.tsx                           # Logo institucional y título
│           ├── SidebarToggleButton.tsx                    # Botón flotante para expandir/colapsar
│           ├── SidebarUserFooter.tsx                      # Perfil de usuario y botón de logout
│           ├── SidebarLink.tsx                            # Enlace simple con portal de tooltip
│           └── SidebarDropdown.tsx                        # Dropdown con acordeón Grid y flyout portal
└── __tests__/
    └── ui-components/
        ├── Sidebar.test.tsx                               # Suite existente (11 tests intactos)
        └── sidebar/
            ├── useSidebarCollapse.test.ts                 # Tests unitarios del hook de colapso
            ├── useSidebarAccordion.test.ts                # Tests unitarios del hook de acordeón
            ├── useHoverFlyout.test.ts                     # Tests unitarios del hook de hover flyout
            ├── useTooltipPosition.test.ts                 # Tests unitarios del hook de tooltip
            ├── SidebarPresentational.test.tsx             # Tests de Brand, Toggle, UserFooter
            └── SidebarNavigationComponents.test.tsx       # Tests de SidebarLink y SidebarDropdown
```

---

## Task Breakdown

### Task 1: Interfaces y Tipos Compartidos (`sidebar/types.ts`)

**Files:**
- Create: `frontend/src/ui-components/sidebar/types.ts`
- Test: Verificación de compilación de tipos TypeScript

**Interfaces:**
- Produces: `SidebarItem`, `SidebarUser`, `SidebarProps`, `SidebarLinkProps`, `SidebarDropdownProps`, `SidebarBrandProps`, `SidebarToggleButtonProps`, `SidebarUserFooterProps`.

- [ ] **Step 1: Crear `frontend/src/ui-components/sidebar/types.ts`**

```typescript
import type { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  icon?: ReactNode;
  to?: string;
  items?: SidebarItem[];
}

export interface SidebarUser {
  name: string;
  email: string;
  avatar?: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  brand?: string;
  logo?: ReactNode;
  user?: SidebarUser;
  onLogout?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  expandAll?: boolean;
  forceExpanded?: boolean;
  className?: string;
}

export interface SidebarBrandProps {
  brand?: string;
  logo?: ReactNode;
  collapsed: boolean;
}

export interface SidebarToggleButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export interface SidebarUserFooterProps {
  user: SidebarUser;
  collapsed: boolean;
  onLogout?: () => void;
}

export interface SidebarLinkProps {
  item: SidebarItem;
  collapsed: boolean;
}

export interface SidebarDropdownProps {
  item: SidebarItem;
  collapsed: boolean;
  expanded: boolean;
  expandAll: boolean;
  onToggle: () => void;
}
```

- [ ] **Step 2: Verificar sintaxis TypeScript**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b` inside `frontend/`
Expected: 0 errores

---

### Task 2: Hook `useSidebarCollapse`

**Files:**
- Create: `frontend/src/ui-components/sidebar/hooks/useSidebarCollapse.ts`
- Test: `frontend/src/__tests__/ui-components/sidebar/useSidebarCollapse.test.ts`

**Interfaces:**
- Produces: `useSidebarCollapse({ controlledCollapsed, onCollapsedChange, forceExpanded })`

- [ ] **Step 1: Escribir el test que fallará en `frontend/src/__tests__/ui-components/sidebar/useSidebarCollapse.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebarCollapse } from "../../../ui-components/sidebar/hooks/useSidebarCollapse";

describe("useSidebarCollapse", () => {
  it("defaults to uncollapsed when no props are provided", () => {
    const { result } = renderHook(() => useSidebarCollapse({}));
    expect(result.current.collapsed).toBe(false);
  });

  it("toggles internal collapsed state when uncontrolled", () => {
    const { result } = renderHook(() => useSidebarCollapse({}));
    act(() => {
      result.current.toggleCollapsed();
    });
    expect(result.current.collapsed).toBe(true);
    act(() => {
      result.current.toggleCollapsed();
    });
    expect(result.current.collapsed).toBe(false);
  });

  it("honors controlled collapsed prop and calls onCollapsedChange", () => {
    const onCollapsedChange = vi.fn();
    const { result, rerender } = renderHook(
      (props) => useSidebarCollapse(props),
      {
        initialProps: {
          controlledCollapsed: false,
          onCollapsedChange,
        },
      }
    );

    expect(result.current.collapsed).toBe(false);

    act(() => {
      result.current.toggleCollapsed();
    });
    expect(onCollapsedChange).toHaveBeenCalledWith(true);

    rerender({ controlledCollapsed: true, onCollapsedChange });
    expect(result.current.collapsed).toBe(true);
  });

  it("forceExpanded forces collapsed to false regardless of controlled value", () => {
    const { result } = renderHook(() =>
      useSidebarCollapse({ controlledCollapsed: true, forceExpanded: true })
    );
    expect(result.current.collapsed).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useSidebarCollapse.test.ts`
Expected: FAIL (módulo no existe)

- [ ] **Step 3: Implementar `frontend/src/ui-components/sidebar/hooks/useSidebarCollapse.ts`**

```typescript
import { useState, useCallback } from "react";

interface UseSidebarCollapseOptions {
  controlledCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  forceExpanded?: boolean;
}

export function useSidebarCollapse({
  controlledCollapsed,
  onCollapsedChange,
  forceExpanded = false,
}: UseSidebarCollapseOptions) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = forceExpanded
    ? false
    : (controlledCollapsed ?? internalCollapsed);

  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
  };
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useSidebarCollapse.test.ts`
Expected: PASS

---

### Task 3: Hook `useSidebarAccordion`

**Files:**
- Create: `frontend/src/ui-components/sidebar/hooks/useSidebarAccordion.ts`
- Test: `frontend/src/__tests__/ui-components/sidebar/useSidebarAccordion.test.ts`

**Interfaces:**
- Produces: `useSidebarAccordion({ itemCount, expandAll })`

- [ ] **Step 1: Escribir el test en `frontend/src/__tests__/ui-components/sidebar/useSidebarAccordion.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebarAccordion } from "../../../ui-components/sidebar/hooks/useSidebarAccordion";

describe("useSidebarAccordion", () => {
  it("initializes with no expanded menus when expandAll is false", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: false })
    );
    expect(result.current.isExpanded(0)).toBe(false);
    expect(result.current.isExpanded(1)).toBe(false);
  });

  it("initializes with all menus expanded when expandAll is true", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: true })
    );
    expect(result.current.isExpanded(0)).toBe(true);
    expect(result.current.isExpanded(1)).toBe(true);
    expect(result.current.isExpanded(2)).toBe(true);
  });

  it("toggles one submenu open and closes other open submenus", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: false })
    );

    act(() => {
      result.current.toggleSubmenu(0);
    });
    expect(result.current.isExpanded(0)).toBe(true);
    expect(result.current.isExpanded(1)).toBe(false);

    // Opening index 1 closes index 0
    act(() => {
      result.current.toggleSubmenu(1);
    });
    expect(result.current.isExpanded(0)).toBe(false);
    expect(result.current.isExpanded(1)).toBe(true);

    // Clicking index 1 again closes index 1
    act(() => {
      result.current.toggleSubmenu(1);
    });
    expect(result.current.isExpanded(1)).toBe(false);
  });

  it("does not change expanded state when expandAll is true", () => {
    const { result } = renderHook(() =>
      useSidebarAccordion({ itemCount: 3, expandAll: true })
    );

    act(() => {
      result.current.toggleSubmenu(0);
    });
    expect(result.current.isExpanded(0)).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useSidebarAccordion.test.ts`
Expected: FAIL (módulo no existe)

- [ ] **Step 3: Implementar `frontend/src/ui-components/sidebar/hooks/useSidebarAccordion.ts`**

```typescript
import { useState, useCallback } from "react";

interface UseSidebarAccordionOptions {
  itemCount: number;
  expandAll?: boolean;
}

export function useSidebarAccordion({
  itemCount,
  expandAll = false,
}: UseSidebarAccordionOptions) {
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(() => {
    if (expandAll) {
      return new Set(Array.from({ length: itemCount }, (_, i) => i));
    }
    return new Set<number>();
  });

  const toggleSubmenu = useCallback(
    (index: number) => {
      if (expandAll) return;
      setExpandedMenus((prev) => {
        const next = new Set<number>();
        if (!prev.has(index)) {
          next.add(index);
        }
        return next;
      });
    },
    [expandAll]
  );

  const isExpanded = useCallback(
    (index: number) => {
      if (expandAll) return true;
      return expandedMenus.has(index);
    },
    [expandAll, expandedMenus]
  );

  return {
    isExpanded,
    toggleSubmenu,
    expandedMenus,
  };
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useSidebarAccordion.test.ts`
Expected: PASS

---

### Task 4: Hook `useHoverFlyout`

**Files:**
- Create: `frontend/src/ui-components/sidebar/hooks/useHoverFlyout.ts`
- Test: `frontend/src/__tests__/ui-components/sidebar/useHoverFlyout.test.ts`

**Interfaces:**
- Produces: `useHoverFlyout({ collapsed, offset })`

- [ ] **Step 1: Escribir el test en `frontend/src/__tests__/ui-components/sidebar/useHoverFlyout.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHoverFlyout } from "../../../ui-components/sidebar/hooks/useHoverFlyout";

describe("useHoverFlyout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with isHovering false", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true }));
    expect(result.current.isHovering).toBe(false);
    expect(result.current.hoverPos).toEqual({ top: 0, left: 0 });
  });

  it("does not show hover menu if collapsed is false", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: false }));
    act(() => {
      result.current.showHoverMenu();
    });
    expect(result.current.isHovering).toBe(false);
  });

  it("shows hover menu and computes position when collapsed is true", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true, offset: 10 }));

    // Mock button ref getBoundingClientRect
    const fakeBtn = document.createElement("button");
    fakeBtn.getBoundingClientRect = () => ({
      top: 100,
      right: 50,
      left: 10,
      bottom: 140,
      width: 40,
      height: 40,
      x: 10,
      y: 100,
      toJSON: () => {},
    });
    result.current.btnRef.current = fakeBtn;

    act(() => {
      result.current.showHoverMenu();
    });

    expect(result.current.isHovering).toBe(true);
    expect(result.current.hoverPos).toEqual({ top: 100, left: 60 });
  });

  it("hides hover menu with delay on hideHoverMenu", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true }));

    act(() => {
      result.current.showHoverMenu();
    });
    expect(result.current.isHovering).toBe(true);

    act(() => {
      result.current.hideHoverMenu();
    });
    // Not hidden immediately
    expect(result.current.isHovering).toBe(true);

    // Fast-forward timeout 120ms
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current.isHovering).toBe(false);
  });

  it("keepHoverMenu cancels close timeout", () => {
    const { result } = renderHook(() => useHoverFlyout({ collapsed: true }));

    act(() => {
      result.current.showHoverMenu();
      result.current.hideHoverMenu();
      result.current.keepHoverMenu();
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isHovering).toBe(true);
  });

  it("resets isHovering when collapsed changes to false", () => {
    const { result, rerender } = renderHook(
      (props) => useHoverFlyout(props),
      { initialProps: { collapsed: true } }
    );

    act(() => {
      result.current.showHoverMenu();
    });
    expect(result.current.isHovering).toBe(true);

    rerender({ collapsed: false });
    expect(result.current.isHovering).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useHoverFlyout.test.ts`
Expected: FAIL (módulo no existe)

- [ ] **Step 3: Implementar `frontend/src/ui-components/sidebar/hooks/useHoverFlyout.ts`**

```typescript
import { useState, useRef, useCallback, useEffect } from "react";

interface UseHoverFlyoutOptions {
  collapsed: boolean;
  offset?: number;
}

export function useHoverFlyout({
  collapsed,
  offset = 8,
}: UseHoverFlyoutOptions) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showHoverMenu = useCallback(() => {
    if (!collapsed) return;
    clearTimeout(hoverTimeoutRef.current);
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setHoverPos({ top: rect.top, left: rect.right + offset });
    }
    setIsHovering(true);
  }, [collapsed, offset]);

  const hideHoverMenu = useCallback(() => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 120);
  }, [collapsed]);

  const keepHoverMenu = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
  }, []);

  const closeHoverMenu = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    setIsHovering(false);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!collapsed) {
      setIsHovering(false);
    }
  }, [collapsed]);

  return {
    btnRef,
    isHovering,
    hoverPos,
    showHoverMenu,
    hideHoverMenu,
    keepHoverMenu,
    closeHoverMenu,
  };
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useHoverFlyout.test.ts`
Expected: PASS

---

### Task 5: Hook `useTooltipPosition`

**Files:**
- Create: `frontend/src/ui-components/sidebar/hooks/useTooltipPosition.ts`
- Test: `frontend/src/__tests__/ui-components/sidebar/useTooltipPosition.test.ts`

**Interfaces:**
- Produces: `useTooltipPosition({ collapsed, offset })`

- [ ] **Step 1: Escribir el test en `frontend/src/__tests__/ui-components/sidebar/useTooltipPosition.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTooltipPosition } from "../../../ui-components/sidebar/hooks/useTooltipPosition";

describe("useTooltipPosition", () => {
  it("initializes with showTooltip false", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: true }));
    expect(result.current.showTooltip).toBe(false);
    expect(result.current.pos).toEqual({ top: 0, left: 0 });
  });

  it("does not show tooltip if collapsed is false", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: false }));
    act(() => {
      result.current.handleMouseEnter();
    });
    expect(result.current.showTooltip).toBe(false);
  });

  it("shows tooltip and computes coordinates when collapsed is true", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: true, offset: 8 }));

    const fakeLink = document.createElement("a");
    fakeLink.getBoundingClientRect = () => ({
      top: 50,
      right: 70,
      left: 10,
      bottom: 90,
      width: 60,
      height: 40,
      x: 10,
      y: 50,
      toJSON: () => {},
    });
    result.current.linkRef.current = fakeLink;

    act(() => {
      result.current.handleMouseEnter();
    });

    expect(result.current.showTooltip).toBe(true);
    // top = rect.top + rect.height / 2 = 50 + 20 = 70; left = rect.right + 8 = 78
    expect(result.current.pos).toEqual({ top: 70, left: 78 });

    act(() => {
      result.current.handleMouseLeave();
    });
    expect(result.current.showTooltip).toBe(false);
  });

  it("hideTooltip closes tooltip", () => {
    const { result } = renderHook(() => useTooltipPosition({ collapsed: true }));
    act(() => {
      result.current.handleMouseEnter();
    });
    act(() => {
      result.current.hideTooltip();
    });
    expect(result.current.showTooltip).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useTooltipPosition.test.ts`
Expected: FAIL (módulo no existe)

- [ ] **Step 3: Implementar `frontend/src/ui-components/sidebar/hooks/useTooltipPosition.ts`**

```typescript
import { useState, useRef, useCallback } from "react";

interface UseTooltipPositionOptions {
  collapsed: boolean;
  offset?: number;
}

export function useTooltipPosition({
  collapsed,
  offset = 8,
}: UseTooltipPositionOptions) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return;
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.right + offset,
      });
    }
    setShowTooltip(true);
  }, [collapsed, offset]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const hideTooltip = useCallback(() => {
    setShowTooltip(false);
  }, []);

  return {
    linkRef,
    showTooltip,
    pos,
    handleMouseEnter,
    handleMouseLeave,
    hideTooltip,
  };
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/useTooltipPosition.test.ts`
Expected: PASS

---

### Task 6: Componentes de Presentación Puros (`DefaultIcon`, `SidebarBrand`, `SidebarToggleButton`, `SidebarUserFooter`)

**Files:**
- Create: `frontend/src/ui-components/sidebar/components/DefaultIcon.tsx`
- Create: `frontend/src/ui-components/sidebar/components/SidebarBrand.tsx`
- Create: `frontend/src/ui-components/sidebar/components/SidebarToggleButton.tsx`
- Create: `frontend/src/ui-components/sidebar/components/SidebarUserFooter.tsx`
- Test: `frontend/src/__tests__/ui-components/sidebar/SidebarPresentational.test.tsx`

**Interfaces:**
- Produces: `<DefaultIcon />`, `<SidebarBrand />`, `<SidebarToggleButton />`, `<SidebarUserFooter />`

- [ ] **Step 1: Escribir los tests en `frontend/src/__tests__/ui-components/sidebar/SidebarPresentational.test.tsx`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarBrand } from "../../../ui-components/sidebar/components/SidebarBrand";
import { SidebarToggleButton } from "../../../ui-components/sidebar/components/SidebarToggleButton";
import { SidebarUserFooter } from "../../../ui-components/sidebar/components/SidebarUserFooter";
import { DefaultIcon } from "../../../ui-components/sidebar/components/DefaultIcon";

describe("Sidebar Presentational Components", () => {
  it("DefaultIcon renders svg", () => {
    const { container } = render(<DefaultIcon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  describe("SidebarBrand", () => {
    it("renders brand name and logo when not collapsed", () => {
      render(
        <SidebarBrand
          brand="Sistema POS"
          logo={<span data-testid="logo">Logo</span>}
          collapsed={false}
        />
      );
      expect(screen.getByText("Sistema POS")).toBeInTheDocument();
      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("hides brand text when collapsed", () => {
      render(
        <SidebarBrand
          brand="Sistema POS"
          logo={<span data-testid="logo">Logo</span>}
          collapsed={true}
        />
      );
      const brandSpan = screen.getByText("Sistema POS");
      expect(brandSpan.className).toContain("opacity-0");
    });
  });

  describe("SidebarToggleButton", () => {
    it("triggers onToggle and has appropriate aria-label", async () => {
      const onToggle = vi.fn();
      render(<SidebarToggleButton collapsed={false} onToggle={onToggle} />);
      const btn = screen.getByLabelText("Collapse sidebar");
      await userEvent.click(btn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("displays Expand sidebar aria-label when collapsed", () => {
      render(<SidebarToggleButton collapsed={true} onToggle={vi.fn()} />);
      expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
    });
  });

  describe("SidebarUserFooter", () => {
    it("renders user information and triggers onLogout", async () => {
      const onLogout = vi.fn();
      render(
        <SidebarUserFooter
          user={{ name: "Carlos Perez", email: "carlos@test.com" }}
          collapsed={false}
          onLogout={onLogout}
        />
      );

      expect(screen.getByText("Carlos Perez")).toBeInTheDocument();
      expect(screen.getByText("carlos@test.com")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();

      const logoutBtn = screen.getByLabelText("Cerrar sesión");
      await userEvent.click(logoutBtn);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("renders avatar image if available", () => {
      render(
        <SidebarUserFooter
          user={{
            name: "Maria Ruiz",
            email: "maria@test.com",
            avatar: "https://test.com/avatar.png",
          }}
          collapsed={false}
        />
      );
      const img = screen.getByAltText("Maria Ruiz");
      expect(img).toHaveAttribute("src", "https://test.com/avatar.png");
    });
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/SidebarPresentational.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar los 4 componentes de presentación**

1. `frontend/src/ui-components/sidebar/components/DefaultIcon.tsx`:
```typescript
export function DefaultIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}
```

2. `frontend/src/ui-components/sidebar/components/SidebarBrand.tsx`:
```typescript
import type { SidebarBrandProps } from "../types";

export function SidebarBrand({ brand, logo, collapsed }: SidebarBrandProps) {
  if (!brand && !logo) return null;

  return (
    <div
      className={`flex items-center gap-3 overflow-hidden pt-5 pb-4 transition-all duration-300 ${
        collapsed ? "justify-center px-2" : "px-4"
      }`}
    >
      {logo && <span className="shrink-0">{logo}</span>}
      {brand && (
        <span
          className={`
            text-base font-semibold whitespace-nowrap text-text-main
            transition-opacity duration-300
            ${collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"}
          `}
        >
          {brand}
        </span>
      )}
    </div>
  );
}
```

3. `frontend/src/ui-components/sidebar/components/SidebarToggleButton.tsx`:
```typescript
import { ChevronLeft } from "lucide-react";
import type { SidebarToggleButtonProps } from "../types";

export function SidebarToggleButton({
  collapsed,
  onToggle,
}: SidebarToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="
        absolute top-[3.5%] right-0 z-40 hidden
        size-7 translate-x-1/2 cursor-pointer items-center
        justify-center rounded-full border
        border-slate-200 bg-white
        text-slate-500 shadow-md transition-all
        duration-300 hover:text-slate-800
        lg:flex
      "
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <ChevronLeft
        size={16}
        className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
      />
    </button>
  );
}
```

4. `frontend/src/ui-components/sidebar/components/SidebarUserFooter.tsx`:
```typescript
import { LogOut } from "lucide-react";
import type { SidebarUserFooterProps } from "../types";

export function SidebarUserFooter({
  user,
  collapsed,
  onLogout,
}: SidebarUserFooterProps) {
  return (
    <div className="border-t border-slate-200 px-2.5 py-3">
      {collapsed ? (
        <div className="flex justify-center">
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger text-white transition-colors hover:bg-red-700"
              aria-label="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="size-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-slate-500">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col overflow-hidden whitespace-nowrap opacity-100">
            <span className="truncate text-sm font-semibold text-text-main">
              {user.name}
            </span>
            <span className="truncate text-xs text-slate-500">{user.email}</span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger text-white transition-colors hover:bg-red-700"
              aria-label="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/SidebarPresentational.test.tsx`
Expected: PASS

---

### Task 7: Componentes Interactivos (`SidebarLink` y `SidebarDropdown`)

**Files:**
- Create: `frontend/src/ui-components/sidebar/components/SidebarLink.tsx`
- Create: `frontend/src/ui-components/sidebar/components/SidebarDropdown.tsx`
- Test: `frontend/src/__tests__/ui-components/sidebar/SidebarNavigationComponents.test.tsx`

**Interfaces:**
- Consumes: `useTooltipPosition`, `useHoverFlyout`, `DefaultIcon`, types
- Produces: `<SidebarLink />`, `<SidebarDropdown />`

- [ ] **Step 1: Escribir el test en `frontend/src/__tests__/ui-components/sidebar/SidebarNavigationComponents.test.tsx`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarLink } from "../../../ui-components/sidebar/components/SidebarLink";
import { SidebarDropdown } from "../../../ui-components/sidebar/components/SidebarDropdown";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Sidebar Navigation Components", () => {
  describe("SidebarLink", () => {
    it("renders link with label and active style when active", () => {
      renderWithRouter(
        <SidebarLink item={{ label: "Dashboard", to: "/" }} collapsed={false} />
      );
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("shows tooltip on hover when collapsed is true", async () => {
      renderWithRouter(
        <SidebarLink item={{ label: "Dashboard", to: "/" }} collapsed={true} />
      );
      const link = screen.getByText("Dashboard").closest("a");
      expect(link).toBeInTheDocument();

      await userEvent.hover(link!);
      const elements = screen.getAllByText("Dashboard");
      expect(elements.length).toBeGreaterThan(1);
    });
  });

  describe("SidebarDropdown", () => {
    const item = {
      label: "Settings",
      items: [
        { label: "Profile", to: "/settings/profile" },
        { label: "Security", to: "/settings/security" },
      ],
    };

    it("renders dropdown button and expands submenu items when expanded", () => {
      renderWithRouter(
        <SidebarDropdown
          item={item}
          collapsed={false}
          expanded={true}
          expandAll={false}
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Security")).toBeInTheDocument();
    });

    it("calls onToggle when clicking dropdown button in expanded mode", async () => {
      const onToggle = vi.fn();
      renderWithRouter(
        <SidebarDropdown
          item={item}
          collapsed={false}
          expanded={false}
          expandAll={false}
          onToggle={onToggle}
        />
      );
      await userEvent.click(screen.getByText("Settings"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("shows flyout menu on hover when collapsed is true", async () => {
      renderWithRouter(
        <SidebarDropdown
          item={item}
          collapsed={true}
          expanded={false}
          expandAll={false}
          onToggle={vi.fn()}
        />
      );
      const container = screen.getByText("Settings").closest("div");
      expect(container).toBeInTheDocument();
      expect(screen.queryByText("Profile")).not.toBeInTheDocument();

      await userEvent.hover(container!);
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Security")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/SidebarNavigationComponents.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `SidebarLink.tsx` y `SidebarDropdown.tsx`**

1. `frontend/src/ui-components/sidebar/components/SidebarLink.tsx`:
```typescript
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { DefaultIcon } from "./DefaultIcon";
import { useTooltipPosition } from "../hooks/useTooltipPosition";
import type { SidebarLinkProps } from "../types";

export function SidebarLink({ item, collapsed }: SidebarLinkProps) {
  const { linkRef, showTooltip, pos, handleMouseEnter, handleMouseLeave, hideTooltip } =
    useTooltipPosition({ collapsed });

  return (
    <>
      <NavLink
        ref={linkRef}
        to={item.to!}
        onClick={hideTooltip}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            isActive
              ? "bg-brand-blue/10 text-brand-blue"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`
        }
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {item.icon || <DefaultIcon />}
        </span>
        <span
          className={`transition-opacity duration-300 ${
            collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
          }`}
        >
          {item.label}
        </span>
      </NavLink>

      {collapsed &&
        showTooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
            }}
            className="pointer-events-none z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-sidebar-tooltip"
          >
            {item.label}
          </div>,
          document.body
        )}
    </>
  );
}
```

2. `frontend/src/ui-components/sidebar/components/SidebarDropdown.tsx`:
```typescript
import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { DefaultIcon } from "./DefaultIcon";
import { useHoverFlyout } from "../hooks/useHoverFlyout";
import type { SidebarDropdownProps } from "../types";

export function SidebarDropdown({
  item,
  collapsed,
  expanded,
  expandAll,
  onToggle,
}: SidebarDropdownProps) {
  const {
    btnRef,
    isHovering,
    hoverPos,
    showHoverMenu,
    hideHoverMenu,
    keepHoverMenu,
    closeHoverMenu,
  } = useHoverFlyout({ collapsed });

  const submenuItems = item.items?.map((sub, i) => (
    <NavLink
      key={i}
      to={sub.to!}
      end
      className={({ isActive }) =>
        `block px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
          isActive
            ? "text-brand-blue font-medium bg-brand-blue/10"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
        }`
      }
    >
      {sub.label}
    </NavLink>
  ));

  const flyoutMenu = (
    <div
      className="z-50 min-w-44 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl animate-sidebar-flyout"
      style={{ position: "fixed", top: hoverPos.top, left: hoverPos.left }}
      onMouseEnter={keepHoverMenu}
      onMouseLeave={hideHoverMenu}
    >
      <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {item.label}
      </div>
      <div className="pt-1 space-y-0.5">
        {item.items?.map((sub, i) => (
          <NavLink
            key={i}
            to={sub.to!}
            end
            onClick={closeHoverMenu}
            className={({ isActive }) =>
              `block px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-brand-blue/10 text-brand-blue font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`
            }
          >
            {sub.label}
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="relative"
      onMouseEnter={showHoverMenu}
      onMouseLeave={hideHoverMenu}
    >
      <button
        ref={btnRef}
        onClick={onToggle}
        className={`
          flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
          ${expanded ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}
        `}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {item.icon || <DefaultIcon />}
        </span>
        <span
          className={`truncate transition-opacity duration-300 ${
            collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
          }`}
        >
          {item.label}
        </span>
        {!collapsed && !expandAll && (
          <ChevronDown
            size={14}
            className={`ml-auto transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Submenú: portal flotante en colapsado, acordeón Grid en expandido */}
      {collapsed
        ? isHovering && createPortal(flyoutMenu, document.body)
        : expanded && (
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden pl-7 space-y-0.5">
                {submenuItems}
              </div>
            </div>
          )}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar el test para comprobar que pasa**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/SidebarNavigationComponents.test.tsx`
Expected: PASS

---

### Task 8: Refactorizar `Sidebar.tsx` como Orquestador Limpio y Verificación Global

**Files:**
- Modify: `frontend/src/ui-components/Sidebar.tsx`
- Test: `frontend/src/__tests__/ui-components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: Hooks y subcomponentes de `frontend/src/ui-components/sidebar/`
- Produces: `default export Sidebar`, re-exports `SidebarItem`, `SidebarUser`, `SidebarProps`.

- [ ] **Step 1: Refactorizar `frontend/src/ui-components/Sidebar.tsx`**

```typescript
import { useSidebarCollapse } from "./sidebar/hooks/useSidebarCollapse";
import { useSidebarAccordion } from "./sidebar/hooks/useSidebarAccordion";
import { SidebarBrand } from "./sidebar/components/SidebarBrand";
import { SidebarToggleButton } from "./sidebar/components/SidebarToggleButton";
import { SidebarLink } from "./sidebar/components/SidebarLink";
import { SidebarDropdown } from "./sidebar/components/SidebarDropdown";
import { SidebarUserFooter } from "./sidebar/components/SidebarUserFooter";
import type { SidebarProps, SidebarItem, SidebarUser } from "./sidebar/types";

export type { SidebarItem, SidebarUser, SidebarProps };

export default function Sidebar({
  items,
  brand = "",
  logo,
  user,
  onLogout,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  expandAll = false,
  forceExpanded = false,
  className = "",
}: SidebarProps) {
  const { collapsed, toggleCollapsed } = useSidebarCollapse({
    controlledCollapsed,
    onCollapsedChange,
    forceExpanded,
  });

  const { isExpanded, toggleSubmenu } = useSidebarAccordion({
    itemCount: items.length,
    expandAll,
  });

  return (
    <aside
      className={`
        relative flex h-dvh flex-col bg-surface
        shadow-[1px_0_10px_rgba(0,0,0,0.08)] transition-all duration-300
        ease-in-out
        ${collapsed ? "w-[4.94rem]" : "w-60"}
        ${className}
      `}
    >
      <SidebarToggleButton collapsed={collapsed} onToggle={toggleCollapsed} />

      <SidebarBrand brand={brand} logo={logo} collapsed={collapsed} />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5">
        {items.map((item, i) =>
          item.items ? (
            <SidebarDropdown
              key={i}
              item={item}
              collapsed={collapsed}
              expanded={isExpanded(i)}
              expandAll={expandAll}
              onToggle={() => toggleSubmenu(i)}
            />
          ) : item.to ? (
            <SidebarLink key={i} item={item} collapsed={collapsed} />
          ) : null
        )}
      </nav>

      {user && (
        <SidebarUserFooter
          user={user}
          collapsed={collapsed}
          onLogout={onLogout}
        />
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Ejecutar los tests existentes de integración de Sidebar**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/Sidebar.test.tsx`
Expected: 11 tests PASS (100% GREEN)

- [ ] **Step 3: Ejecutar todos los tests unitarios de sidebar**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/ui-components/sidebar/`
Expected: Todos los tests pasan

- [ ] **Step 4: Comprobación estricta de TypeScript**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b` inside `frontend/`
Expected: 0 errores

- [ ] **Step 5: Ejecutar la suite completa de pruebas de frontend**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test` inside `frontend/`
Expected: Suite global en verde
