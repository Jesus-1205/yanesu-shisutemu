import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { ProductOut as Product, CategoryOut, SupplierOut } from "@/types/api";
import type { Column } from "@/ui-components/Table";
import { useToast } from "@/ui-components/Toast";
import { exportToExcel } from "@/lib/exportToExcel";
import type { ProductFiltersState, SortField, SortOrder } from "../types";
import { FILTERS_DEFAULT } from "../types";

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 200;

export function filtersToParams(filters: ProductFiltersState, showFavoritesOnly: boolean): Record<string, unknown> {
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

export function countActiveFilters(filters: ProductFiltersState): number {
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

export function useProductsCatalog() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState<ProductFiltersState>(FILTERS_DEFAULT);
  const [draftFilters, setDraftFilters] = useState<ProductFiltersState>(FILTERS_DEFAULT);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const stockParam = searchParams.get("stock");
    if (stockParam && ["disponible", "bajo", "agotado"].includes(stockParam)) {
      setFilters((prev) => ({ ...prev, stockStatus: stockParam as ProductFiltersState["stockStatus"] }));
      setDraftFilters((prev) => ({ ...prev, stockStatus: stockParam as ProductFiltersState["stockStatus"] }));
    }
  }, [searchParams]);

  const exportColumns: Column<Product>[] = useMemo(() => [
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
  ], [suppliers]);

  const handleExportAll = useCallback(async () => {
    try {
      const allProducts: Product[] = [];
      let currentPage = 1;
      let pages = 1;
      do {
        const result = await api.getProducts({ page: currentPage, page_size: EXPORT_PAGE_SIZE });
        allProducts.push(...result.items);
        pages = result.pages;
        currentPage += 1;
      } while (currentPage <= pages);
      const name = exportToExcel({ data: allProducts, columns: exportColumns, filename: "Productos" });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar productos", "error");
    }
  }, [exportColumns, toast]);

  const handleSortChange = useCallback((raw: string) => {
    const [sortField, sortOrder] = raw.split("_") as [SortField, SortOrder];
    setFilters((prev) => ({ ...prev, sortField, sortOrder }));
  }, []);

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
      const data = await api.getProducts(mergedParams);
      setProducts(data.items);
      setTotalPages(data.pages);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    fetchProducts({ ...filtersToParams(filters, showFavoritesOnly), page: newPage, page_size: PAGE_SIZE });
  }, [filters, showFavoritesOnly, fetchProducts]);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getSuppliers()])
      .then(([cats, sups]) => {
        setCategories(cats);
        setSuppliers(sups);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts({ ...filtersToParams(filters, showFavoritesOnly), page: 1, page_size: PAGE_SIZE });
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, showFavoritesOnly]);

  const handleToggleFavorite = useCallback(async (product: Product) => {
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
  }, [toast]);

  const handleDelete = useCallback(async () => {
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
  }, [deleteTarget, toast]);

  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  return {
    products,
    categories,
    suppliers,
    loading,
    error,
    deleteTarget,
    setDeleteTarget,
    deleting,
    filters,
    setFilters,
    draftFilters,
    setDraftFilters,
    showFavoritesOnly,
    setShowFavoritesOnly,
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
  };
}
