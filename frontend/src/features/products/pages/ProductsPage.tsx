import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, SlidersHorizontal, FileText, Download, Star } from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut, CategoryOut, SupplierOut } from "@/types/api";
import type { Column } from "@/ui-components/Table";
import Pagination from "@/ui-components/Pagination";
type Product = ProductOut;
import Button from "@/ui-components/Button";
import Select from "@/ui-components/Select";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import Spinner from "@/ui-components/Spinner";
import EmptyState from "@/ui-components/EmptyState";
import SearchInput from "@/ui-components/SearchInput";
import { useToast } from "@/ui-components/Toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { exportToExcel } from "@/lib/exportToExcel";
import ProductCard from "../components/ProductCard";
import ProductTable from "../components/ProductTable";
import QuickEditModal from "../components/QuickEditModal";
import ProductFiltersDrawer from "../components/ProductFiltersDrawer";
import ViewToggle from "../components/ViewToggle";
import type { ProductFiltersState, ViewMode, SortField, SortOrder } from "../types";
import { FILTERS_DEFAULT } from "../types";

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

function filtersToParams(filters: ProductFiltersState, showFavoritesOnly: boolean): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (filters.search) params.search = filters.search;
  if (filters.categoria_ids.length > 0) params.categoria_ids = filters.categoria_ids;
  if (filters.proveedor_id) params.proveedor_id = filters.proveedor_id;
  if (filters.stockStatus !== "todos") params.stock_status = filters.stockStatus;
  if (filters.sortField !== "nombre" || filters.sortOrder !== "asc") {
    params.sort_by = filters.sortField;
    params.order = filters.sortOrder;
  }
  if (filters.precio_min !== "") params.precio_min = filters.precio_min;
  if (filters.precio_max !== "") params.precio_max = filters.precio_max;
  if (filters.tipo_iva) params.tipo_iva = filters.tipo_iva;
  if (showFavoritesOnly) params.es_favorito = true;
  return params;
}

function countActiveFilters(filters: ProductFiltersState): number {
  let count = 0;
  if (filters.categoria_ids.length > 0) count++;
  if (filters.proveedor_id !== null) count++;
  if (filters.stockStatus !== "todos") count++;
  if (filters.precio_min !== "") count++;
  if (filters.precio_max !== "") count++;
  if (filters.tipo_iva !== "") count++;
  if (filters.sortField !== "nombre" || filters.sortOrder !== "asc") count++;
  return count;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState<ProductFiltersState>(FILTERS_DEFAULT);
  const [draftFilters, setDraftFilters] = useState<ProductFiltersState>(FILTERS_DEFAULT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<ViewMode>(isOperator ? "table" : "grid");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevFiltersRef = useRef("");

  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const openCreate = () => {
    navigate("/products/new");
  };

  const openEdit = useCallback((p: Product) => {
    setQuickEditProduct(p);
  }, []);

  const closeQuickEdit = useCallback(() => {
    setQuickEditProduct(null);
  }, []);

  const exportColumns: Column<Product>[] = [
    { key: "id", header: "ID", exportValue: (p: Product) => p.id },
    { key: "codigo_barra", header: "Código de Barra" },
    { key: "nombre", header: "Nombre" },
    {
      key: "categorias",
      header: "Categorías",
      render: (p: Product) => p.categories.map((c) => c.nombre).join(", "),
    },
    { key: "unidades_por_caja", header: "Unidades/Caja", exportValue: (p: Product) => p.unidades_por_caja },
    { key: "stock_unidades", header: "Stock (uds)", exportValue: (p: Product) => p.stock_unidades },
    { key: "stock_minimo", header: "Stock Mínimo", exportValue: (p: Product) => p.stock_minimo },
    { key: "precio_costo_caja_usd", header: "Costo Caja USD", exportValue: (p: Product) => Number(p.precio_costo_caja_usd) },
    { key: "precio_costo_usd", header: "Costo Unidad USD", exportValue: (p: Product) => Number(p.precio_costo_usd) },
    { key: "precio_unidad_usd", header: "Precio Unidad USD", exportValue: (p: Product) => Number(p.precio_unidad_usd) },
    { key: "precio_caja_usd", header: "Precio Caja USD", exportValue: (p: Product) => Number(p.precio_caja_usd) },
    {
      key: "proveedor_id",
      header: "Proveedor",
      render: (p: Product) => suppliers.find((s) => s.id === p.proveedor_id)?.nombre || "—",
    },
    { key: "tipo_iva", header: "Tipo IVA" },
  ];

  const handleExportAll = async () => {
    try {
      const result = await api.getProducts({ page_size: 999999 });
      const name = exportToExcel({ data: result.items, columns: exportColumns, filename: "Productos" });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar productos", "error");
    }
  };

  const handleSortChange = (raw: string) => {
    const [sortField, sortOrder] = raw.split("_") as [SortField, SortOrder];
    setFilters((prev) => ({ ...prev, sortField, sortOrder }));
  };

  const sortValue = `${filters.sortField}_${filters.sortOrder}`;

  const handleTableSort = useCallback((field: SortField) => {
    setFilters((prev) => {
      if (prev.sortField === field) {
        const nextOrder = prev.sortOrder === "asc" ? "desc" : "asc";
        return { ...prev, sortOrder: nextOrder };
      }
      return { ...prev, sortField: field, sortOrder: "asc" };
    });
  }, []);

  const fetchProducts = useCallback(async (params?: Record<string, unknown>) => {
    const mergedParams = { ...params, page: Number(params?.page || 1), page_size: Number(params?.page_size || PAGE_SIZE) };

    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts(
        mergedParams as Parameters<typeof api.getProducts>[0],
      );
      setProducts(data.items);
      setTotalPages(data.pages);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFilters = useCallback(async () => {
    try {
      const [cats, sups] = await Promise.all([
        api.getCategories(),
        api.getSuppliers(),
      ]);
      setCategories(cats);
      setSuppliers(sups);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadFilters();
    fetchProducts({ page: 1, page_size: PAGE_SIZE });
  }, [fetchProducts, loadFilters]);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    const current = `${filtersKey}|${showFavoritesOnly}`;
    if (prevFiltersRef.current === current) return;
    prevFiltersRef.current = current;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchProducts({ ...filtersToParams(filters, showFavoritesOnly), page: 1, page_size: PAGE_SIZE });
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, showFavoritesOnly]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProducts({ ...filtersToParams(filters, showFavoritesOnly), page: newPage, page_size: PAGE_SIZE });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast(`Producto "${deleteTarget.nombre}" eliminado`, "success");
      setDeleteTarget(null);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar producto",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async (product: Product) => {
    try {
      const updated = await api.toggleProductFavorite(product.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, es_favorito: updated.es_favorito } : p))
      );
      toast(
        updated.es_favorito ? `"${product.nombre}" agregado a favoritos` : `"${product.nombre}" removido de favoritos`,
        "success"
      );
    } catch {
      toast("Error al actualizar favorito", "error");
    }
  };

  const activeFilterCount = countActiveFilters(filters);

  const openDrawer = () => {
    setDraftFilters({ ...filters });
    setDrawerOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setDrawerOpen(false);
  };

  const clearFilters = () => {
    const cleared = FILTERS_DEFAULT;
    setDraftFilters(cleared);
    setFilters(cleared);
    setDrawerOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={isOperator ? "Inventario" : "Productos"}
        description={isOperator ? "Consulta el catálogo de productos" : "Administra el catálogo de productos"}
        actions={
          !isOperator ? (
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="w-4 h-4" />
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Search + Filters row */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <SearchInput
              ref={searchRef}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onClear={() => setFilters((prev) => ({ ...prev, search: "" }))}
              placeholder="Buscar nombre o código... (Ctrl+K)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`p-2 rounded-lg transition-colors ${
              showFavoritesOnly
                ? "bg-yellow-100 text-yellow-600"
                : "text-slate-400 hover:text-yellow-500 hover:bg-yellow-50"
            }`}
            title={showFavoritesOnly ? "Mostrar todos los productos" : "Mostrar solo favoritos"}
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? "fill-yellow-400" : ""}`} />
          </button>
          {!isOperator && (
            <div className="hidden md:block w-56 lg:w-72">
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
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 text-[11px] font-bold text-white bg-brand-blue rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isOperator && <ViewToggle view={view} onChange={setView} />}
          <Button variant="accent" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Nuevo</span>
          </Button>
          <Button variant="outline" onClick={() => navigate("/invoices/new")}>
            <FileText className="w-4 h-4" />
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
          description={activeFilterCount > 0 ? "Intenta con otros filtros" : "Registra tu primer producto"}
          actionLabel={activeFilterCount === 0 ? "Nuevo Producto" : undefined}
          onAction={activeFilterCount === 0 ? openCreate : undefined}
        />
      ) : isOperator || view === "table" ? (
        <>
          <ProductTable
            products={products}
            loading={loading}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
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
        onDraftChange={setDraftFilters}
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
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
