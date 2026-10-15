# Drawers Modernization & Products Deep-Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar los módulos de Categorías y Proveedores con el catálogo de Productos mediante deep-linking por URL (`/products?categoria_id=X` y `/products?proveedor_id=Y`), y modernizar la estética de `CategoryAnalyticsDrawer` y `SupplierAnalyticsDrawer` al estándar limpio de Reportes y Productos con tarjetas de métricas en superficie blanca y micro-chips temáticos.

**Architecture:**
- Extender `useProductsStore` y `useProductFilters` para leer parámetros `categoria_id` y `proveedor_id` desde `useSearchParams`, inicializando los filtros activos de productos al entrar con query params.
- Modernizar la presentación visual de `CategoryAnalyticsDrawer` y `SupplierAnalyticsDrawer`: sustituir los 4 cuadros con fondos planos de color saturado por tarjetas limpias en `bg-surface border-slate-200/90 shadow-xs` con micro-chips redondeados de color suave (estilo Reportes).
- Agregar un banner de navegación rápida en la cabecera de ambos Drawers y hacer la tarjeta de "Productos" interactiva para redirigir a `/products` con el filtro correspondiente aplicado en un solo clic.
- Refinar los indicadores de stock en las tablas internas de inventario (`CategoryInventoryTable` y `SupplierInventoryTable`) para alinearlos con el diseño de badges del catálogo principal.

**Tech Stack:** React 19, TypeScript, React Router 7 (`useSearchParams`, `useNavigate`), Zustand 5, Tailwind CSS v4, Lucide React, Vitest.

**Spec:** Requerimiento del usuario para enriquecer la interactividad entre Categorías/Proveedores y Productos, y modernizar los Drawers analíticos actuales (Imágenes 3 y 4).

## Global Constraints

- **Cero roturas de contratos de API ni endpoints backend:** `GET /products` ya soporta `categoria_ids` y `proveedor_id`; la integración se realiza en la capa de frontend.
- **TypeScript estricto:** Prohibido el uso de `any`; respetar todas las firmas e interfaces existentes.
- **Compatibilidad total con pruebas:** Preservar todos los textos exactos probados por Vitest en `SupplierAnalyticsComponents.test.tsx` (`"Productos"`, `"Stock en Tienda"`, `"Ingresos Totales"`, `"Ganancia Bruta"`, `"X% de margen promedio"`).
- **Preservar el botón de cierre del Drawer:** El botón de cerrar en `Drawer.tsx` (`aria-label="Cerrar"`) debe seguir siendo el primer botón accesible dentro del encabezado del modal para mantener intactos los tests que usan `screen.getAllByRole("button")[0]`.
- **Entorno Windows con fnm:** Comandos de Node deben anteponer `$env:PATH = "$env:APPDATA\\fnm\\node-versions\\v24.18.0\\installation;" + $env:PATH; cd frontend;`.

---

### Task 1: Soporte de Parámetros URL (`categoria_id` y `proveedor_id`) en Módulo de Productos

**Files:**
- Modify: `frontend/src/features/products/stores/useProductsStore.ts:70-85, 190-205`
- Modify: `frontend/src/features/products/hooks/useProductFilters.ts:40-55`
- Test: `frontend/src/__tests__/features/products/useProductFilters.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams` de `react-router-dom`
- Produces:
  - `setCategoryFromUrl: (categoryId: number) => void` en `useProductsStore`
  - `setSupplierFromUrl: (supplierId: number) => void` en `useProductsStore`
  - Inicialización automática de `categoria_ids: [categoryId]` o `proveedor_id: supplierId` en `filters` y `draftFilters` al entrar a `/products?categoria_id=X` o `/products?proveedor_id=Y`.

- [ ] **Step 1: Escribir test fallido para inicialización de filtros desde URL**

Editar `frontend/src/__tests__/features/products/useProductFilters.test.tsx` para agregar la prueba de query params de categoría y proveedor:
```tsx
  it("initializes category and supplier filters from URL searchParams", () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={["/products?categoria_id=5&proveedor_id=2"]}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useProductFilters(), { wrapper: customWrapper });

    expect(result.current.filters.categoria_ids).toEqual([5]);
    expect(result.current.filters.proveedor_id).toBe(2);
    expect(result.current.draftFilters.categoria_ids).toEqual([5]);
    expect(result.current.draftFilters.proveedor_id).toBe(2);
    expect(result.current.activeFiltersCount).toBe(2);
  });
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/useProductFilters.test.tsx
```
Esperado: FAIL (la función aún no lee `categoria_id` ni `proveedor_id`).

- [ ] **Step 3: Implementar `setCategoryFromUrl` y `setSupplierFromUrl` en `useProductsStore.ts`**

En `frontend/src/features/products/stores/useProductsStore.ts`:
1. Agregar a la interfaz `ProductsState`:
```ts
  setCategoryFromUrl: (categoryId: number) => void;
  setSupplierFromUrl: (supplierId: number) => void;
```
2. Implementar los métodos en el store:
```ts
  setCategoryFromUrl: (categoryId) =>
    set((state) => ({
      filters: { ...state.filters, categoria_ids: [categoryId] },
      draftFilters: { ...state.draftFilters, categoria_ids: [categoryId] },
      page: 1,
    })),

  setSupplierFromUrl: (supplierId) =>
    set((state) => ({
      filters: { ...state.filters, proveedor_id: supplierId },
      draftFilters: { ...state.draftFilters, proveedor_id: supplierId },
      page: 1,
    })),
```

- [ ] **Step 4: Conectar `useSearchParams` en `useProductFilters.ts`**

En `frontend/src/features/products/hooks/useProductFilters.ts`:
1. Obtener las acciones del store:
```ts
  const setCategoryFromUrl = useProductsStore((s) => s.setCategoryFromUrl);
  const setSupplierFromUrl = useProductsStore((s) => s.setSupplierFromUrl);
```
2. Actualizar el `useEffect` que escucha `searchParams`:
```ts
  useEffect(() => {
    const stockParam = searchParams.get("stock");
    if (stockParam && ["disponible", "bajo", "agotado"].includes(stockParam)) {
      setStockStatusFromUrl(stockParam as ProductFiltersState["stockStatus"]);
    }

    const catParam = searchParams.get("categoria_id");
    if (catParam) {
      const id = Number(catParam);
      if (!isNaN(id) && id > 0) {
        setCategoryFromUrl(id);
      }
    }

    const provParam = searchParams.get("proveedor_id");
    if (provParam) {
      const id = Number(provParam);
      if (!isNaN(id) && id > 0) {
        setSupplierFromUrl(id);
      }
    }
  }, [
    searchParams,
    setStockStatusFromUrl,
    setCategoryFromUrl,
    setSupplierFromUrl,
  ]);
```

- [ ] **Step 5: Ejecutar test para comprobar que pasa**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/useProductFilters.test.tsx
```
Esperado: PASS (7 tests pasando).

- [ ] **Step 6: Commit de Task 1**

```bash
git add frontend/src/features/products/stores/useProductsStore.ts frontend/src/features/products/hooks/useProductFilters.ts frontend/src/__tests__/features/products/useProductFilters.test.tsx
git commit -m "feat(products): soportar filtrado inicial por categoria_id y proveedor_id desde URL"
```

---

### Task 2: Modernizar `CategoryAnalyticsDrawer` con Tarjetas Limpias y Acceso a Productos

**Files:**
- Modify: `frontend/src/features/categories/components/CategoryAnalyticsDrawer.tsx`
- Test: `frontend/src/__tests__/features/categories/CategoriesPage.test.tsx`

**Interfaces:**
- Consumes: `CategoryAnalyticsDrawerProps` (`open`, `onClose`, `categoryId`, `categoryName`), `useNavigate` de `react-router-dom`
- Produces: Drawer estilizado con:
  - Banner superior interactivo de acceso al catálogo (`/products?categoria_id=${categoryId}`).
  - Tarjetas métricas en `bg-surface border-slate-200/90 shadow-xs` con micro-chips (`Package`, `ShoppingBag`, `DollarSign`, `Percent`).
  - Tarjeta de Productos con cursor pointer y hover que también navega al catálogo.

- [ ] **Step 1: Verificar tests de Categorías**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/categories/
```
Esperado: PASS (32 tests pasando).

- [ ] **Step 2: Actualizar `frontend/src/features/categories/components/CategoryAnalyticsDrawer.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { Package, ShoppingBag, DollarSign, Percent, ArrowRight, Boxes } from "lucide-react";
import Drawer from "@/ui-components/Drawer";
import Spinner from "@/ui-components/Spinner";
import Button from "@/ui-components/Button";
import CategoryTopProductsChart from "./CategoryTopProductsChart";
import CategoryInventoryTable from "./CategoryInventoryTable";
import { useCategoryDetailAnalytics } from "../hooks/useCategoryDetailAnalytics";
import { formatCurrency } from "@/lib/utils";

interface CategoryAnalyticsDrawerProps {
  open: boolean;
  onClose: () => void;
  categoryId: number | null;
  categoryName: string;
}

export default function CategoryAnalyticsDrawer({
  open,
  onClose,
  categoryId,
  categoryName,
}: CategoryAnalyticsDrawerProps) {
  const navigate = useNavigate();
  const { data, loading, error } = useCategoryDetailAnalytics(categoryId);

  const handleGoToProducts = () => {
    if (!categoryId) return;
    onClose();
    navigate(`/products?categoria_id=${categoryId}`);
  };

  return (
    <Drawer open={open} onClose={onClose} title={categoryName} className="sm:w-135!">
      {loading || !data ? (
        <Spinner />
      ) : error ? (
        <div className="flex h-50 items-center justify-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Action banner: link to products catalog */}
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white shadow-xs">
                <Boxes className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Catálogo de Productos</p>
                <p className="text-[11px] text-slate-500">
                  {data.total_productos} productos registrados en esta categoría
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToProducts}
              className="bg-white text-xs gap-1.5 shadow-xs hover:bg-slate-50"
            >
              <span>Ver en Catálogo</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {/* Clean Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* KPI 1: Productos (Clickable) */}
            <div
              onClick={handleGoToProducts}
              className="group relative cursor-pointer rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
              title="Ver productos en el catálogo"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Productos</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
                  <Package className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">{data.total_productos}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-blue group-hover:underline">
                Explorar catálogo <ArrowRight className="size-3" />
              </p>
            </div>

            {/* KPI 2: Unidades Vendidas */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Unidades Vendidas</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShoppingBag className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">{data.unidades_vendidas}</p>
              <p className="mt-1 text-[11px] text-slate-400">Total histórico comercializado</p>
            </div>

            {/* KPI 3: Ingresos */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ingresos</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <DollarSign className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {formatCurrency(Number(data.ingresos_usd))}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Ventas brutas acumuladas</p>
            </div>

            {/* KPI 4: Ganancia Bruta */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ganancia Bruta</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Percent className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {formatCurrency(
                  Math.round(Number(data.ingresos_usd) * (Number(data.margen_promedio) / 100) * 100) / 100,
                )}
              </p>
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
                {Number(data.margen_promedio).toFixed(1)}% de margen promedio
              </p>
            </div>
          </div>

          <CategoryTopProductsChart data={data.top_productos} />
          <CategoryInventoryTable data={data.top_productos} categoryName={categoryName} />
        </div>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 3: Ejecutar tests para comprobar que pasan**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/categories/
```
Esperado: PASS (32 tests pasando).

- [ ] **Step 4: Commit de Task 2**

```bash
git add frontend/src/features/categories/components/CategoryAnalyticsDrawer.tsx
git commit -m "style(categories): modernizar CategoryAnalyticsDrawer y enlazar a catalogo de productos"
```

---

### Task 3: Modernizar `SupplierAnalyticsDrawer` con Tarjetas Limpias y Acceso a Productos

**Files:**
- Modify: `frontend/src/features/suppliers/components/SupplierAnalyticsDrawer.tsx`
- Test: `frontend/src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx`

**Interfaces:**
- Consumes: `SupplierAnalyticsDrawerProps` (`open`, `onClose`, `supplierId`, `supplierName`), `useNavigate`
- Produces: Drawer estilizado con:
  - Banner superior de acceso al catálogo (`/products?proveedor_id=${supplierId}`).
  - Tarjetas métricas limpias con micro-chips pasteles (`Package`, `Boxes`, `DollarSign`, `Percent`).
  - Preservación textual exacta requerida por tests: `"Productos"`, `"Stock en Tienda"`, `"Ingresos Totales"`, `"Ganancia Bruta"`, `"30.0% de margen promedio"`.
  - Primer botón accesible reservado para el cierre de `Drawer.tsx`.

- [ ] **Step 1: Verificar tests de `SupplierAnalyticsComponents`**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx
```
Esperado: PASS (10 tests pasando).

- [ ] **Step 2: Actualizar `frontend/src/features/suppliers/components/SupplierAnalyticsDrawer.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { Package, Boxes, DollarSign, Percent, ArrowRight, Building2 } from "lucide-react";
import Drawer from "@/ui-components/Drawer";
import Spinner from "@/ui-components/Spinner";
import Button from "@/ui-components/Button";
import SupplierTopProductsChart from "./SupplierTopProductsChart";
import SupplierInventoryTable from "./SupplierInventoryTable";
import { useSupplierDetailAnalytics } from "../hooks/useSupplierDetailAnalytics";
import { formatCurrency } from "@/lib/utils";

interface SupplierAnalyticsDrawerProps {
  open: boolean;
  onClose: () => void;
  supplierId: number | null;
  supplierName: string;
}

export default function SupplierAnalyticsDrawer({
  open,
  onClose,
  supplierId,
  supplierName,
}: SupplierAnalyticsDrawerProps) {
  const navigate = useNavigate();
  const { data, loading, error } = useSupplierDetailAnalytics(supplierId);

  const handleGoToProducts = () => {
    if (!supplierId) return;
    onClose();
    navigate(`/products?proveedor_id=${supplierId}`);
  };

  return (
    <Drawer open={open} onClose={onClose} title={supplierName} className="sm:w-135!">
      {loading || !data ? (
        <Spinner />
      ) : error ? (
        <div className="flex h-50 items-center justify-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Action banner: link to products catalog */}
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white shadow-xs">
                <Building2 className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Catálogo del Proveedor</p>
                <p className="text-[11px] text-slate-500">
                  {data.total_productos} productos suministrados
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToProducts}
              className="bg-white text-xs gap-1.5 shadow-xs hover:bg-slate-50"
            >
              <span>Ver en Catálogo</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {/* Clean Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* KPI 1: Productos (Clickable) */}
            <div
              onClick={handleGoToProducts}
              className="group relative cursor-pointer rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
              title="Ver productos de este proveedor en el catálogo"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Productos</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
                  <Package className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">{data.total_productos}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-blue group-hover:underline">
                Explorar catálogo <ArrowRight className="size-3" />
              </p>
            </div>

            {/* KPI 2: Stock en Tienda */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Stock en Tienda</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Boxes className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">{data.stock_total}</p>
              <p className="mt-1 text-[11px] text-slate-400">Unidades totales disponibles</p>
            </div>

            {/* KPI 3: Ingresos Totales */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ingresos Totales</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <DollarSign className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {formatCurrency(Number(data.ingresos_usd))}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Total facturado en ventas</p>
            </div>

            {/* KPI 4: Ganancia Bruta */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ganancia Bruta</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Percent className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {formatCurrency(
                  Math.round(Number(data.ingresos_usd) * (Number(data.margen_promedio) / 100) * 100) / 100,
                )}
              </p>
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
                {Number(data.margen_promedio).toFixed(1)}% de margen promedio
              </p>
            </div>
          </div>

          <SupplierTopProductsChart data={data.top_productos} />
          <SupplierInventoryTable data={data.top_productos} supplierName={supplierName} />
        </div>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 3: Ejecutar tests para comprobar que pasan**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx
```
Esperado: PASS (10 tests pasando).

- [ ] **Step 4: Commit de Task 3**

```bash
git add frontend/src/features/suppliers/components/SupplierAnalyticsDrawer.tsx
git commit -m "style(suppliers): modernizar SupplierAnalyticsDrawer y enlazar a catalogo de productos"
```

---

### Task 4: Refinar Tablas Internas del Drawer (`CategoryInventoryTable` y `SupplierInventoryTable`)

**Files:**
- Modify: `frontend/src/features/categories/components/CategoryInventoryTable.tsx`
- Modify: `frontend/src/features/suppliers/components/SupplierInventoryTable.tsx`
- Test: `frontend/src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx`

**Interfaces:**
- Consumes: `CategoryDetailProduct[]`, `SupplierDetailProduct[]`, `useSortableData`
- Produces: Tablas internas del Drawer con badges de stock redondeados, precio en negrita destacado (`text-slate-900 font-semibold`), cabecera con contador de ítems y botón de descarga con estilo limpio.

- [ ] **Step 1: Verificar tests de tablas de inventario**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx
```
Esperado: PASS.

- [ ] **Step 2: Actualizar `frontend/src/features/categories/components/CategoryInventoryTable.tsx`**

Alinear la tipografía de precios y badges de stock con el estándar visual de la aplicación:
```tsx
import { formatCurrency } from "@/lib/utils";
import type { CategoryDetailProduct } from "@/types/api";
import Table from "@/ui-components/Table";
import { useSortableData } from "@/hooks/useSortableData";
import { useToast } from "@/ui-components/Toast";

interface CategoryInventoryTableProps {
  data: CategoryDetailProduct[];
  categoryName: string;
}

export default function CategoryInventoryTable({ data, categoryName }: CategoryInventoryTableProps) {
  const { toast } = useToast();
  const { sorted, sortConfig, requestSort } = useSortableData(
    data as (CategoryDetailProduct & Record<string, unknown>)[],
    "nombre",
  );

  if (!data.length) {
    return (
      <div className="flex h-30 items-center justify-center">
        <p className="text-sm text-slate-400">Sin productos en esta categoría</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">Inventario</h3>
        <span className="text-xs font-medium text-slate-400">{data.length} productos</span>
      </div>
      <div className="max-h-65 overflow-y-auto rounded-xl border border-slate-200/90 shadow-xs">
        <Table
          columns={[
            {
              key: "nombre",
              header: "Producto",
              sortable: true,
              onSort: () => requestSort("nombre"),
              sortDirection: sortConfig?.key === "nombre" ? sortConfig.direction : null,
              className: "max-w-44 truncate font-medium text-slate-900",
            },
            {
              key: "stock_unidades",
              header: "Stock",
              sortable: true,
              onSort: () => requestSort("stock_unidades"),
              sortDirection: sortConfig?.key === "stock_unidades" ? sortConfig.direction : null,
              render: (p: CategoryDetailProduct) =>
                p.stock_unidades <= 0 ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    0 uds
                  </span>
                ) : p.stock_unidades <= 5 ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {p.stock_unidades} uds
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-700">{p.stock_unidades} uds</span>
                ),
              exportValue: (p: CategoryDetailProduct) => p.stock_unidades,
            },
            {
              key: "precio_unidad_usd",
              header: "Precio",
              sortable: true,
              onSort: () => requestSort("precio_unidad_usd"),
              sortDirection: sortConfig?.key === "precio_unidad_usd" ? sortConfig.direction : null,
              render: (p: CategoryDetailProduct) => (
                <span className="font-semibold text-slate-900">
                  {formatCurrency(Number(p.precio_unidad_usd))}
                </span>
              ),
              exportValue: (p: CategoryDetailProduct) => Number(p.precio_unidad_usd),
            },
            {
              key: "margen_porcentaje",
              header: "Margen",
              sortable: true,
              onSort: () => requestSort("margen_porcentaje"),
              sortDirection: sortConfig?.key === "margen_porcentaje" ? sortConfig.direction : null,
              render: (p: CategoryDetailProduct) => (
                <span className="text-xs font-semibold text-emerald-600">
                  {Number(p.margen_porcentaje).toFixed(1)}%
                </span>
              ),
              exportValue: (p: CategoryDetailProduct) => Number(p.margen_porcentaje),
            },
          ]}
          data={sorted}
          keyExtractor={(p) => p.id}
          emptyMessage="Sin productos en esta categoría"
          exportable
          singleExport
          exportFilename={`Inventario_categoria_${categoryName}`}
          onExported={(name) => toast(`Archivo descargado: ${name}`, "success")}
          className="!rounded-none !border-0 !shadow-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Actualizar `frontend/src/features/suppliers/components/SupplierInventoryTable.tsx`**

Alinear de la misma manera:
```tsx
import { formatCurrency } from "@/lib/utils";
import type { SupplierDetailProduct } from "@/types/api";
import Table from "@/ui-components/Table";
import { useSortableData } from "@/hooks/useSortableData";
import { useToast } from "@/ui-components/Toast";

interface SupplierInventoryTableProps {
  data: SupplierDetailProduct[];
  supplierName: string;
}

export default function SupplierInventoryTable({ data, supplierName }: SupplierInventoryTableProps) {
  const { toast } = useToast();
  const { sorted, sortConfig, requestSort } = useSortableData(
    data as (SupplierDetailProduct & Record<string, unknown>)[],
    "stock_unidades",
    "asc",
  );

  if (!data.length) {
    return (
      <div className="flex h-30 items-center justify-center">
        <p className="text-sm text-slate-400">Sin productos de este proveedor</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">Catálogo e Inventario</h3>
        <span className="text-xs font-medium text-slate-400">{data.length} productos</span>
      </div>
      <div className="max-h-65 overflow-y-auto rounded-xl border border-slate-200/90 shadow-xs">
        <Table
          columns={[
            {
              key: "nombre",
              header: "Producto",
              sortable: true,
              onSort: () => requestSort("nombre"),
              sortDirection: sortConfig?.key === "nombre" ? sortConfig.direction : null,
              className: "max-w-44 truncate font-medium text-slate-900",
            },
            {
              key: "stock_unidades",
              header: "Stock",
              sortable: true,
              onSort: () => requestSort("stock_unidades"),
              sortDirection: sortConfig?.key === "stock_unidades" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) =>
                p.stock_unidades <= 0 ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    0
                  </span>
                ) : p.stock_unidades <= 5 ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {p.stock_unidades}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-700">{p.stock_unidades}</span>
                ),
              exportValue: (p: SupplierDetailProduct) => p.stock_unidades,
            },
            {
              key: "precio_unidad_usd",
              header: "Precio",
              sortable: true,
              onSort: () => requestSort("precio_unidad_usd"),
              sortDirection: sortConfig?.key === "precio_unidad_usd" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) => (
                <span className="font-semibold text-slate-900">
                  {formatCurrency(Number(p.precio_unidad_usd))}
                </span>
              ),
              exportValue: (p: SupplierDetailProduct) => Number(p.precio_unidad_usd),
            },
            {
              key: "margen_porcentaje",
              header: "Margen",
              sortable: true,
              onSort: () => requestSort("margen_porcentaje"),
              sortDirection: sortConfig?.key === "margen_porcentaje" ? sortConfig.direction : null,
              render: (p: SupplierDetailProduct) => (
                <span className="text-xs font-semibold text-emerald-600">
                  {Number(p.margen_porcentaje).toFixed(1)}%
                </span>
              ),
              exportValue: (p: SupplierDetailProduct) => Number(p.margen_porcentaje),
            },
          ]}
          data={sorted}
          keyExtractor={(p) => p.id}
          emptyMessage="Sin productos de este proveedor"
          exportable
          singleExport
          exportFilename={`Inventario_proveedor_${supplierName}`}
          onExported={(name) => toast(`Archivo descargado: ${name}`, "success")}
          className="!rounded-none !border-0 !shadow-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar tests para comprobar que pasan**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx
```
Esperado: PASS (10 tests pasando).

- [ ] **Step 5: Commit de Task 4**

```bash
git add frontend/src/features/categories/components/CategoryInventoryTable.tsx frontend/src/features/suppliers/components/SupplierInventoryTable.tsx
git commit -m "style(categories,suppliers): refinar tablas internas de inventario en drawers analiticos"
```

---

### Task 5: Verificación Integral del Ecosistema Frontend

**Files:**
- Todos los modificados en las tareas anteriores:
  - `useProductsStore.ts`
  - `useProductFilters.ts`
  - `CategoryAnalyticsDrawer.tsx`
  - `SupplierAnalyticsDrawer.tsx`
  - `CategoryInventoryTable.tsx`
  - `SupplierInventoryTable.tsx`

- [ ] **Step 1: Ejecutar verificación de tipos TypeScript**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm tsc --noEmit
```
Esperado: Salida limpia con 0 errores de tipado.

- [ ] **Step 2: Ejecutar la suite completa de tests de categorías y proveedores**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/categories/ src/__tests__/features/suppliers/
```
Esperado: PASS (15 archivos de prueba, 89+ tests pasando).

- [ ] **Step 3: Ejecutar la suite completa de tests de productos**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/
```
Esperado: PASS (24 archivos de prueba, 175+ tests pasando).
