import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import {
  useProductFilters,
  filtersToParams,
  countActiveFilters,
} from "@/features/products/hooks/useProductFilters";
import { FILTERS_DEFAULT } from "@/features/products/types";

describe("filtersToParams and countActiveFilters", () => {
  it("converts default filters to empty params", () => {
    const params = filtersToParams(FILTERS_DEFAULT, false);
    expect(params).toEqual({});
    expect(countActiveFilters(FILTERS_DEFAULT)).toBe(0);
  });

  it("converts custom filters to proper query params and counts active filters", () => {
    const custom = {
      ...FILTERS_DEFAULT,
      search: "Ron",
      categoria_ids: [1, 2],
      proveedor_id: 3,
      stockStatus: "bajo" as const,
      precio_min: 10,
      precio_max: 50,
      tipo_iva: "GRAVADO" as const,
      sortField: "precio" as const,
      sortOrder: "desc" as const,
    };
    const params = filtersToParams(custom, true);
    expect(params).toEqual({
      search: "Ron",
      categoria_ids: [1, 2],
      proveedor_id: 3,
      stock_status: "bajo",
      sort_by: "precio",
      order: "desc",
      precio_min: 10,
      precio_max: 50,
      tipo_iva: "GRAVADO",
      es_favorito: true,
    });
    expect(countActiveFilters(custom)).toBe(7);
  });
});

describe("useProductFilters", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={["/products?stock=bajo"]}>
      {children}
    </MemoryRouter>
  );

  it("initializes filters including searchParams", () => {
    const { result } = renderHook(() => useProductFilters(), { wrapper });

    expect(result.current.filters.stockStatus).toBe("bajo");
    expect(result.current.draftFilters.stockStatus).toBe("bajo");
    expect(result.current.page).toBe(1);
    expect(result.current.showFavoritesOnly).toBe(false);
  });

  it("handles search actions (setSearch, clearSearch)", () => {
    const { result } = renderHook(() => useProductFilters(), { wrapper });

    act(() => {
      result.current.setSearch("Santa Teresa");
    });
    expect(result.current.filters.search).toBe("Santa Teresa");

    act(() => {
      result.current.clearSearch();
    });
    expect(result.current.filters.search).toBe("");
  });

  it("handles favorite toggle and draft syncing/resetting", () => {
    const { result } = renderHook(() => useProductFilters(), { wrapper });

    act(() => {
      result.current.toggleFavoritesOnly();
    });
    expect(result.current.showFavoritesOnly).toBe(true);

    act(() => {
      result.current.updateDraftFilters({ ...FILTERS_DEFAULT, search: "Vino" });
    });
    expect(result.current.filters.search).toBe("");

    act(() => {
      result.current.applyDraftFilters();
    });
    expect(result.current.filters.search).toBe("Vino");

    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filters.search).toBe("");
    expect(result.current.draftFilters.search).toBe("");
  });

  it("handles sorting changes", () => {
    const { result } = renderHook(() => useProductFilters(), { wrapper });

    act(() => {
      result.current.handleSortChange("precio_desc");
    });
    expect(result.current.filters.sortField).toBe("precio");
    expect(result.current.filters.sortOrder).toBe("desc");

    act(() => {
      result.current.handleTableSort("precio");
    });
    // Already precio and desc -> toggle to asc
    expect(result.current.filters.sortOrder).toBe("asc");

    act(() => {
      result.current.handleTableSort("stock");
    });
    // New field -> stock and asc
    expect(result.current.filters.sortField).toBe("stock");
    expect(result.current.filters.sortOrder).toBe("asc");
  });
});
