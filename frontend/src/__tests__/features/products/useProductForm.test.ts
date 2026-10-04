import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProductForm } from "@/features/products/hooks/useProductForm";
import { api } from "@/services/api";
import type { ProductOut, CategoryOut, SupplierOut } from "@/types/api";

const mockCategories: CategoryOut[] = [
  { id: 1, nombre: "Licores", descripcion: null },
];

const mockSuppliers: SupplierOut[] = [
  { id: 1, nombre: "Destilerías Unidas", telefono: null, email: null },
];

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

describe("useProductForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "getSuppliers").mockResolvedValue(mockSuppliers);
  });

  it("inicializa con valores por defecto cuando no se pasa un producto inicial", async () => {
    const { result } = renderHook(() => useProductForm());

    expect(result.current.form.nombre).toBe("");
    expect(result.current.form.categoria_ids).toEqual([]);
    expect(result.current.loadingMeta).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingMeta).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.suppliers).toEqual(mockSuppliers);
  });

  it("inicializa con datos del producto cuando se pasa initialProduct", async () => {
    const { result } = renderHook(() => useProductForm(mockProduct));

    expect(result.current.form.nombre).toBe("Ron Cacique 750ml");
    expect(result.current.form.codigo_barra).toBe("7591234567890");
    expect(result.current.form.unidades_por_caja).toBe(12);
    expect(result.current.form.precio_costo_caja_usd).toBe(96);
    expect(result.current.precioCostoUnitario).toBe(8); // 96 / 12
    expect(result.current.precioSugerido).toBe(11.43); // 8 / 0.7 rounded
    expect(result.current.precioSugeridoCaja).toBe(137.14); // 96 / 0.7 rounded

    await waitFor(() => {
      expect(result.current.loadingMeta).toBe(false);
    });
  });

  it("permite actualizar campos individuales con setField", async () => {
    const { result } = renderHook(() => useProductForm());

    await waitFor(() => {
      expect(result.current.loadingMeta).toBe(false);
    });

    act(() => {
      result.current.setField("nombre", "Whisky Añejo");
      result.current.setField("precio_costo_caja_usd", 120);
      result.current.setField("unidades_por_caja", 6);
    });

    expect(result.current.form.nombre).toBe("Whisky Añejo");
    expect(result.current.precioCostoUnitario).toBe(20); // 120 / 6
  });

  it("actualiza categorias cuando se crea una nueva categoria", async () => {
    const { result } = renderHook(() => useProductForm());

    await waitFor(() => {
      expect(result.current.loadingMeta).toBe(false);
    });

    const newCat: CategoryOut = { id: 2, nombre: "Vinos", descripcion: null };
    act(() => {
      result.current.onCategoryCreated(newCat);
    });

    expect(result.current.categories).toContainEqual(newCat);
    expect(result.current.form.categoria_ids).toContain(2);
  });

  it("actualiza proveedores cuando se crea un nuevo proveedor", async () => {
    const { result } = renderHook(() => useProductForm());

    await waitFor(() => {
      expect(result.current.loadingMeta).toBe(false);
    });

    const newSup: SupplierOut = { id: 5, nombre: "Nuevo Proveedor", telefono: null, email: null };
    act(() => {
      result.current.onSupplierCreated(newSup);
    });

    expect(result.current.suppliers).toContainEqual(newSup);
    expect(result.current.form.proveedor_id).toBe(5);
  });

  it("genera el payload correcto para la API", async () => {
    const { result } = renderHook(() => useProductForm(mockProduct));

    await waitFor(() => {
      expect(result.current.loadingMeta).toBe(false);
    });

    const payload = result.current.buildPayload();
    expect(payload).toEqual({
      nombre: "Ron Cacique 750ml",
      codigo_barra: "7591234567890",
      categoria_ids: [1],
      unidades_por_caja: 12,
      precio_costo_caja_usd: 96,
      precio_unidad_usd: 12,
      precio_caja_usd: 130,
      proveedor_id: 1,
      tipo_iva: "GRAVADO",
      stock_cajas: 5,
      stock_unidades: 60,
      stock_minimo: 6,
    });
  });
});
