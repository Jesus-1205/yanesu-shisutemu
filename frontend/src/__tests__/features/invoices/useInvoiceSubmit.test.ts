import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInvoiceSubmit } from "@/features/invoices/hooks/useInvoiceSubmit";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import { api } from "@/services/api";
import type { FacturaOut } from "@/types/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    createInvoice: vi.fn(),
  },
}));

describe("useInvoiceSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
  });

  it("validates empty supplier, invoice number, tasa, or line items", async () => {
    const { result } = renderHook(() => useInvoiceSubmit({ aiRawJsonIa: null }));

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(mockToast).toHaveBeenCalledWith("Selecciona un proveedor", "error");

    act(() => {
      useInvoiceFormStore.getState().setField("proveedorId", 1);
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(mockToast).toHaveBeenCalledWith("Ingresa el número de factura", "error");

    act(() => {
      useInvoiceFormStore.getState().setField("numeroFactura", "FAC-123");
      useInvoiceFormStore.getState().setField("tasa", "0");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(mockToast).toHaveBeenCalledWith("Ingresa la tasa de cambio", "error");

    act(() => {
      useInvoiceFormStore.getState().setField("tasa", "750");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(mockToast).toHaveBeenCalledWith("Agrega al menos un producto a la factura", "error");
  });

  it("submits valid invoice and redirects on success", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useInvoiceSubmit({
        aiRawJsonIa: { ai: true },
        onSuccess,
      }),
    );

    act(() => {
      useInvoiceFormStore.getState().setField("proveedorId", 2);
      useInvoiceFormStore.getState().setField("numeroFactura", "FAC-777");
      useInvoiceFormStore.getState().setField("tasa", "750");
      useInvoiceFormStore.getState().addLineItem({
        producto_id: 10,
        nombre: "Cacique 500",
        codigo_barra: null,
        tipo_empaque: "UNIDAD",
        cantidad: 1,
        unidades_por_caja: 1,
        costo_ingresado: 20,
        moneda_ingreso: "USD",
        tipo_iva: "GRAVADO",
      });
    });

    vi.mocked(api.createInvoice).mockResolvedValue({
      id: 55,
      numero_factura: "FAC-777",
    } as unknown as FacturaOut);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(api.createInvoice).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Factura #FAC-777 registrada con éxito", "success");
    expect(onSuccess).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/invoices/55");
  });
});
