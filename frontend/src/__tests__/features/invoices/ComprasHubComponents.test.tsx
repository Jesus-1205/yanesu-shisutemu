import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComprasHubStats from "@/features/invoices/components/ComprasHubStats";
import ComprasHubPendingInvoices from "@/features/invoices/components/ComprasHubPendingInvoices";
import ComprasHubTopSuppliers from "@/features/invoices/components/ComprasHubTopSuppliers";
import type { FacturaOut, TopSupplier } from "@/types/api";

const mockPendingSummary = {
  total_pendiente_usd: 1250.75,
  total_facturas_pendientes: 7,
};

const mockStats = {
  pendientes: 5,
  parciales: 2,
  pagadas: 18,
  total: 25,
};

const mockSuppliers: TopSupplier[] = [
  { supplier_id: 10, supplier_name: "Empresas Polar", invoice_count: 15 },
  { supplier_id: 20, supplier_name: "Alimentos Heinz", invoice_count: 7 },
];

const mockInvoices: FacturaOut[] = [
  {
    id: 101,
    proveedor_id: 10,
    numero_factura: "FAC-101",
    tipo_documento: "FACTURA",
    fecha_factura: "2026-08-10",
    image_path: null,
    usuario_id: 1,
    observaciones: null,
    moneda_principal: "USD",
    tasa_bs: 750,
    total_usd: 500,
    total_bs: 375000,
    aplica_iva: true,
    estado_pago: "PENDIENTE",
    created_at: "2026-08-10T12:00:00",
    procesada_por_ia: false,
    raw_json_ia: null,
    total_pagado_usd: 0,
    total_pagado_bs: 0,
    saldo_pendiente_usd: 500,
    saldo_pendiente_bs: 375000,
    porcentaje_pagado: 0,
    supplier: { id: 10, nombre: "Empresas Polar", telefono: null, email: null },
    detalles: [],
    obsequios: [],
    fecha_limite_pago: "2026-08-25",
  },
];

describe("ComprasHubStats", () => {
  it("renders pending amount, paid invoices, due in 7 days, and supplier count", () => {
    render(
      <ComprasHubStats
        pending={mockPendingSummary}
        stats={mockStats}
        upcomingDueCount={3}
      />,
    );

    expect(screen.getByText("Total Pendiente (USD)")).toBeInTheDocument();
    expect(screen.getByText("$1.250,75")).toBeInTheDocument();
    expect(screen.getByText("Facturas Pagadas")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Por Vencer (7 días)")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("handles null pending and stats gracefully", () => {
    render(
      <ComprasHubStats
        pending={null}
        stats={null}
        upcomingDueCount={0}
      />,
    );

    expect(screen.getByText("$0,00")).toBeInTheDocument();
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});

describe("ComprasHubPendingInvoices", () => {
  it("renders empty state when there are no invoices", () => {
    render(
      <ComprasHubPendingInvoices
        invoices={[]}
        onViewAll={vi.fn()}
        onViewInvoice={vi.fn()}
      />,
    );

    expect(screen.getByText("No hay facturas pendientes por vencer")).toBeInTheDocument();
  });

  it("renders invoice cards and calls callbacks", () => {
    const handleViewAll = vi.fn();
    const handleViewInvoice = vi.fn();
    const handlePayInvoice = vi.fn();

    render(
      <ComprasHubPendingInvoices
        invoices={mockInvoices}
        onViewAll={handleViewAll}
        onViewInvoice={handleViewInvoice}
        onPayInvoice={handlePayInvoice}
      />,
    );

    expect(screen.getByText("FAC-101")).toBeInTheDocument();

    const viewAllBtn = screen.getByRole("button", { name: /Ver todas/i });
    fireEvent.click(viewAllBtn);
    expect(handleViewAll).toHaveBeenCalledTimes(1);
  });
});

describe("ComprasHubTopSuppliers", () => {
  it("renders empty state when there are no suppliers", () => {
    render(
      <ComprasHubTopSuppliers
        suppliers={[]}
        onViewAll={vi.fn()}
        onSelectSupplier={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay proveedores con compras registradas"),
    ).toBeInTheDocument();
  });

  it("renders suppliers table and calls callbacks on click", () => {
    const handleViewAll = vi.fn();
    const handleSelectSupplier = vi.fn();

    render(
      <ComprasHubTopSuppliers
        suppliers={mockSuppliers}
        onViewAll={handleViewAll}
        onSelectSupplier={handleSelectSupplier}
      />,
    );

    expect(screen.getByText("Empresas Polar")).toBeInTheDocument();
    expect(screen.getByText("Alimentos Heinz")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();

    const polarRow = screen.getByText("Empresas Polar").closest("tr");
    expect(polarRow).not.toBeNull();
    fireEvent.click(polarRow!);
    expect(handleSelectSupplier).toHaveBeenCalledWith(10);

    const viewAllBtn = screen.getByRole("button", { name: /Ver todos/i });
    fireEvent.click(viewAllBtn);
    expect(handleViewAll).toHaveBeenCalledTimes(1);
  });
});
