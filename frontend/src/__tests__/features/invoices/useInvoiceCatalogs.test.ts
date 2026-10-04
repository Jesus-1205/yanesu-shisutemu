import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInvoiceCatalogs } from "@/features/invoices/hooks/useInvoiceCatalogs";
import { api } from "@/services/api";
import type { CategoryOut, ProductOut, SupplierOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getSuppliers: vi.fn(),
    getProducts: vi.fn(),
  },
}));

describe("useInvoiceCatalogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads suppliers on mount", async () => {
    const suppliers: SupplierOut[] = [{ id: 1, nombre: "Distribuidora A", telefono: null, email: null }];
    vi.mocked(api.getSuppliers).mockResolvedValue(suppliers);

    const { result } = renderHook(() => useInvoiceCatalogs());

    await waitFor(() => {
      expect(result.current.suppliers).toEqual(suppliers);
    });
  });

  it("searches products and maps to combobox options", async () => {
    const products: ProductOut[] = [
      {
        id: 10,
        nombre: "Whisky 12 Años",
        codigo_barra: "759123456",
        unidades_por_caja: 12,
        stock_cajas: 5,
        stock_unidades: 60,
        stock_minimo: 2,
        precio_costo_usd: 25,
        precio_costo_caja_usd: 300,
        precio_unidad_usd: 35,
        precio_caja_usd: 420,
        precio_sugerido_unidad_usd: 40,
        precio_sugerido_caja_usd: 480,
        proveedor_id: 1,
        tipo_iva: "GRAVADO",
        es_favorito: false,
        precio_divisas_unidad: null,
        precio_divisas_caja: null,
        categories: [],
      },
    ];
    vi.mocked(api.getSuppliers).mockResolvedValue([]);
    vi.mocked(api.getProducts).mockResolvedValue({
      items: products,
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    });

    const { result } = renderHook(() => useInvoiceCatalogs());

    let options: Array<{ value: number; label: string; subtitle?: string }> = [];
    await act(async () => {
      options = await result.current.handleSearchProducts("Whisky");
    });

    expect(options).toEqual([
      { value: 10, label: "Whisky 12 Años", subtitle: "759123456" },
    ]);
    expect(result.current.products).toEqual(products);
  });

  it("handles creation callbacks for supplier, category, product", async () => {
    vi.mocked(api.getSuppliers).mockResolvedValue([]);
    const { result } = renderHook(() => useInvoiceCatalogs());
    await waitFor(() => expect(result.current.suppliers).toEqual([]));

    const supplier: SupplierOut = { id: 99, nombre: "Nuevo Proveedor", telefono: null, email: null };
    const category: CategoryOut = { id: 88, nombre: "Licores Dulces", descripcion: "Variados" };
    const product: ProductOut = {
      id: 77,
      nombre: "Nuevo Ron",
      codigo_barra: null,
      unidades_por_caja: 12,
      stock_cajas: 0,
      stock_unidades: 0,
      stock_minimo: 0,
      precio_costo_usd: 10,
      precio_costo_caja_usd: 120,
      precio_unidad_usd: 15,
      precio_caja_usd: 180,
      precio_sugerido_unidad_usd: 18,
      precio_sugerido_caja_usd: 216,
      proveedor_id: 99,
      tipo_iva: "GRAVADO",
      es_favorito: false,
      precio_divisas_unidad: null,
      precio_divisas_caja: null,
      categories: [],
    };

    act(() => {
      result.current.handleSupplierCreated(supplier);
      result.current.handleCategoryCreated(category);
      result.current.handleProductCreated(product);
    });

    expect(result.current.suppliers).toContainEqual(supplier);
    expect(result.current.products).toContainEqual(product);
    expect(mockToast).toHaveBeenCalledWith('Proveedor "Nuevo Proveedor" creado', "success");
    expect(mockToast).toHaveBeenCalledWith('Categoría "Licores Dulces" creada', "success");
    expect(mockToast).toHaveBeenCalledWith('Producto "Nuevo Ron" creado', "success");
  });
});
