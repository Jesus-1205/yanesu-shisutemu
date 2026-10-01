import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckoutSpeedPayment from "@/features/sales/components/CheckoutSpeedPayment";
import CheckoutSplitPayment from "@/features/sales/components/CheckoutSplitPayment";
import CheckoutFooter from "@/features/sales/components/CheckoutFooter";
import type { PaymentMethodOut as PaymentMethod } from "@/types/api";

const mockMethods: PaymentMethod[] = [
  { id: 1, nombre: "EFECTIVO", moneda_default: "VES", acepta_referencia: false, activo: true },
  { id: 2, nombre: "PAGO_MOVIL", moneda_default: "VES", acepta_referencia: true, activo: true },
  { id: 3, nombre: "USD_CASH", moneda_default: "USD", acepta_referencia: false, activo: true },
];

describe("CheckoutSpeedPayment", () => {
  it("renders payment methods and handles click", async () => {
    const onExpressClick = vi.fn();
    const onSwitchToSplit = vi.fn();
    const onReferenceChange = vi.fn();

    render(
      <CheckoutSpeedPayment
        methods={mockMethods}
        amounts={{}}
        references={{}}
        hasAnyAmount={false}
        onExpressClick={onExpressClick}
        onReferenceChange={onReferenceChange}
        onSwitchToSplit={onSwitchToSplit}
      />
    );

    expect(screen.getByText("Cobro rápido")).toBeInTheDocument();
    expect(screen.getByText("Toca un método para asignar el 100%")).toBeInTheDocument();

    const efBtn = screen.getByText("Efectivo");
    await userEvent.click(efBtn);
    expect(onExpressClick).toHaveBeenCalledWith(mockMethods[0]);

    const splitBtn = screen.getByText("Pago dividido / monto exacto?");
    await userEvent.click(splitBtn);
    expect(onSwitchToSplit).toHaveBeenCalled();
  });

  it("renders reference input when method accepts reference and has amount", async () => {
    const onReferenceChange = vi.fn();

    render(
      <CheckoutSpeedPayment
        methods={mockMethods}
        amounts={{ 2: "50.00" }}
        references={{ 2: "1234" }}
        hasAnyAmount={true}
        onExpressClick={vi.fn()}
        onReferenceChange={onReferenceChange}
        onSwitchToSplit={vi.fn()}
      />
    );

    const refInput = screen.getByPlaceholderText("Número de referencia");
    expect(refInput).toHaveValue("1234");
    await userEvent.type(refInput, "5");
    expect(onReferenceChange).toHaveBeenCalledWith(2, "12345");
  });
});

describe("CheckoutSplitPayment", () => {
  it("renders inputs and handles changes", async () => {
    const onAmountChange = vi.fn();
    const onBackToExpress = vi.fn();

    render(
      <CheckoutSplitPayment
        methods={mockMethods}
        amounts={{ 1: "10.00" }}
        references={{}}
        progressPct={50}
        onAmountChange={onAmountChange}
        onReferenceChange={vi.fn()}
        onBackToExpress={onBackToExpress}
      />
    );

    expect(screen.getByText("Desglose de pagos")).toBeInTheDocument();
    const backBtn = screen.getByText("Volver a Cobro Exprés");
    await userEvent.click(backBtn);
    expect(onBackToExpress).toHaveBeenCalled();

    const input = screen.getByLabelText(/Efectivo \(VES\)/i);
    expect(input).toHaveValue(10);
  });
});

describe("CheckoutFooter", () => {
  it("renders correctly and triggers callbacks", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    const financials = {
      pagadoUSD: 10,
      pagadoVES: 455,
      isPayingVES: false,
      pagadoEnMonedaPago: 10,
      restanteEnMonedaPago: 0,
      restanteUSD: 0,
      restanteVES: 0,
      vueltoEnMonedaPago: 2,
      vueltoUSD: 2,
      vueltoVES: 91,
      suficiente: true,
      progressPct: 100,
    };

    render(
      <CheckoutFooter
        financials={financials}
        saving={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Cambio / Vuelto")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    await userEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();

    const processBtn = screen.getByRole("button", { name: "Procesar Cobro" });
    await userEvent.click(processBtn);
    expect(onConfirm).toHaveBeenCalled();
  });
});
