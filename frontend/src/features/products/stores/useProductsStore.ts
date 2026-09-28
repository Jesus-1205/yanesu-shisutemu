import { create } from "zustand";
import type {
  Product,
  ProductFiltersState,
  SortField,
  SortOrder,
  ViewMode,
} from "../types";
import { FILTERS_DEFAULT } from "../types";

export function filtersToParams(
  filters: ProductFiltersState,
  showFavoritesOnly: boolean,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (filters.search) params.search = filters.search;
  if (filters.categoria_ids.length > 0)
    params.categoria_ids = filters.categoria_ids;
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

export interface ProductsState {
  // Filter & Pagination Slice
  filters: ProductFiltersState;
  draftFilters: ProductFiltersState;
  showFavoritesOnly: boolean;
  page: number;

  // UI Slice
  view: ViewMode;
  drawerOpen: boolean;
  quickEditProduct: Product | null;
  deleteTarget: Product | null;
  catalogMenuOpen: boolean;
  menuPosition: { top: number; left: number };

  // Filter Actions
  setSearch: (search: string) => void;
  clearSearch: () => void;
  toggleFavoritesOnly: () => void;
  setShowFavoritesOnly: (show: boolean) => void;
  setSort: (sortField: SortField, sortOrder: SortOrder) => void;
  handleSortChange: (raw: string) => void;
  handleTableSort: (field: SortField) => void;
  setPage: (page: number) => void;
  syncDraftWithFilters: () => void;
  updateDraftFilters: (
    updater:
      | ProductFiltersState
      | ((prev: ProductFiltersState) => ProductFiltersState),
  ) => void;
  applyDraftFilters: () => void;
  resetFilters: () => void;
  setStockStatusFromUrl: (
    stockStatus: ProductFiltersState["stockStatus"],
  ) => void;

  // UI Actions
  setView: (view: ViewMode) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openQuickEdit: (product: Product) => void;
  closeQuickEdit: () => void;
  requestDelete: (product: Product) => void;
  cancelDelete: () => void;
  openCatalogMenu: (position: { top: number; left: number }) => void;
  closeCatalogMenu: () => void;
  toggleCatalogMenu: (position: { top: number; left: number }) => void;
  resetUI: () => void;
  resetAll: () => void;
}

const initialUIState = {
  view: "grid" as ViewMode,
  drawerOpen: false,
  quickEditProduct: null,
  deleteTarget: null,
  catalogMenuOpen: false,
  menuPosition: { top: 0, left: 0 },
};

export const useProductsStore = create<ProductsState>((set) => ({
  // Filter initial state
  filters: FILTERS_DEFAULT,
  draftFilters: FILTERS_DEFAULT,
  showFavoritesOnly: false,
  page: 1,

  // UI initial state
  ...initialUIState,

  // Filter actions
  setSearch: (search: string) =>
    set((state) => ({
      filters: { ...state.filters, search },
      page: 1,
    })),

  clearSearch: () =>
    set((state) => ({
      filters: { ...state.filters, search: "" },
      page: 1,
    })),

  toggleFavoritesOnly: () =>
    set((state) => ({
      showFavoritesOnly: !state.showFavoritesOnly,
      page: 1,
    })),

  setShowFavoritesOnly: (show: boolean) =>
    set({ showFavoritesOnly: show, page: 1 }),

  setSort: (sortField: SortField, sortOrder: SortOrder) =>
    set((state) => ({
      filters: { ...state.filters, sortField, sortOrder },
      page: 1,
    })),

  handleSortChange: (raw: string) => {
    const [sortField, sortOrder] = raw.split("_") as [SortField, SortOrder];
    set((state) => ({
      filters: { ...state.filters, sortField, sortOrder },
      page: 1,
    }));
  },

  handleTableSort: (field: SortField) =>
    set((state) => {
      if (state.filters.sortField === field) {
        const nextOrder = state.filters.sortOrder === "asc" ? "desc" : "asc";
        return {
          filters: { ...state.filters, sortOrder: nextOrder },
          page: 1,
        };
      }
      return {
        filters: { ...state.filters, sortField: field, sortOrder: "asc" },
        page: 1,
      };
    }),

  setPage: (page: number) => set({ page }),

  syncDraftWithFilters: () =>
    set((state) => ({
      draftFilters: { ...state.filters },
    })),

  updateDraftFilters: (updater) =>
    set((state) => ({
      draftFilters:
        typeof updater === "function" ? updater(state.draftFilters) : updater,
    })),

  applyDraftFilters: () =>
    set((state) => ({
      filters: { ...state.draftFilters },
      page: 1,
    })),

  resetFilters: () =>
    set({
      draftFilters: FILTERS_DEFAULT,
      filters: FILTERS_DEFAULT,
      showFavoritesOnly: false,
      page: 1,
    }),

  setStockStatusFromUrl: (stockStatus) =>
    set((state) => ({
      filters: { ...state.filters, stockStatus },
      draftFilters: { ...state.draftFilters, stockStatus },
      page: 1,
    })),

  // UI actions
  setView: (view: ViewMode) => set({ view }),

  openDrawer: () =>
    set((state) => ({
      draftFilters: { ...state.filters },
      drawerOpen: true,
    })),

  closeDrawer: () => set({ drawerOpen: false }),

  openQuickEdit: (product: Product) => set({ quickEditProduct: product }),

  closeQuickEdit: () => set({ quickEditProduct: null }),

  requestDelete: (product: Product) => set({ deleteTarget: product }),

  cancelDelete: () => set({ deleteTarget: null }),

  openCatalogMenu: (position) =>
    set({
      menuPosition: position,
      catalogMenuOpen: true,
    }),

  closeCatalogMenu: () => set({ catalogMenuOpen: false }),

  toggleCatalogMenu: (position) =>
    set((state) => ({
      menuPosition: position,
      catalogMenuOpen: !state.catalogMenuOpen,
    })),

  resetUI: () => set(initialUIState),

  resetAll: () =>
    set({
      filters: FILTERS_DEFAULT,
      draftFilters: FILTERS_DEFAULT,
      showFavoritesOnly: false,
      page: 1,
      ...initialUIState,
    }),
}));

export const selectActiveFiltersCount = (state: ProductsState) =>
  countActiveFilters(state.filters);

export const selectQueryParams = (state: ProductsState) =>
  filtersToParams(state.filters, state.showFavoritesOnly);
