import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ProductFiltersState, SortField, SortOrder } from "../types";
import { FILTERS_DEFAULT } from "../types";

export function filtersToParams(
  filters: ProductFiltersState,
  showFavoritesOnly: boolean,
): Record<string, unknown> {
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

export function useProductFilters() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<ProductFiltersState>(FILTERS_DEFAULT);
  const [draftFilters, setDraftFilters] = useState<ProductFiltersState>(FILTERS_DEFAULT);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stockParam = searchParams.get("stock");
    if (stockParam && ["disponible", "bajo", "agotado"].includes(stockParam)) {
      setFilters((prev) => ({
        ...prev,
        stockStatus: stockParam as ProductFiltersState["stockStatus"],
      }));
      setDraftFilters((prev) => ({
        ...prev,
        stockStatus: stockParam as ProductFiltersState["stockStatus"],
      }));
    }
  }, [searchParams]);

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

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const clearSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
  }, []);

  const toggleFavoritesOnly = useCallback(() => {
    setShowFavoritesOnly((prev) => !prev);
  }, []);

  const syncDraftWithFilters = useCallback(() => {
    setDraftFilters({ ...filters });
  }, [filters]);

  const updateDraftFilters = useCallback(
    (updater: React.SetStateAction<ProductFiltersState>) => {
      setDraftFilters(updater);
    },
    [],
  );

  const applyDraftFilters = useCallback(() => {
    setFilters(draftFilters);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(FILTERS_DEFAULT);
    setFilters(FILTERS_DEFAULT);
  }, []);

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

  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  const queryParams = useMemo(
    () => filtersToParams(filters, showFavoritesOnly),
    [filters, showFavoritesOnly],
  );

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
