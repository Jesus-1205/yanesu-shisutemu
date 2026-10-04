import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCreateProduct } from "@/features/shared/hooks/useCreateProduct";

const mockGetCategories = vi.fn();
const mockGetSuppliers = vi.fn();
const mockCreateProduct = vi.fn();

vi.mock("@/services/api", () => ({
  api: {
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
    getSuppliers: (...args: unknown[]) => mockGetSuppliers(...args),
    createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  },
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, rol_nombre: "ADMINISTRADOR", nombre_completo: "Admin Test" },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("useCreateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategories.mockResolvedValue([
      { id: 10, nombre: "Ron" },
      { id: 20, nombre: "Whisky" },
    ]);
    mockGetSuppliers.mockResolvedValue([
      { id: 1, nombre: "Proveedor A" },
      { id: 2, nombre: "Proveedor B" },
    ]);
  });

  it("loads categories and suppliers on open = true", async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();

    const { result } = renderHook(() =>
      useCreateProduct({
        open: true,
        onClose,
        onCreated,
      })
    );

    // Initial state
    expect(result.current.formData.nombre).toBe("");
    expect(result.current.formData.precio_costo_caja_usd).toBe("");
    expect(result.current.isOperator).toBe(false);

    await act(async () => {});

    expect(mockGetCategories).toHaveBeenCalled();
    expect(mockGetSuppliers).toHaveBeenCalled();
    expect(result.current.categories).toHaveLength(2);
    expect(result.current.categoryOptions).toEqual([
      { value: 10, label: "Ron" },
      { value: 20, label: "Whisky" },
    ]);
    expect(result.current.supplierOptions).toEqual([
      { value: 1, label: "Proveedor A" },
      { value: 2, label: "Proveedor B" },
    ]);
  });

  it("handles initial values with AI extraction and currency conversion", async () => {
    let hookResult: { current: ReturnType<typeof useCreateProduct> } = null!;

    await act(async () => {
      const { result } = renderHook(() =>
        useCreateProduct({
          open: true,
          onClose: vi.fn(),
          onCreated: vi.fn(),
          initialNombre: "SANGRIA CAROREÑA 1.5L 6 UNIDADES",
          initialPrecio: 360,
          initialMoneda: "BS",
          initialProveedorId: 2,
          tasaBs: 36,
        })
      );
      hookResult = result;
    });

    expect(hookResult.current.formData.nombre).toBe("Sangria Caroreña 1.5L");
    expect(hookResult.current.formData.unidades_por_caja).toBe(6);
    expect(hookResult.current.formData.precio_costo_caja_usd).toBe(10); // 360 / 36 = 10
    expect(hookResult.current.formData.proveedor_id).toBe(2);
  });

  it("calculates derived financial values correctly", async () => {
    let hookResult: { current: ReturnType<typeof useCreateProduct> } = null!;

    await act(async () => {
      const { result } = renderHook(() =>
        useCreateProduct({
          open: true,
          onClose: vi.fn(),
          onCreated: vi.fn(),
        })
      );
      hookResult = result;
    });

    act(() => {
      hookResult.current.updateField("precio_costo_caja_usd", 100);
      hookResult.current.updateField("unidades_por_caja", 10);
      hookResult.current.updateField("precio_unidad_usd", 15);
    });

    expect(hookResult.current.costoUnitario).toBe(10); // 100 / 10 = 10
    expect(hookResult.current.precioSugeridoUnidad).toBe(14.29); // Math.round((10 / 0.7) * 100) / 100 = 14.29
    expect(hookResult.current.precioSugeridoCaja).toBe(142.86); // Math.round((100 / 0.7) * 100) / 100 = 142.86
    expect(hookResult.current.margin.margen).toBeCloseTo(33.33, 1);
  });

  it("searches suppliers via handleSearchSuppliers", async () => {
    const { result } = renderHook(() =>
      useCreateProduct({
        open: true,
        onClose: vi.fn(),
        onCreated: vi.fn(),
      })
    );

    await act(async () => {});

    mockGetSuppliers.mockResolvedValueOnce([{ id: 99, nombre: "Distribuidora Polar" }]);

    let options: { value: number; label: string }[] = [];
    await act(async () => {
      options = await result.current.handleSearchSuppliers("Polar");
    });

    expect(mockGetSuppliers).toHaveBeenCalledWith({ search: "Polar" });
    expect(options).toEqual([{ value: 99, label: "Distribuidora Polar" }]);
  });

  it("validates required unidadesPorCaja on submit", async () => {
    const { result } = renderHook(() =>
      useCreateProduct({
        open: true,
        onClose: vi.fn(),
        onCreated: vi.fn(),
      })
    );

    act(() => {
      result.current.updateField("nombre", "Test Product");
      result.current.updateField("unidades_por_caja", 0);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.error).toBe("Las unidades por caja son obligatorias");
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it("submits full product successfully", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const createdProduct = { id: 123, nombre: "Ron Cacique" };
    mockCreateProduct.mockResolvedValueOnce(createdProduct);

    const { result } = renderHook(() =>
      useCreateProduct({
        open: true,
        onClose,
        onCreated,
      })
    );

    act(() => {
      result.current.updateField("nombre", "Ron Cacique");
      result.current.updateField("codigo_barra", "759123456");
      result.current.updateField("categoria_ids", [10]);
      result.current.updateField("proveedor_id", 1);
      result.current.updateField("precio_costo_caja_usd", 120);
      result.current.updateField("unidades_por_caja", 12);
      result.current.updateField("precio_unidad_usd", 15);
      result.current.updateField("precio_caja_usd", 160);
      result.current.updateField("stock_unidades", 24);
      result.current.updateField("stock_minimo", 6);
      result.current.updateField("tipo_iva", "GRAVADO");
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mockCreateProduct).toHaveBeenCalledWith({
      nombre: "Ron Cacique",
      codigo_barra: "759123456",
      categoria_ids: [10],
      unidades_por_caja: 12,
      stock_unidades: 24,
      stock_minimo: 6,
      precio_costo_caja_usd: 120,
      precio_unidad_usd: 15,
      precio_caja_usd: 160,
      proveedor_id: 1,
      tipo_iva: "GRAVADO",
    });
    expect(onCreated).toHaveBeenCalledWith(createdProduct);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles submit error gracefully", async () => {
    mockCreateProduct.mockRejectedValueOnce(new Error("Database conflict"));

    const { result } = renderHook(() =>
      useCreateProduct({
        open: true,
        onClose: vi.fn(),
        onCreated: vi.fn(),
      })
    );

    act(() => {
      result.current.updateField("nombre", "Duplicate Item");
      result.current.updateField("unidades_por_caja", 1);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.error).toBe("Database conflict");
    expect(result.current.saving).toBe(false);
  });
});
