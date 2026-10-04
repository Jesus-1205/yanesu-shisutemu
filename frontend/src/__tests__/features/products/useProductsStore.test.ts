import { describe, it, expect, beforeEach } from "vitest";
import {
  useProductsStore,
  selectActiveFiltersCount,
  selectQueryParams,
  filtersToParams,
} from "@/features/products/stores/useProductsStore";
import { FILTERS_DEFAULT } from "@/features/products/types";
import type { Product } from "@/features/products/types";

describe("useProductsStore", () => {
  beforeEach(() => {
    useProductsStore.getState().resetAll();
  });

  it("initializes with default values", () => {
    const state = useProductsStore.getState();
    expect(state.filters).toEqual(FILTERS_DEFAULT);
    expect(state.showFavoritesOnly).toBe(false);
    expect(state.page).toBe(1);
    expect(state.view).toBe("grid");
    expect(state.drawerOpen).toBe(false);
    expect(state.quickEditProduct).toBeNull();
    expect(state.deleteTarget).toBeNull();
  });

  it("updates search and resets page to 1", () => {
    useProductsStore.getState().setPage(3);
    useProductsStore.getState().setSearch("Ron");

    const state = useProductsStore.getState();
    expect(state.filters.search).toBe("Ron");
    expect(state.page).toBe(1);

    state.clearSearch();
    expect(useProductsStore.getState().filters.search).toBe("");
  });

  it("toggles favorites and resets page", () => {
    useProductsStore.getState().setPage(2);
    useProductsStore.getState().toggleFavoritesOnly();

    expect(useProductsStore.getState().showFavoritesOnly).toBe(true);
    expect(useProductsStore.getState().page).toBe(1);
  });

  it("handles sorting changes", () => {
    useProductsStore.getState().handleSortChange("precio_desc");
    expect(useProductsStore.getState().filters.sortField).toBe("precio");
    expect(useProductsStore.getState().filters.sortOrder).toBe("desc");

    useProductsStore.getState().handleTableSort("precio");
    expect(useProductsStore.getState().filters.sortField).toBe("precio");
    expect(useProductsStore.getState().filters.sortOrder).toBe("asc");

    useProductsStore.getState().handleTableSort("stock");
    expect(useProductsStore.getState().filters.sortField).toBe("stock");
    expect(useProductsStore.getState().filters.sortOrder).toBe("asc");
  });

  it("syncs, updates, applies and resets draft filters", () => {
    useProductsStore.getState().openDrawer();
    expect(useProductsStore.getState().drawerOpen).toBe(true);

    useProductsStore.getState().updateDraftFilters((prev) => ({
      ...prev,
      precio_min: 10,
      stockStatus: "bajo",
    }));

    expect(useProductsStore.getState().filters.precio_min).toBe("");
    expect(useProductsStore.getState().draftFilters.precio_min).toBe(10);

    useProductsStore.getState().applyDraftFilters();
    expect(useProductsStore.getState().filters.precio_min).toBe(10);
    expect(useProductsStore.getState().filters.stockStatus).toBe("bajo");

    useProductsStore.getState().resetFilters();
    expect(useProductsStore.getState().filters).toEqual(FILTERS_DEFAULT);
    expect(useProductsStore.getState().draftFilters).toEqual(FILTERS_DEFAULT);
  });

  it("handles UI actions for quickEdit, deleteTarget and catalogMenu", () => {
    const dummyProduct = {
      id: 99,
      nombre: "Test Product",
    } as unknown as Product;

    useProductsStore.getState().openQuickEdit(dummyProduct);
    expect(useProductsStore.getState().quickEditProduct).toEqual(dummyProduct);

    useProductsStore.getState().closeQuickEdit();
    expect(useProductsStore.getState().quickEditProduct).toBeNull();

    useProductsStore.getState().requestDelete(dummyProduct);
    expect(useProductsStore.getState().deleteTarget).toEqual(dummyProduct);

    useProductsStore.getState().cancelDelete();
    expect(useProductsStore.getState().deleteTarget).toBeNull();

    useProductsStore.getState().toggleCatalogMenu({ top: 100, left: 200 });
    expect(useProductsStore.getState().catalogMenuOpen).toBe(true);
    expect(useProductsStore.getState().menuPosition).toEqual({
      top: 100,
      left: 200,
    });

    useProductsStore.getState().closeCatalogMenu();
    expect(useProductsStore.getState().catalogMenuOpen).toBe(false);
  });

  it("computes activeFiltersCount and queryParams correctly", () => {
    useProductsStore.getState().updateDraftFilters((prev) => ({
      ...prev,
      categoria_ids: [1, 2],
      proveedor_id: 5,
      stockStatus: "agotado",
    }));
    useProductsStore.getState().applyDraftFilters();

    const count = selectActiveFiltersCount(useProductsStore.getState());
    expect(count).toBe(3);

    const params = selectQueryParams(useProductsStore.getState());
    expect(params).toEqual({
      categoria_ids: [1, 2],
      proveedor_id: 5,
      stock_status: "agotado",
    });
  });

  it("filtersToParams includes all active parameters", () => {
    const params = filtersToParams(
      {
        ...FILTERS_DEFAULT,
        search: "Vino",
        categoria_ids: [3],
        proveedor_id: 1,
        stockStatus: "disponible",
        sortField: "precio",
        sortOrder: "desc",
        precio_min: 5,
        precio_max: 20,
        tipo_iva: "GRAVADO",
      },
      true,
    );

    expect(params).toEqual({
      search: "Vino",
      categoria_ids: [3],
      proveedor_id: 1,
      stock_status: "disponible",
      sort_by: "precio",
      order: "desc",
      precio_min: 5,
      precio_max: 20,
      tipo_iva: "GRAVADO",
      es_favorito: true,
    });
  });
});
