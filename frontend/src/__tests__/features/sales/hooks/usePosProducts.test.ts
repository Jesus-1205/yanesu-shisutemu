import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePosProducts } from "../../../../features/sales/hooks/usePosProducts";
import { ToastProvider } from "../../../../ui-components/Toast";
import { api } from "../../../../services/api";
import type { ProductOut } from "../../../../types/api";

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(ToastProvider, null, children)
);

describe("usePosProducts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getFavoriteProducts").mockResolvedValue({
      items: mockProductsList,
      total: 25,
      page: 1,
      page_size: 10,
      pages: 3,
    });
    vi.spyOn(api, "getProducts").mockResolvedValue({
      items: [mockProductsList[0]],
      total: 1,
      page: 1,
      page_size: 100,
      pages: 1,
    });
  });

  it("loads favorite products initially", async () => {
    const { result } = renderHook(() => usePosProducts(""), { wrapper });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.totalFavorites).toBe(25);
    expect(result.current.hasMoreFavorites).toBe(true);
  });

  it("filters out products with no stock when hideNoStock is active", async () => {
    const { result } = renderHook(() => usePosProducts(""), { wrapper });

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    act(() => {
      result.current.setHideNoStock(true);
    });

    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].id).toBe(1);
  });

  it("loads searched products when search query is provided", async () => {
    const { result, rerender } = renderHook(
      ({ search }) => usePosProducts(search),
      { wrapper, initialProps: { search: "" } }
    );

    await waitFor(() => {
      expect(result.current.loadingProducts).toBe(false);
    });

    rerender({ search: "Bebida" });

    await waitFor(() => {
      expect(api.getProducts).toHaveBeenCalledWith({ search: "Bebida", page_size: 100 });
      expect(result.current.products).toHaveLength(1);
    });
  });
});
