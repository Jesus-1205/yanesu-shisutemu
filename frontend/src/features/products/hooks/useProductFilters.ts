import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useProductsStore,
  filtersToParams,
  countActiveFilters,
} from "../stores/useProductsStore";
import type { ProductFiltersState } from "../types";

export { filtersToParams, countActiveFilters };

export function useProductFilters() {
  const [searchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const filters = useProductsStore((s) => s.filters);
  const draftFilters = useProductsStore((s) => s.draftFilters);
  const showFavoritesOnly = useProductsStore((s) => s.showFavoritesOnly);
  const page = useProductsStore((s) => s.page);

  const setSearch = useProductsStore((s) => s.setSearch);
  const clearSearch = useProductsStore((s) => s.clearSearch);
  const toggleFavoritesOnly = useProductsStore((s) => s.toggleFavoritesOnly);
  const syncDraftWithFilters = useProductsStore((s) => s.syncDraftWithFilters);
  const updateDraftFilters = useProductsStore((s) => s.updateDraftFilters);
  const applyDraftFilters = useProductsStore((s) => s.applyDraftFilters);
  const resetFilters = useProductsStore((s) => s.resetFilters);
  const handleSortChange = useProductsStore((s) => s.handleSortChange);
  const handleTableSort = useProductsStore((s) => s.handleTableSort);
  const setPage = useProductsStore((s) => s.setPage);
  const setStockStatusFromUrl = useProductsStore(
    (s) => s.setStockStatusFromUrl,
  );

  const activeFiltersCount = useMemo(
    () => countActiveFilters(filters),
    [filters],
  );

  const queryParams = useMemo(
    () => filtersToParams(filters, showFavoritesOnly),
    [filters, showFavoritesOnly],
  );

  useEffect(() => {
    const stockParam = searchParams.get("stock");
    if (stockParam && ["disponible", "bajo", "agotado"].includes(stockParam)) {
      setStockStatusFromUrl(stockParam as ProductFiltersState["stockStatus"]);
    }
  }, [searchParams, setStockStatusFromUrl]);

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

  return {
    filters,
    draftFilters,
    showFavoritesOnly,
    page,
    setPage,
    searchRef,
    setSearch,
    clearSearch,
    toggleFavoritesOnly,
    syncDraftWithFilters,
    updateDraftFilters,
    applyDraftFilters,
    resetFilters,
    handleSortChange,
    handleTableSort,
    activeFiltersCount,
    queryParams,
  };
}

export type UseProductFiltersReturn = ReturnType<typeof useProductFilters>;
