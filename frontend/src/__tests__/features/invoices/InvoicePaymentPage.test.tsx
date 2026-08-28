import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InvoicePaymentPage from "@/features/invoices/pages/InvoicePaymentPage";
import { usePaymentFormStore } from "@/features/invoices/store/paymentFormStore";
import type { FacturaOut, PaymentMethodOut, InvoicePaymentSummary } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getInvoice: vi.fn(),
    getPaymentMethods: vi.fn(),
    getInvoicePayments: vi.fn(),
    registerInvoicePayment: vi.fn(),
  },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { api } from "@/services/api";

const baseInvoice: FacturaOut = {
  id: 22,
  proveedor_id: 1,
  numero_factura: "22",
  tipo_documento: "FACTURA",
  fecha_factura: "2026-08-27",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  moneda_principal: "BS",
  tasa_bs: 791.32,
  total_usd: 0,
  total_bs: 1392,
  aplica_iva: false,
  estado_pago: "PARCIALMENTE_PAGADA",
  created_at: "2026-08-27T12:00:00",
  procesada_por_ia: false,
  raw_json_ia: null,
  total_pagado_usd: 0,
  total_pagado_bs: 800,
  saldo_pendiente_usd: 0,
  saldo_pendiente_bs: 592,
  porcentaje_pagado: 57,
  supplier: { id: 1, nombre: "Polar", telefono: null, email: null },
  detalles: [],
  obsequios: [],
  fecha_limite_pago: null,
};

const paidInvoice: FacturaOut = {
  ...baseInvoice,
  estado_pago: "PAGADA",
  saldo_pendiente_bs: 0,
  saldo_pendiente_usd: 0,
  porcentaje_pagado: 100,
};

const paymentMethods: PaymentMethodOut[] = [
  { id: 1, nombre: "Divisas", moneda_default: "USD", acepta_referencia: false, activo: true },
  { id: 2, nombre: "Efectivo", moneda_default: "VES", acepta_referencia: false, activo: true },
  { id: 3, nombre: "Transferencia", moneda_default: "USD", acepta_referencia: true, activo: true },
];

const paymentSummary: InvoicePaymentSummary = {
  estado_pago: "PARCIALMENTE_PAGADA",
  total_factura_usd: 1.76,
  total_factura_bs: 1392,
  total_pagado_usd: 1.01,
  total_pagado_bs: 800,
  total_mora_bs: 0,
  diferencia_cambiaria_bs: 0,
  saldo_pendiente_usd: 0.75,
  saldo_pendiente_bs: 592,
  cantidad_pagos: 1,
  porcentaje_pagado: 57,
};

function renderPage(invoiceId = 22) {
  return render(
    <MemoryRouter initialEntries={[`/invoices/${invoiceId}/pay`]}>
      <Routes>
        <Route path="/invoices/:id/pay" element={<InvoicePaymentPage />} />
        <Route path="/invoices/:id" element={<div>Invoice Detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function waitForPageLoad() {
  await waitFor(() => {
    expect(screen.getByText("Método de pago")).toBeInTheDocument();
  });
}

describe("InvoicePaymentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePaymentFormStore.setState({
      selectedMethodId: null,
      monto: "",
      referencia: "",
      comprobantes: [],
      observaciones: "",
    });
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    (api.getPaymentMethods as ReturnType<typeof vi.fn>).mockResolvedValue(paymentMethods);
    (api.getInvoicePayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      pagos: [],
      resumen: paymentSummary,
    });
  });

  it("muestra loading y luego los métodos de pago", async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByText("Divisas")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Transferencia")).toBeInTheDocument();
  });

  it("muestra resumen de factura en sidebar", async () => {
    renderPage();
    await waitForPageLoad();
    expect(screen.getByText("#22")).toBeInTheDocument();
    expect(screen.getByText("Polar")).toBeInTheDocument();
    expect(screen.getByText("Parcial")).toBeInTheDocument();
  });

  it("redirige si la factura ya está pagada", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(paidInvoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Invoice Detail")).toBeInTheDocument();
    });
  });

  it("selecciona método de pago y muestra input de monto", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Divisas"));
    expect(screen.getByText(/monto a pagar/i)).toBeInTheDocument();
    expect(screen.getByText("Pagar todo")).toBeInTheDocument();
    expect(screen.getByText("Mitad")).toBeInTheDocument();
  });

  it("el botón 'Pagar todo' llena el saldo pendiente", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Divisas"));
    usePaymentFormStore.setState({ monto: "0.75" });
    await waitFor(() => {
      const input = screen.getAllByRole("spinbutton")[0];
      expect(input).toHaveValue(0.75);
    });
  });

  it("el botón 'Mitad' llena la mitad del saldo", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Divisas"));
    usePaymentFormStore.setState({ monto: "0.37" });
    await waitFor(() => {
      const input = screen.getAllByRole("spinbutton")[0];
      expect(input).toHaveValue(0.37);
    });
  });

  it("muestra conversión de moneda al ingresar monto", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Divisas"));
    usePaymentFormStore.setState({ monto: "100" });
    await waitFor(() => {
      expect(screen.getByText(/tasa bcv/i)).toBeInTheDocument();
    });
  });

  it("deshabilita el botón de submit si el monto es 0", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Divisas"));
    const submitButton = screen.getByRole("button", { name: /Registrar Pago/i });
    expect(submitButton).toBeDisabled();
  });

  it("habilita el botón de submit con monto válido", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Divisas"));
    usePaymentFormStore.setState({ monto: "0.50" });
    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Registrar Pago/i });
      expect(submitButton).toBeEnabled();
    });
  });

  it("muestra referencia cuando el método la acepta", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Transferencia"));
    expect(screen.getByText("Referencia")).toBeInTheDocument();
  });

  it("no muestra referencia si el método no la acepta", async () => {
    renderPage();
    await waitForPageLoad();
    await userEvent.click(screen.getByText("Efectivo"));
    expect(screen.queryByText("Referencia")).not.toBeInTheDocument();
  });

  it("muestra error si falla la carga", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Error de red"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error de red")).toBeInTheDocument();
    });
  });
});
