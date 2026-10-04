import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { api } from "@/services/api";
import { usePaymentFormStore } from "@/features/invoices/store/paymentFormStore";
import { useInvoicePaymentSubmit } from "@/features/invoices/hooks/useInvoicePaymentSubmit";
import type { FacturaOut } from "@/types/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/services/api", () => ({
  api: {
    registerInvoicePayment: vi.fn(),
  },
}));

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockApi = vi.mocked(api);

const mockInvoice: FacturaOut = {
  id: 10,
  proveedor_id: 1,
  numero_factura: "INV-001",
  tipo_documento: "FACTURA",
  fecha_factura: "2026-08-20",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  moneda_principal: "USD",
  tasa_bs: 100,
  total_usd: 100,
  total_bs: 10000,
  aplica_iva: true,
  estado_pago: "PENDIENTE",
  created_at: "2026-08-20T12:00:00",
  procesada_por_ia: false,
  raw_json_ia: null,
  total_pagado_usd: 0,
  total_pagado_bs: 0,
  saldo_pendiente_usd: 100,
  saldo_pendiente_bs: 10000,
  porcentaje_pagado: 0,
  supplier: { id: 1, nombre: "Proveedor", telefono: null, email: null },
  detalles: [],
  obsequios: [],
  fecha_limite_pago: null,
};

describe("useInvoicePaymentSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePaymentFormStore.getState().reset();
  });

  it("submits payment and navigates on success", async () => {
    usePaymentFormStore.getState().setField("selectedMethodId", 1);
    mockApi.registerInvoicePayment.mockResolvedValue({} as any);

    const { result } = renderHook(() =>
      useInvoicePaymentSubmit({
        invoice: mockInvoice,
        isValid: true,
        montoUsd: 50,
        montoBs: 5000,
        montoNum: 50,
        montoMoraBs: 0,
        montoPagoBs: 5000,
        payInUsd: true,
        tasaBs: 100,
        id: "10",
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.registerInvoicePayment).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        metodo_pago_id: 1,
        monto_usd: 50,
        monto_bs: 5000,
      }),
      undefined,
    );
    expect(mockToast).toHaveBeenCalledWith("Pago de $50,00 registrado", "success");
    expect(mockNavigate).toHaveBeenCalledWith("/invoices/10");
  });

  it("handles errors gracefully", async () => {
    usePaymentFormStore.getState().setField("selectedMethodId", 1);
    mockApi.registerInvoicePayment.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() =>
      useInvoicePaymentSubmit({
        invoice: mockInvoice,
        isValid: true,
        montoUsd: 50,
        montoBs: 5000,
        montoNum: 50,
        montoMoraBs: 0,
        montoPagoBs: 5000,
        payInUsd: true,
        tasaBs: 100,
        id: "10",
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.submitError).toBe("API Error");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
