import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePosCatalog } from "../../../../features/sales/hooks/usePosCatalog";
import { ToastProvider } from "../../../../ui-components/Toast";
import { api } from "../../../../services/api";
import type { ProductOut, ComboActiveOut } from "../../../../types/api";

const mockProductsList: ProductOut[] = [
  {
    id: 1,
    codigo_barra: "111",
    nombre: "Bebida B",
    categories: [],
    unidades_por_caja: 10,
    stock_cajas: 1,
    stock_unidades: 10,
    stock_minimo: 2,
    precio_costo_caja_usd: 10,
    precio_costo_usd: 1,
    precio_unidad_usd: 2,
    precio_caja_usd: 20,
    precio_sugerido_unidad_usd: 2,
    precio_sugerido_caja_usd: 20,
    proveedor_id: null,
    tipo_iva: "GRAVADO",
    es_favorito: true,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
  {
    id: 2,
    codigo_barra: "222",
    nombre: "Agua A",
    categories: [],
    unidades_por_caja: 1,
    stock_cajas: 0,
    stock_unidades: 0,
    stock_minimo: 1,
    precio_costo_caja_usd: 5,
    precio_costo_usd: 5,
    precio_unidad_usd: 1,
    precio_caja_usd: 1,
    precio_sugerido_unidad_usd: 1,
    precio_sugerido_caja_usd: 1,
    proveedor_id: null,
    tipo_iva: "EXENTO",
    es_favorito: true,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
];

const mockCombosList: ComboActiveOut[] = [
  {
    id: 1,
    nombre: "Super Combo",
    precio_total_usd: 15,
    metodo_pago_ids: [1],
    groups: [
      {
        id: 10,
        nombre: "Grupo",
        min_cantidad: 1,
        max_cantidad: 1,
        productos: [{ producto_id: 1, nombre: "Bebida B", precio_unidad_usd: 2 }],
      },
    ],
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(ToastProvider, null, children)
);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, "getFavoriteProducts").mockResolvedValue({
    items: mockProductsList,
    total: 25,
    page: 1,
    page_size: 10,
    pages: 3,
  });
  vi.spyOn(api, "getActiveCombos").mockResolvedValue(mockCombosList);
  vi.spyOn(api, "getProducts").mockResolvedValue({
    items: [mockProductsList[0]],
    total: 1,
    page: 1,
    page_size: 100,
    pages: 1,
  });
});

describe("usePosCatalog", () => {
  it("loads favorites and active combos on mount", async () => {
    const { result } = renderHook(() => usePosCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    expect(result.current.combos).toHaveLength(1);
    expect(result.current.totalFavorites).toBe(25);
    expect(result.current.hasMoreFavorites).toBe(true);
    expect(result.current.filteredProducts[0].nombre).toBe("Bebida B");
    expect(result.current.filteredProducts[1].nombre).toBe("Agua A");
  });

  it("filters out out-of-stock products when hideNoStock is true", async () => {
    const { result } = renderHook(() => usePosCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    act(() => {
      result.current.setHideNoStock(true);
    });

    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].id).toBe(1);
  });

  it("loads more favorites when handleShowMore is called", async () => {
    const { result } = renderHook(() => usePosCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    act(() => {
      result.current.handleShowMore();
    });

    await waitFor(() => {
      expect(api.getFavoriteProducts).toHaveBeenCalledWith(50);
    });
    expect(result.current.hasMoreFavorites).toBe(false);
  });

  it("debounces search input and calls getProducts", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePosCatalog(), { wrapper });

    act(() => {
      result.current.handleSearchChange({
        target: { value: "Bebida" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.search).toBe("Bebida");
    expect(result.current.debouncedSearch).toBe("");

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.debouncedSearch).toBe("Bebida");

    vi.useRealTimers();
    await waitFor(() => {
      expect(api.getProducts).toHaveBeenCalledWith({ search: "Bebida", page_size: 100 });
    });
  });

  it("resets search and restores favorites", async () => {
    const { result } = renderHook(() => usePosCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    act(() => {
      result.current.setSearch("test");
    });

    act(() => {
      result.current.resetSearch();
    });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    expect(result.current.search).toBe("");
    expect(result.current.debouncedSearch).toBe("");
    expect(api.getFavoriteProducts).toHaveBeenCalled();
  });

  it("handles errors when loading products or favorites gracefully", async () => {
    vi.spyOn(api, "getFavoriteProducts").mockRejectedValueOnce(new Error("Network Error"));
    const { result } = renderHook(() => usePosCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });
  });
});
