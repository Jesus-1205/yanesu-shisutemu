import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PaymentModal from "@/features/invoices/components/PaymentModal";
import type { FacturaOut, InvoicePaymentSummary } from "@/types/api";

// ─── Mock API ──────────────────────────────────────────────────────────────
vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
    registerInvoicePayment: vi.fn(),
  },
}));

// ─── Mock Toast ────────────────────────────────────────────────────────────
const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────
import { api } from "@/services/api";

// ─── Test Data ────────────────────────────────────────────────────────────

const baseInvoice: FacturaOut = {
  id: 1,
  proveedor_id: 1,
  numero_factura: "001-00012345",
  tipo_documento: "FACTURA",
  fecha_factura: "2026-08-20",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  moneda_principal: "USD",
  tasa_bs: 750,
  total_usd: 100,
  total_bs: 75000,
  aplica_iva: true,
  estado_pago: "PENDIENTE",
  created_at: "2026-08-20T12:00:00",
  procesada_por_ia: false,
  raw_json_ia: null,
  supplier: { id: 1, nombre: "Proveedor A", telefono: null, email: null },
  detalles: [],
  obsequios: [],
  fecha_limite_pago: null,
};

const bsInvoice: FacturaOut = {
  ...baseInvoice,
  moneda_principal: "BS",
  total_bs: 112000,
  total_usd: 149.33,
};

const mockPaymentSummary: InvoicePaymentSummary = {
  estado_pago: "PARCIALMENTE_PAGADA",
  total_factura_usd: 100,
  total_factura_bs: 75000,
  total_pagado_usd: 30,
  total_pagado_bs: 22500,
  saldo_pendiente_usd: 70,
  saldo_pendiente_bs: 52500,
  cantidad_pagos: 1,
  porcentaje_pagado: 30,
};

const mockPaymentSummaryBS: InvoicePaymentSummary = {
  estado_pago: "PARCIALMENTE_PAGADA",
  total_factura_usd: 149.33,
  total_factura_bs: 112000,
  total_pagado_usd: 0,
  total_pagado_bs: 20000,
  saldo_pendiente_usd: 149.33,
  saldo_pendiente_bs: 92000,
  cantidad_pagos: 1,
  porcentaje_pagado: 17.86,
};

const mockPaymentMethods = [
  { id: 1, nombre: "Transferencia", moneda_default: "USD", activo: true, acepta_referencia: true },
  { id: 2, nombre: "Efectivo", moneda_default: "BS", activo: true, acepta_referencia: false },
  { id: 3, nombre: "Inactivo", moneda_default: "USD", activo: false, acepta_referencia: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderModal(
  overrides: {
    invoice?: FacturaOut;
    paymentSummary?: InvoicePaymentSummary | null;
    open?: boolean;
    onSuccess?: () => void;
    onClose?: () => void;
  } = {},
) {
  const defaultProps = {
    open: overrides.open ?? true,
    onClose: overrides.onClose ?? vi.fn(),
    invoice: overrides.invoice ?? baseInvoice,
    paymentSummary: overrides.paymentSummary ?? mockPaymentSummary,
    onSuccess: overrides.onSuccess ?? vi.fn(),
  };
  return {
    ...render(<PaymentModal {...defaultProps} />),
    ...defaultProps,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("PaymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getPaymentMethods as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPaymentMethods,
    );
  });

  // ── Rendering ─────────────────────────────────────────────────────

  it("renders the modal with invoice summary", () => {
    renderModal();
    expect(screen.getByText("Registrar Pago")).toBeInTheDocument();
    expect(screen.getByText("001-00012345")).toBeInTheDocument();
    expect(screen.getByText("Proveedor A")).toBeInTheDocument();
  });

  it("shows Total, Pagado, Pendiente summary for USD invoice", () => {
    renderModal();
    // Total
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText("$100,00").length).toBeGreaterThanOrEqual(1);
    // Pagado
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getAllByText("$30,00").length).toBeGreaterThanOrEqual(1);
    // Pendiente
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getAllByText("$70,00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Total, Pagado, Pendiente summary for BS invoice", () => {
    renderModal({ invoice: bsInvoice, paymentSummary: mockPaymentSummaryBS });
    // Total
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText(/112\.000,00/).length).toBeGreaterThanOrEqual(1);
    // Pagado
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getAllByText(/20\.000,00/).length).toBeGreaterThanOrEqual(1);
    // Pendiente
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getAllByText(/92\.000,00/).length).toBeGreaterThanOrEqual(1);
  });

  // ── Pre-fill saldo pendiente ──────────────────────────────────────

  it("pre-fills monto with saldo pendiente (USD)", () => {
    renderModal();
    const montoInput = screen.getByRole("spinbutton");
    expect((montoInput as HTMLInputElement).value).toBe("70");
  });

  it("pre-fills monto with saldo pendiente_bs for BS invoice", () => {
    renderModal({ invoice: bsInvoice, paymentSummary: mockPaymentSummaryBS });
    const montoInput = screen.getByRole("spinbutton");
    expect((montoInput as HTMLInputElement).value).toBe("92000");
  });

  it("pre-fills with invoice total_usd when paymentSummary is null", () => {
    renderModal({ paymentSummary: null });
    const montoInput = screen.getByRole("spinbutton");
    expect((montoInput as HTMLInputElement).value).toBe("100");
  });

  it("pre-fills with invoice total_bs for BS invoice when paymentSummary is null", () => {
    renderModal({ invoice: bsInvoice, paymentSummary: null });
    const montoInput = screen.getByRole("spinbutton");
    expect((montoInput as HTMLInputElement).value).toBe("75000");
  });

  // ── Quick buttons ─────────────────────────────────────────────────

  it("Pagar todo button fills full saldo pendiente", async () => {
    renderModal();
    const pagarTodoBtn = screen.getByText("Pagar todo");
    await fireEvent.click(pagarTodoBtn);
    const montoInput = screen.getByRole("spinbutton");
    expect((montoInput as HTMLInputElement).value).toBe("70");
  });

  it("Mitad button fills half saldo pendiente", async () => {
    renderModal();
    const mitadBtn = screen.getByText("Mitad");
    await fireEvent.click(mitadBtn);
    const montoInput = screen.getByRole("spinbutton");
    // 70 / 2 = 35
    expect((montoInput as HTMLInputElement).value).toBe("35");
  });

  it("Otro button clears the monto input", async () => {
    renderModal();
    const otroBtn = screen.getByText("Otro");
    await fireEvent.click(otroBtn);
    const montoInput = screen.getByRole("spinbutton");
    expect((montoInput as HTMLInputElement).value).toBe("");
  });

  it("Mitad button handles odd amounts (rounds correctly)", async () => {
    renderModal({ invoice: bsInvoice, paymentSummary: mockPaymentSummaryBS });
    const mitadBtn = screen.getByText("Mitad");
    await fireEvent.click(mitadBtn);
    const montoInput = screen.getByRole("spinbutton");
    // 92000 / 2 = 46000
    expect((montoInput as HTMLInputElement).value).toBe("46000");
  });

  // ── Validation: exceeds balance ──────────────────────────────────

  it("shows error when amount exceeds saldo pendiente", async () => {
    renderModal();
    const montoInput = screen.getByRole("spinbutton");
    await fireEvent.clear(montoInput);
    await fireEvent.type(montoInput, "100");
    expect(screen.getByText("El monto excede el saldo pendiente")).toBeInTheDocument();
  });

  it("does not show error when amount equals saldo pendiente", () => {
    renderModal();
    expect(screen.queryByText("El monto excede el saldo pendiente")).not.toBeInTheDocument();
  });

  it("does not show error when amount is below saldo pendiente", async () => {
    renderModal();
    const montoInput = screen.getByRole("spinbutton");
    await fireEvent.clear(montoInput);
    await fireEvent.type(montoInput, "50");
    expect(screen.queryByText("El monto excede el saldo pendiente")).not.toBeInTheDocument();
  });

  // ── Payment methods ───────────────────────────────────────────────

  it("shows only active payment methods", async () => {
    renderModal();
    await waitFor(() => {
      expect(api.getPaymentMethods).toHaveBeenCalled();
    });
    expect(screen.getByText("Transferencia")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.queryByText("Inactivo")).not.toBeInTheDocument();
  });

  it("selecting a payment method highlights it", async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText("Transferencia")).toBeInTheDocument();
    });
    const transferenciaBtn = screen.getByText("Transferencia");
    await fireEvent.click(transferenciaBtn);
    expect(transferenciaBtn.closest("button")).toHaveClass("border-brand-blue");
  });

  // ── Reference field ──────────────────────────────────────────────

  it("shows reference field when method acepta_referencia is true", async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText("Transferencia")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("Transferencia"));
    expect(screen.getByPlaceholderText("Número de referencia")).toBeInTheDocument();
  });

  it("hides reference field when method acepta_referencia is false", async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText("Efectivo")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("Efectivo"));
    expect(screen.queryByPlaceholderText("Número de referencia")).not.toBeInTheDocument();
  });

  // ── File upload constraints ──────────────────────────────────────

  it("shows file upload constraints text", () => {
    renderModal();
    expect(
      screen.getByText(/Máx\. 5MB por archivo/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/JPG, PNG, WebP, GIF o PDF/),
    ).toBeInTheDocument();
  });

  it("file input accepts correct types", () => {
    renderModal();
    const fileInput = screen.getByLabelText(/Comprobante de pago/);
    expect(fileInput).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp,image/gif,application/pdf",
    );
  });

  it("file input allows multiple files", () => {
    renderModal();
    const fileInput = screen.getByLabelText(/Comprobante de pago/);
    expect(fileInput).toHaveAttribute("multiple");
  });

  // ── Form submission ──────────────────────────────────────────────

  it("disables Registrar Pago button when no payment method selected", () => {
    renderModal();
    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/ });
    expect(submitBtn).toBeDisabled();
  });

  it("enables Registrar Pago button when method and valid amount", async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText("Transferencia")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("Transferencia"));
    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/ });
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls api.registerInvoicePayment on submit (USD)", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    (api.registerInvoicePayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    renderModal({ onSuccess, onClose });
    await waitFor(() => {
      expect(screen.getByText("Transferencia")).toBeInTheDocument();
    });

    // Select method
    await fireEvent.click(screen.getByText("Transferencia"));
    // Enter reference
    const refInput = screen.getByPlaceholderText("Número de referencia");
    await fireEvent.type(refInput, "REF-001");

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/ });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.registerInvoicePayment).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          metodo_pago_id: 1,
          monto_usd: 7000, // 70 * 100 (toCents)
          monto_bs: 0,
          referencia: "REF-001",
        }),
        undefined,
      );
    });
  });

  it("calls api.registerInvoicePayment on submit (BS)", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    (api.registerInvoicePayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    renderModal({ invoice: bsInvoice, paymentSummary: mockPaymentSummaryBS, onSuccess, onClose });
    await waitFor(() => {
      expect(screen.getByText("Efectivo")).toBeInTheDocument();
    });

    // Select method
    await fireEvent.click(screen.getByText("Efectivo"));

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/ });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.registerInvoicePayment).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          metodo_pago_id: 2,
          monto_usd: 0,
          monto_bs: 9200000, // 92000 * 100 (toCents)
        }),
        undefined,
      );
    });
  });

  it("calls onSuccess and onClose after successful submission", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    (api.registerInvoicePayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    renderModal({ onSuccess, onClose });
    await waitFor(() => {
      expect(screen.getByText("Transferencia")).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByText("Transferencia"));
    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/ });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("shows toast on successful payment", async () => {
    (api.registerInvoicePayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    renderModal();
    await waitFor(() => {
      expect(screen.getByText("Transferencia")).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByText("Transferencia"));
    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/ });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining("registrado"),
        "success",
      );
    });
  });

  it("shows toast error when payment registration fails", async () => {
    (api.registerInvoicePayment as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Error de red"),
    );

    renderModal();
    await waitFor(() => {
      expect(screen.getByText("Transferencia")).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByText("Transferencia"));
    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/ });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Error de red", "error");
    });
  });

  // ── Cancel button ────────────────────────────────────────────────

  it("calls onClose when Cancelar is clicked", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const cancelBtn = screen.getByRole("button", { name: /Cancelar/ });
    await fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Observations ─────────────────────────────────────────────────

  it("shows observations textarea", () => {
    renderModal();
    expect(screen.getByPlaceholderText("Notas (opcional)")).toBeInTheDocument();
  });
});
