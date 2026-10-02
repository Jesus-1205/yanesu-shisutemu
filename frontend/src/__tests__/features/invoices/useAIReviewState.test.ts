import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAIReviewState } from "@/features/invoices/hooks/useAIReviewState";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import type { InvoiceAnalysisOut, ProductOut, SupplierOut } from "@/types/api";

const mockAnalysis: InvoiceAnalysisOut = {
  proveedor_nombre: "Distribuidora Los Andes",
  numero_factura: "FAC-9988",
  fecha_factura: "2026-03-15",
  fecha_limite_pago: "2026-03-30",
  moneda: "USD",
  tipo_documento: "FACTURA",
  productos: [
    {
      nombre: "Ron Santa Teresa 1996",
      cantidad: 2,
      precio_unitario: 35.0,
      tipo_empaque: "UNIDAD",
    },
    {
      nombre: "Cerveza Polar Pilsen",
      cantidad: 5,
      precio_unitario: 12.0,
      tipo_empaque: "CAJA",
    },
  ],
  raw_json_ia: {},
};

const mockProducts: ProductOut[] = [
  {
    id: 101,
    codigo_barra: "7591234567890",
    nombre: "Ron Santa Teresa 1996",
    categories: [],
    unidades_por_caja: 6,
    stock_cajas: 1,
    stock_unidades: 10,
    stock_minimo: 2,
    precio_costo_caja_usd: 180,
    precio_costo_usd: 30,
    precio_unidad_usd: 40,
    precio_caja_usd: 240,
    precio_sugerido_unidad_usd: 40,
    precio_sugerido_caja_usd: 240,
    proveedor_id: 1,
    tipo_iva: "GRAVADO",
    es_favorito: false,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
  {
    id: 102,
    codigo_barra: "7599876543210",
    nombre: "Cerveza Polar Pilsen",
    categories: [],
    unidades_por_caja: 24,
    stock_cajas: 2,
    stock_unidades: 50,
    stock_minimo: 5,
    precio_costo_caja_usd: 240,
    precio_costo_usd: 10,
    precio_unidad_usd: 15,
    precio_caja_usd: 360,
    precio_sugerido_unidad_usd: 15,
    precio_sugerido_caja_usd: 360,
    proveedor_id: 1,
    tipo_iva: "GRAVADO",
    es_favorito: false,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
];

describe("useAIReviewState", () => {
  const onSupplierCreated = vi.fn();
  const onProductCreated = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
    useInvoiceFormStore.getState().setField("tasa", "36.00");
  });

  it("initializes state from aiAnalysis correctly", () => {
    const { result } = renderHook(() =>
      useAIReviewState({
        aiAnalysis: mockAnalysis,
        products: mockProducts,
        onSupplierCreated,
        onProductCreated,
        onCancel,
      })
    );

    expect(result.current.state.proveedorNombre).toBe("Distribuidora Los Andes");
    expect(result.current.state.numeroFactura).toBe("FAC-9988");
    expect(result.current.state.fechaFactura).toBe("2026-03-15");
    expect(result.current.state.fechaLimitePago).toBe("2026-03-30");
    expect(result.current.state.moneda).toBe("USD");
    expect(result.current.state.tipoDocumento).toBe("FACTURA");
    expect(result.current.state.items).toHaveLength(2);
    expect(result.current.computed.allAccepted).toBe(false);
    expect(result.current.computed.resolvedCount).toBe(0);
  });

  it("handles selecting products and updating resolved count", async () => {
    const { result } = renderHook(() =>
      useAIReviewState({
        aiAnalysis: mockAnalysis,
        products: mockProducts,
        onSupplierCreated,
        onProductCreated,
        onCancel,
      })
    );

    await act(async () => {
      await result.current.actions.handleItemProductSelect(0, 101);
    });

    expect(result.current.state.items[0].producto_id).toBe(101);
    expect(result.current.state.items[0].producto_nombre).toBe("Ron Santa Teresa 1996");
    expect(result.current.state.items[0].unidades_por_caja).toBe(6);
    expect(result.current.computed.resolvedCount).toBe(1);
    expect(result.current.computed.allAccepted).toBe(false);

    await act(async () => {
      await result.current.actions.handleItemProductSelect(1, 102);
    });

    expect(result.current.computed.resolvedCount).toBe(2);
    expect(result.current.computed.allAccepted).toBe(true);

    // Test deselecting a product
    await act(async () => {
      await result.current.actions.handleItemProductSelect(0, null);
    });

    expect(result.current.state.items[0].producto_id).toBeNull();
    expect(result.current.state.items[0].producto_nombre).toBe("");
    expect(result.current.computed.resolvedCount).toBe(1);
    expect(result.current.computed.allAccepted).toBe(false);
  });

  it("handles item field updates", () => {
    const { result } = renderHook(() =>
      useAIReviewState({
        aiAnalysis: mockAnalysis,
        products: mockProducts,
        onSupplierCreated,
        onProductCreated,
        onCancel,
      })
    );

    act(() => {
      result.current.actions.handleUpdateItem(0, "cantidad", 10);
      result.current.actions.handleUpdateItem(0, "costo", 42.5);
    });

    expect(result.current.state.items[0].cantidad).toBe(10);
    expect(result.current.state.items[0].costo).toBe(42.5);
  });

  it("handles toggling empaque and sets unidades_por_caja if CAJA selected with product", async () => {
    const { result } = renderHook(() =>
      useAIReviewState({
        aiAnalysis: mockAnalysis,
        products: mockProducts,
        onSupplierCreated,
        onProductCreated,
        onCancel,
      })
    );

    await act(async () => {
      await result.current.actions.handleItemProductSelect(0, 101);
    });

    await act(async () => {
      await result.current.actions.handleToggleEmpaque(0, "CAJA");
    });

    expect(result.current.state.items[0].tipo_empaque).toBe("CAJA");
    expect(result.current.state.items[0].unidades_por_caja).toBe(6);
  });

  it("handles creating supplier and creating product callbacks", () => {
    const { result } = renderHook(() =>
      useAIReviewState({
        aiAnalysis: mockAnalysis,
        products: mockProducts,
        onSupplierCreated,
        onProductCreated,
        onCancel,
      })
    );

    const newSupplier: SupplierOut = {
      id: 50,
      nombre: "Nuevo Proveedor Express",
      telefono: "0412-0000000",
      email: "proveedor@test.com",
    };

    act(() => {
      result.current.actions.handleSupplierCreated(newSupplier);
    });

    expect(result.current.state.proveedorNombre).toBe("Nuevo Proveedor Express");
    expect(result.current.state.proveedorId).toBe(50);
    expect(onSupplierCreated).toHaveBeenCalledWith(newSupplier);

    // Product creation modal flow
    act(() => {
      result.current.state.setProductModalNombre("Ron Santa Teresa 1996");
    });

    const newProduct: ProductOut = {
      id: 202,
      codigo_barra: "7590000000001",
      nombre: "Ron Santa Teresa 1996 Especial",
      categories: [],
      unidades_por_caja: 12,
      stock_cajas: 0,
      stock_unidades: 20,
      stock_minimo: 5,
      precio_costo_caja_usd: 420,
      precio_costo_usd: 35,
      precio_unidad_usd: 50,
      precio_caja_usd: 600,
      precio_sugerido_unidad_usd: 50,
      precio_sugerido_caja_usd: 600,
      proveedor_id: 50,
      tipo_iva: "GRAVADO",
      es_favorito: false,
      precio_divisas_unidad: null,
      precio_divisas_caja: null,
    };

    act(() => {
      result.current.actions.handleProductCreated(newProduct);
    });

    expect(onProductCreated).toHaveBeenCalledWith(newProduct);
    expect(result.current.state.items[0].producto_id).toBe(202);
    expect(result.current.state.items[0].producto_nombre).toBe("Ron Santa Teresa 1996 Especial");
    expect(result.current.state.items[0].unidades_por_caja).toBe(12);
  });

  it("handles accept all when all products are resolved", async () => {
    const { result } = renderHook(() =>
      useAIReviewState({
        aiAnalysis: mockAnalysis,
        products: mockProducts,
        onSupplierCreated,
        onProductCreated,
        onCancel,
      })
    );

    await act(async () => {
      await result.current.actions.handleItemProductSelect(0, 101);
      await result.current.actions.handleItemProductSelect(1, 102);
    });

    act(() => {
      result.current.actions.handleAcceptAll();
    });

    const formState = useInvoiceFormStore.getState();
    expect(formState.moneda).toBe("USD");
    expect(formState.tipoDocumento).toBe("FACTURA");
    expect(formState.numeroFactura).toBe("FAC-9988");
    expect(formState.fechaFactura).toBe("2026-03-15");
    expect(formState.lineItems).toHaveLength(2);
    expect(formState.lineItems[0].producto_id).toBe(101);
    expect(formState.lineItems[1].producto_id).toBe(102);
    expect(onCancel).toHaveBeenCalled();
  });
});
