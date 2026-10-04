import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PaymentDrawerSummary from "@/features/invoices/components/PaymentDrawerSummary";
import PaymentDrawerMethodGrid from "@/features/invoices/components/PaymentDrawerMethodGrid";
import type { FacturaOut, PaymentMethodOut } from "@/types/api";

const mockInvoice: FacturaOut = {
  id: 1,
  proveedor_id: 1,
  numero_factura: "INV-999",
  tipo_documento: "FACTURA",
  fecha_factura: "2026-08-20",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  moneda_principal: "USD",
  tasa_bs: 100,
  total_usd: 500,
  total_bs: 50000,
  aplica_iva: true,
  estado_pago: "PARCIALMENTE_PAGADA",
  fecha_limite_pago: null,
  created_at: "2026-08-20T00:00:00Z",
  total_pagado_usd: 300,
  total_pagado_bs: 30000,
  saldo_pendiente_usd: 200,
  saldo_pendiente_bs: 20000,
  porcentaje_pagado: 60,
  supplier: { id: 1, nombre: "Cervecería Polar", telefono: null, email: null },
  detalles: [],
  obsequios: [],
};

describe("PaymentDrawerSummary", () => {
  it("renders invoice information and amounts correctly for USD", () => {
    render(
      <PaymentDrawerSummary
        invoice={mockInvoice}
        isBs={false}
        prefix="$"
        saldoPendiente={200}
      />
    );

    expect(screen.getByText("Factura #INV-999")).toBeInTheDocument();
    expect(screen.getByText("Cervecería Polar")).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText(/500,00/)).toBeInTheDocument();
    expect(screen.getByText(/Pagado:/)).toBeInTheDocument();
    expect(screen.getByText(/300,00/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo:/)).toBeInTheDocument();
    expect(screen.getByText(/200,00/)).toBeInTheDocument();
  });

  it("renders amounts correctly for BS", () => {
    const mockInvoiceBs = { ...mockInvoice, moneda_principal: "BS" as const };
    render(
      <PaymentDrawerSummary
        invoice={mockInvoiceBs}
        isBs={true}
        prefix="Bs."
        saldoPendiente={10000}
      />
    );

    expect(screen.getByText(/50\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/40\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/10\.000,00/)).toBeInTheDocument();
  });
});

describe("PaymentDrawerMethodGrid", () => {
  const mockMethods: PaymentMethodOut[] = [
    { id: 1, nombre: "Efectivo USD", moneda_default: "USD", activo: true, acepta_referencia: false },
    { id: 2, nombre: "Pago Móvil", moneda_default: "VES", activo: true, acepta_referencia: true },
  ];

  it("renders payment methods and calls onSelectMethod on click", () => {
    const onSelectMethod = vi.fn();
    render(
      <PaymentDrawerMethodGrid
        methods={mockMethods}
        selectedMethodId={1}
        onSelectMethod={onSelectMethod}
      />
    );

    expect(screen.getByText("Efectivo USD")).toBeInTheDocument();
    expect(screen.getByText("Pago Móvil")).toBeInTheDocument();

    const pagoMovilBtn = screen.getByText("Pago Móvil").closest("button");
    expect(pagoMovilBtn).toBeInTheDocument();
    fireEvent.click(pagoMovilBtn!);

    expect(onSelectMethod).toHaveBeenCalledWith(2);
  });
});
