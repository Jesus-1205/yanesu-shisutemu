import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, SlidersHorizontal, FileText, Download, Star, Boxes, Tags, ChevronDown } from "lucide-react";
import type { ProductOut as Product } from "@/types/api";
import Pagination from "@/ui-components/Pagination";
import Button from "@/ui-components/Button";
import Select from "@/ui-components/Select";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import Spinner from "@/ui-components/Spinner";
import EmptyState from "@/ui-components/EmptyState";
import SearchInput from "@/ui-components/SearchInput";
import { useAuth } from "@/features/auth/context/AuthContext";
import ProductCard from "../components/ProductCard";
import ProductTable from "../components/ProductTable";
import QuickEditModal from "../components/QuickEditModal";
import ProductFiltersDrawer from "../components/ProductFiltersDrawer";
import ViewToggle from "../components/ViewToggle";
import type { ViewMode } from "../types";
import { useProductsCatalog, filtersToParams } from "../hooks/useProductsCatalog";

const PAGE_SIZE = 20;

const sortOptions = [
  { value: "nombre_asc", label: "Nombre (A-Z)" },
  { value: "nombre_desc", label: "Nombre (Z-A)" },
  { value: "stock_asc", label: "Stock (Menor-Mayor)" },
  { value: "stock_desc", label: "Stock (Mayor-Menor)" },
  { value: "precio_asc", label: "Precio (Menor-Mayor)" },
  { value: "precio_desc", label: "Precio (Mayor-Menor)" },
];

const sortOptionsAdmin = [
  ...sortOptions,
  { value: "margen_asc", label: "Margen (Menor-Mayor)" },
  { value: "margen_desc", label: "Margen (Mayor-Menor)" },
];

export default function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";

  const {
    products,
    categories,
    suppliers,
    loading,
    error,
    deleteTarget,
    requestDelete,
    cancelDelete,
    deleting,
    filters,
    draftFilters,
    showFavoritesOnly,
    setSearch,
    clearSearch,
    toggleFavoritesOnly,
    syncDraftWithFilters,
    updateDraftFilters,
    applyDraftFilters,
    resetFilters,
    page,
    totalPages,
    searchRef,
    activeFiltersCount,
    handleExportAll,
    handleSortChange,
    handleTableSort,
    handlePageChange,
    handleToggleFavorite,
    handleDelete,
    fetchProducts,
  } = useProductsCatalog();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<ViewMode>(isOperator ? "table" : "grid");
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const catalogMenuRef = useRef<HTMLDivElement>(null);

  const toggleCatalogMenu = () => {
    if (!catalogMenuOpen && catalogMenuRef.current) {
      const rect = catalogMenuRef.current.getBoundingClientRect();
      const menuWidth = 224;
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 16);
      setMenuPosition({
        top: rect.bottom + 6,
        left: Math.max(8, left),
      });
    }
    setCatalogMenuOpen((prev) => !prev);
  };

  const openCreate = () => navigate("/products/new");
  const openEdit = useCallback((p: Product) => setQuickEditProduct(p), []);
  const closeQuickEdit = useCallback(() => setQuickEditProduct(null), []);

  const openDrawer = () => {
    syncDraftWithFilters();
    setDrawerOpen(true);
  };

  const applyFilters = () => {
    applyDraftFilters();
    setDrawerOpen(false);
  };

  const clearFilters = () => {
    resetFilters();
    setDrawerOpen(false);
  };

  const sortValue = `${filters.sortField}_${filters.sortOrder}`;

  return (
    <div>
      <PageHeader
        title={isOperator ? "Inventario" : "Productos"}
        description={isOperator ? "Consulta el catálogo de productos" : "Administra el catálogo de productos"}
        actions={
          !isOperator ? (
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="size-4" />
              Descargar Excel
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={() => fetchProducts({ ...filtersToParams(filters, showFavoritesOnly), page, page_size: PAGE_SIZE })}>
            {error}
          </ErrorBanner>
        </div>
      )}

      {/* Toolbar - responsive */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search + Filters row */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs md:max-w-md">
            <SearchInput
              ref={searchRef}
              value={filters.search}
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
            onClick={toggleFavoritesOnly}
            className={`shrink-0 rounded-lg p-2 transition-colors ${
              showFavoritesOnly
                ? "bg-yellow-100 text-yellow-600"
                : "text-slate-400 hover:bg-yellow-50 hover:text-yellow-500"
            }`}
            title={showFavoritesOnly ? "Mostrar todos los productos" : "Mostrar solo favoritos"}
          >
            <Star className={`size-4 ${showFavoritesOnly ? "fill-yellow-400" : ""}`} />
          </button>
          {!isOperator && (
            <div className="hidden w-44 md:block lg:w-48">
              <Select
                value={sortValue}
                onChange={(e) => handleSortChange(e.target.value)}
                options={sortOptionsAdmin}
                className="text-xs"
              />
            </div>
          )}
          <div className="relative shrink-0">
            <Button variant="outline" onClick={openDrawer}>
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-3">
          {!isOperator && <ViewToggle view={view} onChange={setView} />}
          {!isOperator && (
            <div className="relative" ref={catalogMenuRef}>
              <Button
                variant="outline"
                onClick={toggleCatalogMenu}
                title="Gestión de Catálogo"
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
                    onClick={() => setCatalogMenuOpen(false)}
                  />
                  <div
                    style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                    className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-surface p-1.5 shadow-xl"
                  >
                    <button
                      onClick={() => {
                        setCatalogMenuOpen(false);
                        navigate("/combos");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Boxes className="size-4 text-brand-blue" />
                      <div>
                        <p className="font-semibold text-text-main">Combos</p>
                        <p className="text-xs text-slate-400">Gestionar paquetes</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setCatalogMenuOpen(false);
                        navigate("/price-rules");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Tags className="size-4 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-text-main">Reglas de Precio</p>
                        <p className="text-xs text-slate-400">Precios en divisas</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <Button variant="accent" onClick={openCreate}>
            <Plus className="size-4" />
            <span>Nuevo</span>
          </Button>
          <Button variant="outline" onClick={() => navigate("/invoices/new")}>
            <FileText className="size-4" />
            <span className="hidden lg:inline">Agregar Factura</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No hay productos"
          description={activeFiltersCount > 0 ? "Intenta con otros filtros" : "Registra tu primer producto"}
          actionLabel={activeFiltersCount === 0 ? "Nuevo Producto" : undefined}
          onAction={activeFiltersCount === 0 ? openCreate : undefined}
        />
      ) : isOperator || view === "table" ? (
        <>
          <ProductTable
            products={products}
            loading={loading}
            onEdit={openEdit}
            onDelete={requestDelete}
            onToggleFavorite={handleToggleFavorite}
            sortField={filters.sortField}
            sortOrder={filters.sortOrder}
            onSortColumn={handleTableSort}
            role={isOperator ? "operator" : "admin"}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-6"
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={openEdit}
                onDelete={requestDelete}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-6"
          />
        </>
      )}

      <QuickEditModal
        open={quickEditProduct !== null}
        onClose={closeQuickEdit}
        onSaved={() => fetchProducts(filtersToParams(filters, showFavoritesOnly))}
        product={quickEditProduct}
        role={isOperator ? "operator" : "admin"}
      />

      <ProductFiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        draft={draftFilters}
        onDraftChange={updateDraftFilters}
        onApply={applyFilters}
        onClear={clearFilters}
        categories={categories}
        suppliers={suppliers}
        isOperator={isOperator}
      />

      {!isOperator && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Eliminar producto"
          message={
            deleteTarget
              ? `¿Estás seguro de eliminar "${deleteTarget.nombre}"?`
              : ""
          }
          confirmText="Eliminar"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={cancelDelete}
        />
      )}
    </div>
  );
}
