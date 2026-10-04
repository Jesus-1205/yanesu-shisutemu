import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInvoicePaymentCalculations } from "@/features/invoices/hooks/useInvoicePaymentCalculations";
import type { FacturaOut, PaymentMethodOut } from "@/types/api";

const mockInvoice: FacturaOut = {
  id: 1,
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

const mockMethods: PaymentMethodOut[] = [
  { id: 1, nombre: "Divisas", moneda_default: "USD", activo: true, acepta_referencia: false },
  { id: 2, nombre: "Pago Móvil", moneda_default: "VES", activo: true, acepta_referencia: true },
];

describe("useInvoicePaymentCalculations", () => {
  it("calculates values in USD payment method", () => {
    const { result } = renderHook(() =>
      useInvoicePaymentCalculations({
        invoice: mockInvoice,
        paymentSummary: null,
        methods: mockMethods,
        selectedMethodId: 1,
        monto: "50",
        incluirMora: false,
        tasaBs: 100,
      }),
    );

    expect(result.current.payInUsd).toBe(true);
    expect(result.current.montoUsd).toBe(50);
    expect(result.current.montoBs).toBe(5000);
    expect(result.current.saldoRestanteUsd).toBe(50);
    expect(result.current.saldoRestanteBs).toBe(5000);
    expect(result.current.excedeSaldo).toBe(false);
    expect(result.current.isValid).toBe(true);
  });

  it("calculates values in VES payment method", () => {
    const { result } = renderHook(() =>
      useInvoicePaymentCalculations({
        invoice: mockInvoice,
        paymentSummary: null,
        methods: mockMethods,
        selectedMethodId: 2,
        monto: "5000",
        incluirMora: false,
        tasaBs: 100,
      }),
    );

    expect(result.current.payInUsd).toBe(false);
    expect(result.current.montoUsd).toBe(50);
    expect(result.current.montoBs).toBe(5000);
    expect(result.current.saldoRestanteUsd).toBe(50);
    expect(result.current.saldoRestanteBs).toBe(5000);
    expect(result.current.excedeSaldo).toBe(false);
    expect(result.current.isValid).toBe(true);
  });

  it("flags excedeSaldo when amount exceeds pending balance", () => {
    const { result } = renderHook(() =>
      useInvoicePaymentCalculations({
        invoice: mockInvoice,
        paymentSummary: null,
        methods: mockMethods,
        selectedMethodId: 1,
        monto: "150",
        incluirMora: false,
        tasaBs: 100,
      }),
    );

    expect(result.current.excedeSaldo).toBe(true);
    expect(result.current.isValid).toBe(false);
  });
});
