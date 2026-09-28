import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut as Product, CategoryOut, SupplierOut } from "@/types/api";
import {
  useProductFilters,
  filtersToParams,
  countActiveFilters,
} from "./useProductFilters";
import { useProductExport } from "./useProductExport";
import { useCatalogMutations } from "./useCatalogMutations";

export { filtersToParams, countActiveFilters };

const PAGE_SIZE = 20;

export function useProductsCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const filterHook = useProductFilters();
  const exportHook = useProductExport(suppliers);
  const mutationHook = useCatalogMutations(setProducts);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchProducts = useCallback(
    async (params?: Record<string, unknown>) => {
      const mergedParams = {
        ...params,
        page: Number(params?.page || 1),
        page_size: Number(params?.page_size || PAGE_SIZE),
      };

      setLoading(true);
      setError(null);
      try {
        const data = await api.getProducts(mergedParams);
        setProducts(data.items);
        setTotalPages(data.pages);
        filterHook.setPage(data.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar productos");
      } finally {
        setLoading(false);
      }
    },
    [filterHook],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      filterHook.setPage(newPage);
      fetchProducts({
        ...filtersToParams(filterHook.filters, filterHook.showFavoritesOnly),
        page: newPage,
        page_size: PAGE_SIZE,
      });
    },
    [filterHook, fetchProducts],
  );

  useEffect(() => {
    Promise.all([api.getCategories(), api.getSuppliers()])
      .then(([cats, sups]) => {
        setCategories(cats);
        setSuppliers(sups);
      })
      .catch(() => {});
  }, []);

  const filtersKey = JSON.stringify(filterHook.filters);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts({
        ...filtersToParams(filterHook.filters, filterHook.showFavoritesOnly),
        page: 1,
        page_size: PAGE_SIZE,
      });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filtersKey, filterHook.showFavoritesOnly]);

  return {
    products,
    categories,
    suppliers,
    loading,
    error,
    deleteTarget: mutationHook.deleteTarget,
    requestDelete: mutationHook.requestDelete,
    cancelDelete: mutationHook.cancelDelete,
    deleting: mutationHook.deleting,
    filters: filterHook.filters,
    draftFilters: filterHook.draftFilters,
    showFavoritesOnly: filterHook.showFavoritesOnly,
    setSearch: filterHook.setSearch,
    clearSearch: filterHook.clearSearch,
    toggleFavoritesOnly: filterHook.toggleFavoritesOnly,
    syncDraftWithFilters: filterHook.syncDraftWithFilters,
    updateDraftFilters: filterHook.updateDraftFilters,
    applyDraftFilters: filterHook.applyDraftFilters,
    resetFilters: filterHook.resetFilters,
    page: filterHook.page,
    totalPages,
    searchRef: filterHook.searchRef,
    activeFiltersCount: filterHook.activeFiltersCount,
    handleExportAll: exportHook.handleExportAll,
    handleSortChange: filterHook.handleSortChange,
    handleTableSort: filterHook.handleTableSort,
    handlePageChange,
    handleToggleFavorite: mutationHook.handleToggleFavorite,
    handleDelete: mutationHook.handleDelete,
    fetchProducts,
  };
}

export type UseProductsCatalogReturn = ReturnType<typeof useProductsCatalog>;
