import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProductDetails } from "@/features/products/hooks/useProductDetails";
import { api } from "@/services/api";
import type { ProductOut } from "@/types/api";

const mockProduct: ProductOut = {
  id: 15,
  codigo_barra: "7591234567890",
  nombre: "Ron Cacique 750ml",
  categories: [{ id: 1, nombre: "Licores", descripcion: null }],
  unidades_por_caja: 12,
  stock_cajas: 5,
  stock_unidades: 60,
  stock_minimo: 6,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 12,
  precio_caja_usd: 130,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: 11.5,
  precio_divisas_caja: 125,
};

describe("useProductDetails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("no realiza fetch si el id es undefined", () => {
    const getProductSpy = vi.spyOn(api, "getProduct");
    const { result } = renderHook(() => useProductDetails(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.product).toBeNull();
    expect(result.current.error).toBeNull();
    expect(getProductSpy).not.toHaveBeenCalled();
  });

  it("obtiene exitosamente los detalles de un producto", async () => {
    vi.spyOn(api, "getProduct").mockResolvedValue(mockProduct);
    const { result } = renderHook(() => useProductDetails("15"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toEqual(mockProduct);
    expect(result.current.error).toBeNull();
  });

  it("maneja errores de la API al cargar", async () => {
    vi.spyOn(api, "getProduct").mockRejectedValue(new Error("Error al obtener producto"));
    const { result } = renderHook(() => useProductDetails(15));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toBeNull();
    expect(result.current.error).toBe("Error al obtener producto");
  });

  it("permite reintentar o refrescar con refetch", async () => {
    const getProductSpy = vi.spyOn(api, "getProduct")
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(mockProduct);

    const { result } = renderHook(() => useProductDetails(15));

    await waitFor(() => {
      expect(result.current.error).toBe("Network Error");
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.product).toEqual(mockProduct);
    expect(getProductSpy).toHaveBeenCalledTimes(2);
  });
});
