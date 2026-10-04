import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProductMutation } from "@/features/products/hooks/useProductMutation";
import { api } from "@/services/api";
import type { ProductCreate, ProductOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const samplePayload: ProductCreate = {
  nombre: "Cerveza Polar 330ml",
  codigo_barra: "7591000000000",
  categoria_ids: [1],
  unidades_por_caja: 24,
  precio_costo_caja_usd: 20,
  precio_unidad_usd: 1.2,
  precio_caja_usd: 25,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  stock_cajas: 10,
  stock_unidades: 240,
  stock_minimo: 12,
};

const mockProductOut: ProductOut = {
  id: 20,
  nombre: samplePayload.nombre,
  codigo_barra: samplePayload.codigo_barra ?? null,
  unidades_por_caja: samplePayload.unidades_por_caja ?? 1,
  precio_costo_caja_usd: samplePayload.precio_costo_caja_usd,
  precio_unidad_usd: samplePayload.precio_unidad_usd,
  precio_caja_usd: samplePayload.precio_caja_usd,
  proveedor_id: samplePayload.proveedor_id ?? null,
  tipo_iva: samplePayload.tipo_iva ?? "GRAVADO",
  stock_cajas: samplePayload.stock_cajas ?? 0,
  stock_unidades: samplePayload.stock_unidades ?? 0,
  stock_minimo: samplePayload.stock_minimo ?? 0,
  precio_costo_usd: 0.83,
  precio_sugerido_unidad_usd: 1.19,
  precio_sugerido_caja_usd: 28.57,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
  es_favorito: false,
  categories: [{ id: 1, nombre: "Cervezas", descripcion: null }],
};

describe("useProductMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un producto exitosamente, notifica y redirige", async () => {
    vi.spyOn(api, "createProduct").mockResolvedValue(mockProductOut);

    const { result } = renderHook(() => useProductMutation());

    let success = false;
    await act(async () => {
      success = await result.current.createProduct(samplePayload);
    });

    expect(success).toBe(true);
    expect(api.createProduct).toHaveBeenCalledWith(samplePayload);
    expect(mockToast).toHaveBeenCalledWith("Producto creado", "success");
    expect(mockNavigate).toHaveBeenCalledWith("/products");
  });

  it("actualiza un producto exitosamente, notifica y redirige", async () => {
    vi.spyOn(api, "updateProduct").mockResolvedValue(mockProductOut);

    const { result } = renderHook(() => useProductMutation());

    let success = false;
    await act(async () => {
      success = await result.current.updateProduct(20, samplePayload);
    });

    expect(success).toBe(true);
    expect(api.updateProduct).toHaveBeenCalledWith(20, samplePayload);
    expect(mockToast).toHaveBeenCalledWith("Producto actualizado", "success");
    expect(mockNavigate).toHaveBeenCalledWith("/products");
  });

  it("maneja errores al crear producto y notifica con toast de error", async () => {
    vi.spyOn(api, "createProduct").mockRejectedValue(new Error("Nombre duplicado"));

    const { result } = renderHook(() => useProductMutation());

    let success = false;
    await act(async () => {
      success = await result.current.createProduct(samplePayload);
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("Nombre duplicado", "error");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });

  it("maneja errores al actualizar producto y notifica con toast de error", async () => {
    vi.spyOn(api, "updateProduct").mockRejectedValue(new Error("Fallo de red"));

    const { result } = renderHook(() => useProductMutation());

    let success = false;
    await act(async () => {
      success = await result.current.updateProduct(20, samplePayload);
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("Fallo de red", "error");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });
});
