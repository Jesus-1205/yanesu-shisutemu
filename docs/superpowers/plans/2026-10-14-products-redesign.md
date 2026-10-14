# Rediseño Estético del Módulo de Productos (Products Redesign)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar la presentación visual del catálogo de productos (`ProductsPage`, `ProductsToolbar`, `ViewToggle`, `ProductCard` y `ProductTable`) para alinearlo con el nuevo lenguaje estético introducido en el módulo de Reportes (controles segmentados en pastilla, jerarquía tipográfica limpia, acciones sutiles y sombras suaves), sin modificar absolutamente nada de lógica de negocio ni romper tests existentes.

**Architecture:**
- **Aesthetic Alignment:** Trasladar los patrones de diseño de Reportes (bordes `border-slate-200/90`, sombras `shadow-xs` / `shadow-sm`, controles segmentados `bg-slate-100 p-0.5 rounded-lg`, chips de color pastel y pesos tipográficos definidos) al dominio de productos.
- **Single Responsibility Principle (SRP):** Mantener cada componente desacoplado en su responsabilidad exclusiva de UI sin tocar stores (`useProductsStore`), hooks (`useProductsCatalog`) ni contratos de props.
- **Opción A de Cards:** Mantener los 3 botones de acción (`Star`, `Pencil`, `Trash2`) en la cabecera de `ProductCard`, pero con tonalidad neutral tenue (`text-slate-400`) y fondos de hover suaves (`hover:bg-blue-50/80`, `hover:bg-red-50/80`) para eliminar el ruido visual sin añadir clics extra.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Lucide React, Vitest, React Testing Library.

---

## Global Constraints

- **Cero cambios de lógica**: Prohibido alterar estados de Zustand, handlers de eventos, llamadas a API o flujos de datos.
- **Prohibido el uso de `any`** en cualquier archivo (regla de `.opencode/rules/frontend_rules.md`).
- **Compatibilidad con pruebas existentes**: Todos los 175 tests existentes de `src/__tests__/features/products/` deben seguir pasando sin cambios en assertions de lógica.
- **Node & fnm en Windows**: Ejecutar comandos de Node anteponiendo:
  `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;`
- **TDD / Verificación paso a paso**: Ejecutar tests relevantes antes y después de cada modificación.
- **No git push** a menos que sea explícitamente ordenado.

---

## Task Breakdown

### Task 1: Modernizar `ViewToggle` (Control Segmentado en Pastilla)

**Files:**
- Modify: `frontend/src/features/products/components/ViewToggle.tsx`
- Test: `frontend/src/__tests__/features/products/ViewToggle.test.tsx`

**Interfaces:**
- Consumes: `ViewMode` ("grid" | "table") de `../types`, `onChange: (view: ViewMode) => void`
- Produces: Componente `ViewToggle` renderizando botones accesibles con `aria-label="Vista cuadrícula"` y `aria-label="Vista tabla"`. Mantiene la clase `bg-brand-blue` en el botón activo para preservar compatibilidad con los tests.

- [ ] **Step 1: Verificar el test actual de `ViewToggle`**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ViewToggle.test.tsx
```
Esperado: PASS (5 tests pasando).

- [ ] **Step 2: Aplicar el nuevo estilo en `frontend/src/features/products/components/ViewToggle.tsx`**

Reemplazar la estructura con el diseño de contenedor en pastilla idéntico a Reportes (`bg-slate-100 border border-slate-200 p-0.5 rounded-lg`):

```tsx
import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "../types";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all ${
          view === "grid"
            ? "bg-brand-blue text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="Vista cuadrícula"
        title="Vista cuadrícula"
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all ${
          view === "table"
            ? "bg-brand-blue text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="Vista tabla"
        title="Vista tabla"
      >
        <List className="size-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Ejecutar el test para comprobar que sigue pasando**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ViewToggle.test.tsx
```
Esperado: PASS (5 tests pasando).

---

### Task 2: Modernizar `ProductsToolbar` (Espaciado, Ancho del Select y Botón Favoritos)

**Files:**
- Modify: `frontend/src/features/products/components/ProductsToolbar.tsx`
- Test: `frontend/src/__tests__/features/products/ProductsToolbar.test.tsx`

**Interfaces:**
- Consumes: `useProductsStore` (filtros, drawer, search, sort, view, catalog menu), `ProductsToolbarProps` (`isOperator`, `searchRef`, `onOpenCreate`)
- Produces: Barra de herramientas estilizada con ancho suficiente para que las opciones de orden no se trunquen (`"N... ▼"` solucionado), botón de favoritos integrado con borde limpio, y separación en dos grupos visuales claros (Búsqueda/Filtros vs Vistas/Acciones).

- [ ] **Step 1: Verificar el test actual de `ProductsToolbar`**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ProductsToolbar.test.tsx
```
Esperado: PASS (3 tests pasando).

- [ ] **Step 2: Actualizar `frontend/src/features/products/components/ProductsToolbar.tsx`**

Ajustar el layout y clases visuales del contenedor:
- Contenedor del selector de orden: cambiar de `w-44 md:block lg:w-48` a `min-w-[190px] w-48 sm:w-52` para evitar que el texto se corte.
- Botón de favoritos: dotarlo de borde `border border-slate-200 bg-surface shadow-xs hover:border-slate-300`, y cuando esté activo `bg-yellow-50 border-yellow-200 text-yellow-600`.
- Botón de Filtros: mantener `variant="outline"` con `shadow-xs`.
- Contenedor de acciones secundarias: organizar `ViewToggle`, `Catálogo`, `+ Nuevo` y `Agregar Factura` con espaciado consistente `gap-2 sm:gap-2.5`.

Código a aplicar en el `return` de `ProductsToolbar.tsx`:

```tsx
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Search + Filters row */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs md:max-w-sm">
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={clearSearch}
            placeholder="Buscar nombre o código... (Ctrl+K)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={toggleFavoritesOnly}
          className={`shrink-0 cursor-pointer rounded-lg border p-2 shadow-xs transition-colors ${
            showFavoritesOnly
              ? "border-yellow-200 bg-yellow-50 text-yellow-600"
              : "border-slate-200 bg-surface text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-yellow-500"
          }`}
          title={
            showFavoritesOnly
              ? "Mostrar todos los productos"
              : "Mostrar solo favoritos"
          }
        >
          <Star
            className={`size-4 ${showFavoritesOnly ? "fill-yellow-400" : ""}`}
          />
        </button>

        {!isOperator && (
          <div className="hidden min-w-[190px] w-48 sm:w-52 md:block">
            <Select
              value={sortValue}
              onChange={(e) => handleSortChange(e.target.value)}
              options={sortOptionsAdmin}
              className="text-xs shadow-xs"
            />
          </div>
        )}
        <div className="relative shrink-0">
          <Button variant="outline" onClick={openDrawer} className="shadow-xs">
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white shadow-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-2.5">
        {!isOperator && <ViewToggle view={view} onChange={setView} />}
        {!isOperator && (
          <div className="relative" ref={internalCatalogRef}>
            <Button
              variant="outline"
              onClick={handleCatalogButtonClick}
              title="Gestión de Catálogo"
              className="shadow-xs"
            >
              <Boxes className="size-4 text-brand-blue" />
              <span className="hidden xl:inline">Catálogo</span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${
                  catalogMenuOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
            {catalogMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={closeCatalogMenu}
                />
                <div
                  style={{
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                  }}
                  className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-surface p-1.5 shadow-xl"
                >
                  <button
                    onClick={() => {
                      closeCatalogMenu();
                      navigate("/combos");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Boxes className="size-4 text-brand-blue" />
                    <div>
                      <p className="font-semibold text-text-main">Combos</p>
                      <p className="text-xs text-slate-400">
                        Gestionar paquetes
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      closeCatalogMenu();
                      navigate("/price-rules");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Tags className="size-4 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-text-main">
                        Reglas de Precio
                      </p>
                      <p className="text-xs text-slate-400">
                        Precios en divisas
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <Button variant="accent" onClick={handleCreate} className="shadow-xs">
          <Plus className="size-4" />
          <span>Nuevo</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/invoices/new")}
          className="shadow-xs"
        >
          <FileText className="size-4" />
          <span className="hidden lg:inline">Agregar Factura</span>
        </Button>
      </div>
    </div>
  );
```

- [ ] **Step 3: Ejecutar el test para comprobar que sigue pasando**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ProductsToolbar.test.tsx
```
Esperado: PASS (3 tests pasando).

---

### Task 3: Modernizar `ProductCard` (Jerarquía, Opción A de Acciones y Estética de Reportes)

**Files:**
- Modify: `frontend/src/features/products/components/ProductCard.tsx`
- Test: `frontend/src/__tests__/features/products/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `Product` de `@/types/api`, `useExchangeRateStore`, `calcMargin` de `../types`
- Produces: Tarjeta de producto estilizada con:
  - Contenedor con `border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all rounded-xl`.
  - Iconos de acción limpios: favoritos tenue/dorado, editar (`text-slate-400 hover:text-brand-blue hover:bg-blue-50/80`), eliminar (`text-slate-400 hover:text-danger hover:bg-red-50/80`).
  - Chips de categoría y unidades por caja sin duplicar el icono de caja de manera tosca.
  - Chip de margen de ganancia estilizado como el badge de rentabilidad de Reportes.
  - Indicador de stock con `Badge variant={stockVariant}` preservando exacto el texto `{totalStock} uds` para compatibilidad de tests.
  - Precio principal en USD destacado con jerarquía fuerte (`text-lg font-bold text-slate-900 tracking-tight`) y precio en Bs secundario suave (`text-xs font-medium text-slate-500`).

- [ ] **Step 1: Verificar el test actual de `ProductCard`**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ProductCard.test.tsx
```
Esperado: PASS (11 tests pasando).

- [ ] **Step 2: Actualizar `frontend/src/features/products/components/ProductCard.tsx`**

Implementar el rediseño estético manteniendo todas las props y datos requeridos por los tests:

```tsx
import { Pencil, Trash2, Box, Package, Star } from "lucide-react";
import type { Product } from "@/types/api";
import Badge from "@/ui-components/Badge";
import { formatCurrency } from "@/lib/utils";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { calcMargin } from "../types";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
}

export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ProductCardProps) {
  const tasa = useExchangeRateStore((s) => s.tasa);
  const margin = calcMargin(
    Number(product.precio_costo_usd),
    Number(product.precio_unidad_usd),
  );

  const totalStock =
    product.stock_cajas * product.unidades_por_caja + product.stock_unidades;
  const isLowStock = totalStock > 0 && totalStock <= product.stock_minimo;
  const isOutOfStock = totalStock === 0;

  const stockVariant = isOutOfStock
    ? "danger"
    : isLowStock
      ? "warning"
      : "success";

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-surface p-4 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Top section: Title, barcode and clean action buttons */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold tracking-tight text-slate-900">
              {product.nombre}
            </h3>
            {product.codigo_barra && (
              <p className="mt-0.5 font-mono text-xs text-slate-400">
                {product.codigo_barra}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onToggleFavorite?.(product)}
              className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-yellow-50/80"
              title={
                product.es_favorito
                  ? "Quitar de favoritos"
                  : "Agregar a favoritos"
              }
            >
              <Star
                className={`size-4 transition-colors ${
                  product.es_favorito
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-300 hover:text-yellow-400"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50/80 hover:text-brand-blue"
              aria-label="Editar"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(product)}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/80 hover:text-danger"
              aria-label="Eliminar"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {/* Categories chips */}
        {product.categories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {product.categories.map((c) => (
              <Badge key={c.id} variant="info" className="text-[11px] py-0.5">
                {c.nombre}
              </Badge>
            ))}
          </div>
        )}

        {/* Package & Margin info */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <Package className="size-3.5 text-slate-400" />
            {product.unidades_por_caja} uds/caja
          </span>
          <span
            className="flex items-center font-medium"
            data-margin={margin.color}
          >
            <Badge variant={margin.color} className="text-[11px] py-0.5 font-semibold">
              {margin.label}
            </Badge>
          </span>
        </div>
      </div>

      {/* Bottom section: Stock status and refined Price hierarchy */}
      <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5">
          <Box className="size-3.5 text-slate-400" />
          <Badge variant={stockVariant} className="text-xs font-semibold">
            {totalStock} uds
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {formatCurrency(product.precio_unidad_usd)}
          </p>
          {tasa > 0 && (
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {formatCurrency(product.precio_unidad_usd * tasa, "Bs ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Ejecutar el test para comprobar que sigue pasando**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ProductCard.test.tsx
```
Esperado: PASS (11 tests pasando).

---

### Task 4: Ajustar Detalles Visuales en `ProductTable` y `ProductsPage`

**Files:**
- Modify: `frontend/src/features/products/components/ProductTable.tsx`
- Modify: `frontend/src/features/products/pages/ProductsPage.tsx`
- Test: `frontend/src/__tests__/features/products/ProductTable.test.tsx`
- Test: `frontend/src/__tests__/features/products/ProductsPage.test.tsx`

**Interfaces:**
- Consumes: `ProductTableProps` y `ProductsPage`
- Produces:
  - En `ProductTable`: precio en USD con `font-bold text-slate-900`, precio en Bs con `text-xs font-medium text-slate-500` para consistencia, botones de acción con hover suave `hover:bg-blue-50/80` y `hover:bg-red-50/80`.
  - En `ProductsPage`: botón "Descargar Excel" del header con sombra sutil `shadow-xs` y contenedor principal armónico.

- [ ] **Step 1: Verificar tests previos**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ProductTable.test.tsx src/__tests__/features/products/ProductsPage.test.tsx
```
Esperado: PASS.

- [ ] **Step 2: Retocar `frontend/src/features/products/components/ProductTable.tsx`**

Ajustar en `ProductTable.tsx`:
- Columna `precio`: `<span className="font-bold text-slate-900">{formatCurrency(p.precio_unidad_usd)}</span>`
- Columna `precio_ves`: `<span className="text-xs font-medium text-slate-600">{tasa > 0 ? formatCurrency(p.precio_unidad_usd * tasa, "Bs ") : "—"}</span>`
- Columna `acciones`: botones con `rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50/80 hover:text-brand-blue` y `hover:bg-red-50/80 hover:text-danger`.
- Botón favorito de tabla: `rounded-lg p-1.5 transition-colors hover:bg-yellow-50/80`.

- [ ] **Step 3: Retocar botón en `frontend/src/features/products/pages/ProductsPage.tsx`**

Asegurar que el botón de exportar del `PageHeader` incluya `className="shadow-xs"`:
```tsx
      <PageHeader
        title={isOperator ? "Inventario" : "Productos"}
        description={
          isOperator
            ? "Consulta el catálogo de productos"
            : "Administra el catálogo de productos"
        }
        actions={
          !isOperator ? (
            <Button variant="outline" onClick={catalog.handleExportAll} className="shadow-xs">
              <Download className="size-4" />
              Descargar Excel
            </Button>
          ) : undefined
        }
      />
```

- [ ] **Step 4: Ejecutar tests de tabla y página**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/ProductTable.test.tsx src/__tests__/features/products/ProductsPage.test.tsx
```
Esperado: PASS.

---

### Task 5: Verificación Integral del Módulo de Productos

**Files:**
- Todos los modificados: `ViewToggle.tsx`, `ProductsToolbar.tsx`, `ProductCard.tsx`, `ProductTable.tsx`, `ProductsPage.tsx`

- [ ] **Step 1: Ejecutar verificación de tipos TypeScript**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm tsc --noEmit
```
Esperado: Salida limpia con 0 errores de tipado.

- [ ] **Step 2: Ejecutar la suite completa de tests de productos**

Ejecutar:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm vitest run src/__tests__/features/products/
```
Esperado: PASS (24 archivos de prueba, 175 tests pasando).

---

## Self-Review Checklist

1. **Spec & Goals Coverage**:
   - Rediseño de control segmentado tipo pastilla (`ViewToggle`) implementado en Task 1.
   - Solución del select truncado `"N... ▼"`, estilizado de botón favoritos y agrupación de toolbar implementado en Task 2.
   - Opción A para `ProductCard` (acciones sutiles en cabecera, jerarquía de precios con USD destacado, chips limpios y bordes/sombras suaves) implementado en Task 3.
   - Consistencia en `ProductTable` y `ProductsPage` implementado en Task 4.
   - Verificación estricta de TypeScript y vitest en Task 5.
2. **Zero Placeholder scan**: Sin "TODO", sin "TBD", código TypeScript completo en cada tarea.
3. **SRP & Logic integrity**: Cero cambios en store de Zustand, reducers, llamadas axios o props de negocio.
