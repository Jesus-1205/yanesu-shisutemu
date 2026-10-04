import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { api } from "@/services/api";
import { usePaymentDrawer } from "@/features/invoices/hooks/usePaymentDrawer";
import type { FacturaOut, InvoicePaymentOut, PaymentMethodOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
    registerInvoicePayment: vi.fn(),
  },
}));

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockMethods: PaymentMethodOut[] = [
  { id: 1, nombre: "Efectivo USD", moneda_default: "USD", activo: true, acepta_referencia: false },
  { id: 2, nombre: "Pago Móvil", moneda_default: "VES", activo: true, acepta_referencia: true },
];

const mockInvoiceUsd: FacturaOut = {
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
  total_usd: 150,
  total_bs: 15000,
  aplica_iva: true,
  estado_pago: "PENDIENTE",
  fecha_limite_pago: null,
  created_at: "2026-08-20T00:00:00Z",
  total_pagado_usd: 0,
  total_pagado_bs: 0,
  saldo_pendiente_usd: 150,
  saldo_pendiente_bs: 15000,
  porcentaje_pagado: 0,
  supplier: { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null },
  detalles: [],
  obsequios: [],
};

const mockInvoiceBs: FacturaOut = {
  ...mockInvoiceUsd,
  id: 11,
  moneda_principal: "BS",
  total_usd: 50,
  total_bs: 5000,
};

const mockPaymentResponse: InvoicePaymentOut = {
  id: 1,
  factura_id: 10,
  metodo_pago_id: 2,
  metodo_pago_nombre: "Pago Móvil",
  monto_usd: 100,
  monto_bs: 0,
  tasa_bs: 100,
  monto_mora: 0,
  referencia: "REF-12345",
  observaciones: "Pago parcial",
  fecha_pago: "2026-08-20T00:00:00Z",
  usuario_id: 1,
  usuario_nombre: "Admin",
  comprobantes: [],
};

describe("usePaymentDrawer", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getPaymentMethods).mockResolvedValue(mockMethods);
    vi.mocked(api.registerInvoicePayment).mockResolvedValue(mockPaymentResponse);
  });

  it("initializes state when open=true and fetches payment methods", async () => {
    const { result } = renderHook(() =>
      usePaymentDrawer({
        open: true,
        onClose,
        invoice: mockInvoiceUsd,
        onSuccess,
      })
    );

    expect(result.current.monto).toBe("150");
    expect(result.current.prefix).toBe("$");
    expect(result.current.isBs).toBe(false);
    expect(result.current.saldoPendiente).toBe(150);

    await waitFor(() => {
      expect(result.current.methods).toEqual(mockMethods);
    });
  });

  it("handles BS currency invoice properly", async () => {
    const { result } = renderHook(() =>
      usePaymentDrawer({
        open: true,
        onClose,
        invoice: mockInvoiceBs,
        onSuccess,
      })
    );

    expect(result.current.monto).toBe("5000");
    expect(result.current.prefix).toBe("Bs.");
    expect(result.current.isBs).toBe(true);
    expect(result.current.saldoPendiente).toBe(5000);

    await waitFor(() => expect(result.current.methods.length).toBe(2));
  });

  it("validates payment amount and selected method correctly", async () => {
    const { result } = renderHook(() =>
      usePaymentDrawer({
        open: true,
        onClose,
        invoice: mockInvoiceUsd,
        onSuccess,
      })
    );

    await waitFor(() => expect(result.current.methods.length).toBe(2));

    expect(result.current.isValid).toBe(false); // selectedMethodId is null

    act(() => {
      result.current.setSelectedMethodId(1);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.excedeSaldo).toBe(false);

    // Test exceeding balance
    act(() => {
      result.current.setMonto("200");
    });
    expect(result.current.excedeSaldo).toBe(true);
    expect(result.current.isValid).toBe(false);

    // Test invalid 0 or negative amount
    act(() => {
      result.current.setMonto("0");
    });
    expect(result.current.isValid).toBe(false);
  });

  it("submits payment successfully and calls onSuccess and onClose", async () => {
    const { result } = renderHook(() =>
      usePaymentDrawer({
        open: true,
        onClose,
        invoice: mockInvoiceUsd,
        onSuccess,
      })
    );

    await waitFor(() => expect(result.current.methods.length).toBe(2));

    act(() => {
      result.current.setSelectedMethodId(2);
      result.current.setMonto("100");
      result.current.setReferencia("REF-12345");
      result.current.setObservaciones("Pago parcial");
    });

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(api.registerInvoicePayment).toHaveBeenCalledWith(
      10,
      {
        metodo_pago_id: 2,
        monto_usd: 100,
        monto_bs: 0,
        referencia: "REF-12345",
        observaciones: "Pago parcial",
      },
      undefined
    );

    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining("Pago de $ 100,00 registrado"), "success");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles error during payment registration", async () => {
    vi.mocked(api.registerInvoicePayment).mockRejectedValue(new Error("Database write failure"));

    const { result } = renderHook(() =>
      usePaymentDrawer({
        open: true,
        onClose,
        invoice: mockInvoiceUsd,
        onSuccess,
      })
    );

    await waitFor(() => expect(result.current.methods.length).toBe(2));

    act(() => {
      result.current.setSelectedMethodId(1);
    });

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(mockToast).toHaveBeenCalledWith("Database write failure", "error");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });
});
