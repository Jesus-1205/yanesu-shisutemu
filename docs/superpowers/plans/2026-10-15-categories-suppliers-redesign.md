# Categories & Suppliers Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar la presentación visual e interactividad de las páginas de Categorías (`features/categories`) y Proveedores (`features/suppliers`) para alinearlas con la estética rica en datos y tarjetas de Reportes (`Reportes > Categorías`) y Productos, garantizando 0 cambios de lógica y 100% de compatibilidad con los 89 tests existentes.

**Architecture:** 
- Convertir los micro-KPIs en tarjetas autónomas individuales con chips pasteles y sombras sutiles (`shadow-xs`).
- Reestructurar los contenedores de tabla para incluir cabecera descriptiva rica (título, subtítulo que incentiva el uso del Drawer analítico lateral, buscador y contador de registros).
- Enriquecer la presentación de filas en `CategoriesTable` y `SuppliersTable` con avatares temáticos, tipografía destacada (`font-semibold text-slate-900`), affordance visual explícito para analítica (`Analítica →` con `ChevronRight`), y botones de acción en reposo neutro con hovers suaves (`hover:bg-blue-50/80`, `hover:bg-red-50/80`).
- Agregar barra de búsqueda reactiva en la cabecera de la tabla de Proveedores (que actualmente carece de buscador).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Vitest, Testing Library.

**Spec:** Rediseño visual comparativo basado en `Reportes > Categorías` (`Tabla de Rendimiento de Categorías`) y el rediseño completado de `Productos`.

## Global Constraints

- **Cero cambios de lógica de negocio:** No alterar stores de Zustand, contratos de API ni endpoints backend.
- **TypeScript estricto:** Prohibido el uso de `any`; respetar todas las interfaces existentes (`Category`, `Supplier`).
- **Compatibilidad total con pruebas:** Preservar todos los `aria-label`, textos de fallback (`"—"`), mensajes vacíos (`emptyMessage`) y roles de botón para no romper ninguno de los 89 tests existentes.
- **Aislamiento de eventos:** Todo botón de acción dentro de las filas (`onEdit`, `onDelete`) debe ejecutar `e.stopPropagation()` para evitar abrir accidentalmente el Drawer analítico de la fila.
- **Entorno Windows con fnm:** Comandos de Node deben anteponer `$env:PATH = "$env:APPDATA\\fnm\\node-versions\\v24.18.0\\installation;" + $env:PATH; cd frontend;`.

---

### Task 1: Modernizar `CategoryMicroKPIs` y `SupplierMicroKPIs` a Tarjetas Autónomas

**Files:**
- Modify: `frontend/src/features/categories/components/CategoryMicroKPIs.tsx`
- Modify: `frontend/src/features/suppliers/components/SupplierMicroKPIs.tsx`
- Test: `frontend/src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx`
- Test: `frontend/src/__tests__/features/categories/CategoriesPage.test.tsx`

**Interfaces:**
- Consumes: `CategorySummaryResponse`, `SupplierSummaryResponse`, `loading: boolean`
- Produces: Grid de 3 tarjetas autónomas (`grid-cols-1 sm:grid-cols-3 gap-4`) con `rounded-xl border border-slate-200/90 bg-surface p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md`. Skeletons de carga con exactamente 3 elementos `.animate-pulse` para compatibilidad de tests.

- [ ] **Step 1: Verificar tests actuales de KPIs**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx
```
Esperado: PASS (10 tests pasando).

- [ ] **Step 2: Actualizar `frontend/src/features/categories/components/CategoryMicroKPIs.tsx`**

Reemplazar la estructura corrida con división interna por 3 tarjetas autónomas elegantes:
```tsx
import { Crown, TrendingUp, Package } from "lucide-react";
import type { CategorySummaryResponse } from "@/types/api";

interface CategoryMicroKPIsProps {
  data: CategorySummaryResponse | null;
  loading: boolean;
}

export default function CategoryMicroKPIs({ data, loading }: CategoryMicroKPIsProps) {
  if (loading || !data) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 shrink-0 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-6 w-20 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const liderNombre = data.categoria_lider_nombre || null;
  const mayorMargen =
    data.mayor_margen_porcentaje != null
      ? Number(data.mayor_margen_porcentaje)
      : null;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* KPI 1: Categoría Líder */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
          <Crown className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Categoría Líder
          </p>
          <p
            className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            title={liderNombre ?? undefined}
          >
            {liderNombre || "—"}
          </p>
        </div>
      </div>

      {/* KPI 2: Mayor Margen */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
          <TrendingUp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Mayor Margen
          </p>
          <p className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {mayorMargen !== null ? `${mayorMargen.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* KPI 3: Total Ítems */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105">
          <Package className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Total Ítems
          </p>
          <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {String(data.total_productos)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Actualizar `frontend/src/features/suppliers/components/SupplierMicroKPIs.tsx`**

Aplicar la misma estructura de 3 tarjetas autónomas preservando los selectores y textos requeridos por los tests:
```tsx
import { Building2, TrendingUp, Receipt } from "lucide-react";
import type { SupplierSummaryResponse } from "@/types/api";

interface SupplierMicroKPIsProps {
  data: SupplierSummaryResponse | null;
  loading: boolean;
}

export default function SupplierMicroKPIs({ data, loading }: SupplierMicroKPIsProps) {
  if (loading || !data) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 shrink-0 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-6 w-20 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const principalNombre = data.proveedor_principal_nombre || null;
  const totalFacturas = data.total_proveedores;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* KPI 1: Proveedor Principal */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Proveedor Principal
          </p>
          <p
            className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            title={principalNombre ?? undefined}
          >
            {principalNombre || "—"}
          </p>
        </div>
      </div>

      {/* KPI 2: Compras Totales */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
          <TrendingUp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Compras Totales
          </p>
          <p className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {String(data.total_productos)}
          </p>
        </div>
      </div>

      {/* KPI 3: Total Proveedores */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105">
          <Receipt className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Total Proveedores
          </p>
          <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {String(totalFacturas)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar tests para comprobar que pasan**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/SupplierAnalyticsComponents.test.tsx src/__tests__/features/categories/CategoriesPage.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit de Task 1**

```bash
git add frontend/src/features/categories/components/CategoryMicroKPIs.tsx frontend/src/features/suppliers/components/SupplierMicroKPIs.tsx
git commit -m "style(categories,suppliers): modernizar micro KPIs a tarjetas autonomas"
```

---

### Task 2: Modernizar `CategoriesTable` y `CategoriesPage`

**Files:**
- Modify: `frontend/src/features/categories/components/CategoriesTable.tsx`
- Modify: `frontend/src/features/categories/pages/CategoriesPage.tsx`
- Test: `frontend/src/__tests__/features/categories/components/CategoriesTable.test.tsx`
- Test: `frontend/src/__tests__/features/categories/CategoriesPage.test.tsx`

**Interfaces:**
- Consumes: `CategoriesTableProps` (`categories`, `loading`, `onRowClick`, `onEdit`, `onDelete`), `useCategoriesList`, `PageHeader`
- Produces: Tabla y contenedor con:
  - Cabecera con título "Catálogo de Categorías", subtítulo interactivo ("Haz clic en cualquier categoría para ver su analítica y productos asociados") y buscador con `shadow-xs`.
  - Icono de carpeta/categoría (`FolderTree`) en chip suave `bg-blue-50 text-brand-blue` en la columna Nombre.
  - Indicador de interactividad `Analítica →` con `ChevronRight` que reacciona en hover de fila sin añadir botones extra que alteren los índices esperados por los tests.
  - Botones de acción con hover suave (`hover:bg-blue-50/80 hover:text-brand-blue`, `hover:bg-red-50/80 hover:text-danger`) y `e.stopPropagation()`.
  - Footer integrado con contador ("Mostrando X de Y categorías") y `Pagination`.
  - Botones de acción de `PageHeader` con `shadow-xs`.

- [ ] **Step 1: Verificar tests de Categorías**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/categories/components/CategoriesTable.test.tsx src/__tests__/features/categories/CategoriesPage.test.tsx
```
Esperado: PASS (17 tests pasando).

- [ ] **Step 2: Actualizar `frontend/src/features/categories/components/CategoriesTable.tsx`**

```tsx
import { useMemo } from "react";
import { Pencil, Trash2, FolderTree, ChevronRight } from "lucide-react";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import type { Category } from "../types";

interface CategoriesTableProps {
  categories: Category[];
  loading: boolean;
  onRowClick?: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoriesTable({
  categories,
  loading,
  onRowClick,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  const columns: Column<Category>[] = useMemo(
    () => [
      {
        key: "nombre",
        header: "Nombre",
        render: (cat: Category) => (
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
              <FolderTree className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{cat.nombre}</p>
            </div>
          </div>
        ),
      },
      {
        key: "descripcion",
        header: "Descripción",
        hideOnMobile: true,
        render: (cat: Category) => (
          <span className={cat.descripcion ? "text-slate-600 text-xs" : "text-slate-400 font-mono"}>
            {cat.descripcion || "—"}
          </span>
        ),
      },
      {
        key: "detalle",
        header: "",
        className: "text-right w-24 hidden md:table-cell",
        render: () => (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-brand-blue">
            Analítica
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        ),
      },
      {
        key: "acciones",
        header: "Acciones",
        className: "text-right w-24",
        render: (cat: Category) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cat);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50/80 hover:text-brand-blue"
              aria-label="Editar"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(cat);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/80 hover:text-danger"
              aria-label="Eliminar"
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  return (
    <Table
      columns={columns}
      data={categories}
      keyExtractor={(c) => c.id}
      loading={loading}
      emptyMessage="No hay categorías registradas"
      onRowClick={onRowClick}
      className="!rounded-none !border-0 !shadow-none"
    />
  );
}
```

- [ ] **Step 3: Actualizar `frontend/src/features/categories/pages/CategoriesPage.tsx`**

Ajustar el `PageHeader` para que los botones tengan `shadow-xs`, estructurar la cabecera del contenedor de tabla idéntica a Reportes con título y subtítulo, y añadir el resumen de categorías en el pie junto a `Pagination`:
```tsx
import { useCallback, useState } from "react";
import { Plus, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import SearchInput from "@/ui-components/SearchInput";
import { useToast } from "@/ui-components/Toast";
import CategoryMicroKPIs from "../components/CategoryMicroKPIs";
import CategoryAnalyticsDrawer from "../components/CategoryAnalyticsDrawer";
import CategoriesTable from "../components/CategoriesTable";
import EditCategoryModal from "../components/EditCategoryModal";
import { useCategoryAnalytics } from "../hooks/useCategoryAnalytics";
import { useCategoriesList } from "../hooks/useCategoriesList";
import { useDeleteCategory } from "../hooks/useDeleteCategory";
import { useExportCategories } from "../hooks/useExportCategories";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";
import type { Category } from "../types";

export default function CategoriesPage() {
  const { toast } = useToast();

  const {
    categories,
    loading,
    error,
    page,
    totalPages,
    search,
    setSearch,
    setPage,
    refetch,
  } = useCategoriesList();

  const { handleExportAll } = useExportCategories();
  const {
    data: analytics,
    loading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useCategoryAnalytics();

  const refreshAll = useCallback(() => {
    refetch();
    refetchAnalytics();
  }, [refetch, refetchAnalytics]);

  const {
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
  } = useDeleteCategory({ onSuccess: refreshAll });

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleRowClick = useCallback((cat: Category) => {
    setSelectedCategory(cat);
  }, []);

  const handleEdit = useCallback(
    (cat: Category) => {
      setCategoryToEdit(cat);
    },
    [],
  );

  const handleCategoryCreated = () => {
    toast(`Categoría creada`, "success");
    setCreateModalOpen(false);
    refreshAll();
  };

  const handleCategoryUpdated = () => {
    toast(`Categoría actualizada`, "success");
    setCategoryToEdit(null);
    refreshAll();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Administra las categorías de productos"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAll} className="shadow-xs">
              <Download className="size-4" />
              Descargar Excel
            </Button>
            <Button variant="accent" onClick={() => setCreateModalOpen(true)} className="shadow-xs">
              <Plus className="size-4" />
              Nueva Categoría
            </Button>
          </div>
        }
      />

      <CategoryMicroKPIs data={analytics} loading={analyticsLoading} />

      {error && (
        <ErrorBanner onRetry={refreshAll}>
          {error}
        </ErrorBanner>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Card Header matching Reports */}
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Catálogo de Categorías
              </h2>
              <p className="text-xs text-slate-500">
                Haz clic en cualquier categoría para ver su analítica y productos asociados
              </p>
            </div>
            <div className="w-full sm:w-72">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                placeholder="Buscar categoría por nombre o descripción..."
              />
            </div>
          </div>
        </div>

        <CategoriesTable
          categories={categories}
          loading={loading}
          onRowClick={handleRowClick}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:flex-row">
          <p className="text-xs font-medium text-slate-500">
            Mostrando <span className="font-semibold text-slate-700">{categories.length}</span> categorías
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <CategoryAnalyticsDrawer
        open={Boolean(selectedCategory)}
        onClose={() => setSelectedCategory(null)}
        categoryId={selectedCategory?.id ?? null}
        categoryName={selectedCategory?.nombre ?? ""}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar categoría"
        message={
          deleteTarget
            ? `¿Estás seguro de eliminar "${deleteTarget.nombre}"?`
            : ""
        }
        confirmText="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <CreateCategoryModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCategoryCreated}
      />

      <EditCategoryModal
        category={categoryToEdit}
        onClose={() => setCategoryToEdit(null)}
        onUpdated={handleCategoryUpdated}
      />
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar tests de Categorías**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/categories/
```
Esperado: PASS (32/32 tests pasando).

- [ ] **Step 5: Commit de Task 2**

```bash
git add frontend/src/features/categories/components/CategoriesTable.tsx frontend/src/features/categories/pages/CategoriesPage.tsx
git commit -m "style(categories): modernizar CategoriesTable y CategoriesPage"
```

---

### Task 3: Modernizar `SuppliersTable` y `SuppliersPage`

**Files:**
- Modify: `frontend/src/features/suppliers/components/SuppliersTable.tsx`
- Modify: `frontend/src/features/suppliers/pages/SuppliersPage.tsx`
- Test: `frontend/src/__tests__/features/suppliers/SuppliersTable.test.tsx`
- Test: `frontend/src/__tests__/features/suppliers/SuppliersPage.test.tsx`

**Interfaces:**
- Consumes: `SuppliersTableProps` (`suppliers`, `loading`, `onRowClick`, `onEdit`, `onDelete`), `useSuppliersList`, `PageHeader`
- Produces: Tabla y contenedor de Proveedores con:
  - Cabecera con título "Directorio de Proveedores", subtítulo interactivo ("Haz clic en cualquier proveedor para ver su historial de compras y productos suministrados") y buscador en vivo (`SearchInput`).
  - Filtrado reactivo en `SuppliersPage` para buscar por nombre, teléfono o email.
  - Icono de proveedor/edificio (`Building2`) en chip suave `bg-blue-50 text-brand-blue` en la columna Nombre.
  - Formato limpio en teléfono y email con estilo mono o guión legible `"—"`.
  - Indicador de interactividad `Analítica →` con `ChevronRight` que reacciona en hover de fila.
  - Botones de acción con `aria-label="Editar proveedor"`, `aria-label="Eliminar proveedor"`, hovers suaves (`hover:bg-blue-50/80 hover:text-brand-blue`, `hover:bg-red-50/80 hover:text-danger`) y `e.stopPropagation()`.
  - Footer integrado con contador ("Mostrando X de Y proveedores") y `Pagination`.
  - Botones de acción de `PageHeader` con `shadow-xs`.

- [ ] **Step 1: Verificar tests de Proveedores**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/SuppliersTable.test.tsx src/__tests__/features/suppliers/SuppliersPage.test.tsx
```
Esperado: PASS (13 tests pasando).

- [ ] **Step 2: Actualizar `frontend/src/features/suppliers/components/SuppliersTable.tsx`**

```tsx
import { useMemo } from "react";
import { Pencil, Trash2, Building2, ChevronRight } from "lucide-react";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import type { Supplier } from "../types";

interface SuppliersTableProps {
  suppliers: Supplier[];
  loading: boolean;
  onRowClick?: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

export default function SuppliersTable({
  suppliers,
  loading,
  onRowClick,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  const columns: Column<Supplier>[] = useMemo(
    () => [
      {
        key: "nombre",
        header: "Nombre",
        render: (s: Supplier) => (
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{s.nombre}</p>
            </div>
          </div>
        ),
      },
      {
        key: "telefono",
        header: "Teléfono",
        render: (s: Supplier) => (
          <span className={s.telefono ? "text-xs font-medium text-slate-600" : "text-slate-400 font-mono"}>
            {s.telefono || "—"}
          </span>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (s: Supplier) => (
          <span className={s.email ? "text-xs font-medium text-slate-600" : "text-slate-400 font-mono"}>
            {s.email || "—"}
          </span>
        ),
      },
      {
        key: "detalle",
        header: "",
        className: "text-right w-24 hidden md:table-cell",
        render: () => (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-brand-blue">
            Analítica
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        ),
      },
      {
        key: "acciones",
        header: "Acciones",
        className: "text-right w-24",
        render: (s: Supplier) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Editar proveedor"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(s);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50/80 hover:text-brand-blue"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Eliminar proveedor"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/80 hover:text-danger"
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  return (
    <Table
      columns={columns}
      data={suppliers}
      keyExtractor={(s) => s.id}
      loading={loading}
      emptyMessage="No hay proveedores registrados"
      onRowClick={onRowClick}
      className="!rounded-none !border-0 !shadow-none"
    />
  );
}
```

- [ ] **Step 3: Actualizar `frontend/src/features/suppliers/pages/SuppliersPage.tsx`**

Integrar cabecera descriptiva, buscador de proveedores reactivo (`searchTerm`), contador en pie y `shadow-xs`:
```tsx
import { useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import type { Supplier } from "../types";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import SearchInput from "@/ui-components/SearchInput";
import { useToast } from "@/ui-components/Toast";
import SupplierMicroKPIs from "../components/SupplierMicroKPIs";
import SupplierAnalyticsDrawer from "../components/SupplierAnalyticsDrawer";
import SuppliersTable from "../components/SuppliersTable";
import { useSupplierAnalytics } from "../hooks/useSupplierAnalytics";
import { useSuppliersList } from "../hooks/useSuppliersList";
import { useDeleteSupplier } from "../hooks/useDeleteSupplier";
import { useExportSuppliers } from "../hooks/useExportSuppliers";
import SupplierFormModal from "@/features/shared/components/SupplierFormModal";

export default function SuppliersPage() {
  const { toast } = useToast();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: analytics, loading: analyticsLoading } = useSupplierAnalytics();
  const {
    suppliers,
    loading,
    error,
    page,
    totalPages,
    setPage,
    refetch,
    drawerOpen,
    selectedSupplierId,
    selectedSupplierName,
    openDrawer,
    closeDrawer,
  } = useSuppliersList();

  const {
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
    cancelDelete,
  } = useDeleteSupplier({
    onSuccess: refetch,
  });

  const { handleExportAll } = useExportSuppliers();

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const term = search.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.nombre.toLowerCase().includes(term) ||
        (s.telefono && s.telefono.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)),
    );
  }, [suppliers, search]);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setFormModalOpen(true);
  };

  const handleSupplierSaved = () => {
    toast(
      editingSupplierId ? "Proveedor actualizado" : "Proveedor creado",
      "success",
    );
    setFormModalOpen(false);
    setEditingSupplierId(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Administra los proveedores del sistema"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAll} className="shadow-xs">
              <Download className="size-4" />
              Descargar Excel
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setEditingSupplierId(null);
                setFormModalOpen(true);
              }}
              className="shadow-xs"
            >
              <Plus className="size-4" />
              Nuevo Proveedor
            </Button>
          </div>
        }
      />

      <SupplierMicroKPIs data={analytics} loading={analyticsLoading} />

      {error && (
        <ErrorBanner onRetry={refetch}>
          {error}
        </ErrorBanner>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Card Header matching Reports & Categories */}
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Directorio de Proveedores
              </h2>
              <p className="text-xs text-slate-500">
                Haz clic en cualquier proveedor para ver su historial de compras y productos suministrados
              </p>
            </div>
            <div className="w-full sm:w-72">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                placeholder="Buscar por nombre, teléfono o email..."
              />
            </div>
          </div>
        </div>

        <SuppliersTable
          suppliers={filteredSuppliers}
          loading={loading}
          onRowClick={openDrawer}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:flex-row">
          <p className="text-xs font-medium text-slate-500">
            Mostrando <span className="font-semibold text-slate-700">{filteredSuppliers.length}</span> proveedores
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <SupplierAnalyticsDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        supplierId={selectedSupplierId}
        supplierName={selectedSupplierName}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar proveedor"
        message={
          deleteTarget
            ? `¿Estás seguro de eliminar "${deleteTarget.nombre}"?`
            : ""
        }
        confirmText="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />

      <SupplierFormModal
        open={formModalOpen}
        supplierId={editingSupplierId}
        onClose={() => {
          setFormModalOpen(false);
          setEditingSupplierId(null);
        }}
        onSuccess={handleSupplierSaved}
      />
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar tests de Proveedores**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/suppliers/
```
Esperado: PASS (30/30 tests pasando).

- [ ] **Step 5: Commit de Task 3**

```bash
git add frontend/src/features/suppliers/components/SuppliersTable.tsx frontend/src/features/suppliers/pages/SuppliersPage.tsx
git commit -m "style(suppliers): modernizar SuppliersTable y SuppliersPage con buscador y analitica"
```

---

### Task 4: Verificación Integral de Categorías, Proveedores y Frontend

**Files:**
- Todos los modificados: `CategoryMicroKPIs.tsx`, `SupplierMicroKPIs.tsx`, `CategoriesTable.tsx`, `CategoriesPage.tsx`, `SuppliersTable.tsx`, `SuppliersPage.tsx`

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
Esperado: PASS (15 archivos de prueba, 89 tests pasando).

- [ ] **Step 3: Ejecutar la suite de productos para garantizar cero regresiones cruzadas**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/
```
Esperado: PASS (24 archivos de prueba, 175 tests pasando).
