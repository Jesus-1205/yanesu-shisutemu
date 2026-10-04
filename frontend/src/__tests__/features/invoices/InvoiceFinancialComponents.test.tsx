import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import InvoiceLedger from "../../../features/invoices/components/InvoiceLedger";
import InvoicePaymentStatus from "../../../features/invoices/components/InvoicePaymentStatus";
import InvoiceFinancialCards from "../../../features/invoices/components/InvoiceFinancialCards";
import InvoiceFiscalSummary from "../../../features/invoices/components/InvoiceFiscalSummary";
import InvoiceLineItemsTable from "../../../features/invoices/components/InvoiceLineItemsTable";
import PaymentDrawer from "../../../features/invoices/components/PaymentDrawer";
import { ToastProvider } from "../../../ui-components/Toast";
import { api } from "../../../services/api";
import type { FacturaOut as Invoice, InvoicePaymentOut, InvoicePaymentSummary, ProductOut } from "../../../types/api";

const mockProductCaja: ProductOut = {
  id: 1,
  codigo_barra: "111",
  nombre: "Cerveza Caja",
  categories: [],
  unidades_por_caja: 24,
  stock_cajas: 10,
  stock_unidades: 240,
  stock_minimo: 5,
  precio_costo_caja_usd: 40,
  precio_costo_usd: 1.66,
  precio_unidad_usd: 2.5,
  precio_caja_usd: 50,
  precio_sugerido_unidad_usd: 2.5,
  precio_sugerido_caja_usd: 50,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

const mockProductUnidad: ProductOut = {
  id: 2,
  codigo_barra: "222",
  nombre: "Malta Unidad",
  categories: [],
  unidades_por_caja: 1,
  stock_cajas: 0,
  stock_unidades: 50,
  stock_minimo: 5,
  precio_costo_caja_usd: 1.242,
  precio_costo_usd: 1.242,
  precio_unidad_usd: 2,
  precio_caja_usd: 2,
  precio_sugerido_unidad_usd: 2,
  precio_sugerido_caja_usd: 2,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

const mockInvoice: Invoice = {
  id: 10,
  numero_factura: "FAC-00123",
  proveedor_id: 1,
  supplier: { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null },
  tipo_documento: "FACTURA",
  moneda_principal: "USD",
  tasa_bs: 45.0,
  total_usd: 100.0,
  total_bs: 4500.0,
  aplica_iva: true,
  estado_pago: "PARCIALMENTE_PAGADA",
  fecha_limite_pago: "2026-09-20",
  created_at: "2026-09-10T10:00:00",
  fecha_factura: "2026-09-10",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  total_pagado_usd: 50.0,
  total_pagado_bs: 2250.0,
  saldo_pendiente_usd: 50.0,
  saldo_pendiente_bs: 2250.0,
  porcentaje_pagado: 50.0,
  detalles: [
    {
      id: 101,
      factura_id: 10,
      producto_id: 1,
      product: mockProductCaja,
      tipo_empaque: "CAJA",
      cantidad: 2,
      costo_unitario_usd: 40.0,
      costo_unitario_bs: 1800.0,
      tipo_iva: "GRAVADO",
    },
    {
      id: 102,
      factura_id: 10,
      producto_id: 2,
      product: mockProductUnidad,
      tipo_empaque: "UNIDAD",
      cantidad: 5,
      costo_unitario_usd: 1.242,
      costo_unitario_bs: 55.89,
      tipo_iva: "GRAVADO",
    },
  ],
  obsequios: [],
};

const mockPayments: InvoicePaymentOut[] = [
  {
    id: 1,
    factura_id: 10,
    metodo_pago_id: 1,
    metodo_pago_nombre: "Transferencia Banesco",
    monto_usd: 50.0,
    monto_bs: 2250.0,
    tasa_bs: 45.0,
    monto_mora: 0,
    usuario_id: 1,
    referencia: "REF123456",
    observaciones: "Primer abono acordado",
    fecha_pago: "2026-09-11T12:00:00",
    comprobantes: [
      {
        id: 99,
        pago_id: 1,
        archivo_path: "/receipts/comprobante.pdf",
        nombre_original: "comprobante.pdf",
        tipo_archivo: "application/pdf",
        created_at: "2026-09-11T12:00:00",
      },
    ],
  },
];

const mockPaymentSummary: InvoicePaymentSummary = {
  estado_pago: "PARCIALMENTE_PAGADA",
  cantidad_pagos: 1,
  total_factura_usd: 100.0,
  total_factura_bs: 4500.0,
  total_pagado_usd: 50.0,
  total_pagado_bs: 2250.0,
  saldo_pendiente_usd: 50.0,
  saldo_pendiente_bs: 2250.0,
  porcentaje_pagado: 50.0,
  diferencia_cambiaria_bs: 150.0,
  total_mora_bs: 50.0,
};

describe("InvoiceLedger", () => {
  it("renders nothing if payments array is empty", () => {
    const { container } = render(<InvoiceLedger payments={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders payment details in table format, expands observation and handles onViewReceipt", () => {
    const onViewReceipt = vi.fn();
    render(<InvoiceLedger payments={mockPayments} onViewReceipt={onViewReceipt} />);

    expect(screen.getByText("Historial de Pagos")).toBeInTheDocument();
    expect(screen.getByText("Transferencia Banesco")).toBeInTheDocument();
    expect(screen.getByText("REF123456")).toBeInTheDocument();
    expect(screen.getByText("Primer abono acordado")).toBeInTheDocument();

    const obsBtn = screen.getByTitle("Click para expandir");
    fireEvent.click(obsBtn);
    expect(screen.getByTitle("Click para contraer")).toBeInTheDocument();

    const viewReceiptBtn = screen.getByRole("button", { name: /Ver/i });
    fireEvent.click(viewReceiptBtn);
    expect(onViewReceipt).toHaveBeenCalledWith(mockPayments[0].id, mockPayments[0].comprobantes[0].id);
  });
});

describe("InvoicePaymentStatus", () => {
  it("renders progress, amounts, status badge, mora and exchange rate diff", () => {
    render(
      <MemoryRouter>
        <InvoicePaymentStatus
          invoice={mockInvoice}
          paymentSummary={mockPaymentSummary}
          invoiceId="10"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("50% pagado")).toBeInTheDocument();
    expect(screen.getByText("$50,00 pendiente")).toBeInTheDocument();
    expect(screen.getByText("Parcial")).toBeInTheDocument();
    expect(screen.getByText("Diferencia cambiaria")).toBeInTheDocument();
    expect(screen.getByText("Mora")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar Pago/i })).toBeInTheDocument();
  });

  it("hides 'Registrar Pago' button if invoice is PAGADA", () => {
    const paidInvoice = { ...mockInvoice, estado_pago: "PAGADA" as const };
    const paidSummary: InvoicePaymentSummary = {
      ...mockPaymentSummary,
      estado_pago: "PAGADA",
      porcentaje_pagado: 100,
      saldo_pendiente_usd: 0,
      saldo_pendiente_bs: 0,
    };

    render(
      <MemoryRouter>
        <InvoicePaymentStatus
          invoice={paidInvoice}
          paymentSummary={paidSummary}
          invoiceId="10"
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /Registrar Pago/i })).not.toBeInTheDocument();
    expect(screen.getByText("Pagada")).toBeInTheDocument();
  });
});

describe("InvoiceFinancialCards", () => {
  it("renders USD as principal and BS as auto-calculated for USD invoices", () => {
    render(
      <InvoiceFinancialCards
        invoice={mockInvoice}
        totalPrincipal={100.0}
        totalSecundario={4500.0}
      />,
    );

    expect(screen.getByText("PRINCIPAL")).toBeInTheDocument();
    expect(screen.getByText("AUTO-CALC")).toBeInTheDocument();
    expect(screen.getByText("$100,00")).toBeInTheDocument();
    expect(screen.getByText("Bs. 4.500,00")).toBeInTheDocument();
  });

  it("renders BS as principal and USD as auto-calculated for BS invoices", () => {
    const bsInvoice = { ...mockInvoice, moneda_principal: "BS" as const };
    render(
      <InvoiceFinancialCards
        invoice={bsInvoice}
        totalPrincipal={4500.0}
        totalSecundario={100.0}
      />,
    );

    expect(screen.getByText("$100,00")).toBeInTheDocument();
    expect(screen.getByText("Bs. 4.500,00")).toBeInTheDocument();
  });
});

describe("InvoiceFiscalSummary", () => {
  it("renders fiscal breakdowns correctly", () => {
    render(
      <InvoiceFiscalSummary
        invoice={mockInvoice}
        resumen={{ exento: 0, base_imponible: 86.21, iva: 13.79, total: 100.0 }}
        totalPrincipal={100.0}
        totalSecundario={4500.0}
      />,
    );

    expect(screen.getByText("Resumen Fiscal y Total")).toBeInTheDocument();
    expect(screen.getByText("$86,21")).toBeInTheDocument();
    expect(screen.getByText("$13,79")).toBeInTheDocument();
    expect(screen.getByText("$100,00")).toBeInTheDocument();
    expect(screen.getByText("Bs. 4.500,00")).toBeInTheDocument();
  });
});

describe("InvoiceLineItemsTable", () => {
  it("renders table with items, packaging badges and totals footer", () => {
    render(
      <InvoiceLineItemsTable
        invoice={mockInvoice}
        totalPrincipal={100.0}
        totalSecundario={4500.0}
        nTasa={45.0}
      />,
    );

    expect(screen.getByText("Cerveza Caja")).toBeInTheDocument();
    expect(screen.getByText("Malta Unidad")).toBeInTheDocument();
    expect(screen.getByText("2 cajas")).toBeInTheDocument();
    expect(screen.getByText("53 unds")).toBeInTheDocument();
  });
});

describe("PaymentDrawer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue([
      { id: 1, nombre: "Zelle", acepta_referencia: true, moneda_default: "USD", activo: true },
    ]);
  });

  it("submits payment successfully and calls onSuccess", async () => {
    const paySpy = vi.spyOn(api, "registerInvoicePayment").mockResolvedValue(mockPayments[0]);
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <ToastProvider>
        <PaymentDrawer
          open={true}
          invoice={mockInvoice}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Zelle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Zelle"));

    const submitBtn = screen.getByRole("button", { name: "Registrar Pago" });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(paySpy).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          metodo_pago_id: 1,
          monto_usd: 100,
        }),
        undefined,
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error and disables submit when amount exceeds remaining balance", async () => {
    render(
      <ToastProvider>
        <PaymentDrawer
          open={true}
          invoice={mockInvoice}
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Zelle")).toBeInTheDocument();
    });

    const amountInput = screen.getByDisplayValue("100");
    fireEvent.change(amountInput, { target: { value: "150" } });

    expect(screen.getByText("El monto excede el saldo pendiente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar Pago" })).toBeDisabled();
  });
});
