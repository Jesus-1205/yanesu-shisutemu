import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckoutHeader from "@/features/sales/components/CheckoutHeader";
import CheckoutSpeedPayment from "@/features/sales/components/CheckoutSpeedPayment";
import CheckoutSplitPayment from "@/features/sales/components/CheckoutSplitPayment";
import CheckoutFooter from "@/features/sales/components/CheckoutFooter";
import type { PaymentMethodOut as PaymentMethod } from "@/types/api";

const mockMethods: PaymentMethod[] = [
  { id: 1, nombre: "EFECTIVO", moneda_default: "VES", acepta_referencia: false, activo: true },
  { id: 2, nombre: "PAGO_MOVIL", moneda_default: "VES", acepta_referencia: true, activo: true },
  { id: 3, nombre: "USD_CASH", moneda_default: "USD", acepta_referencia: false, activo: true },
];

const mockUseCheckoutContext = vi.fn();

vi.mock("@/features/sales/components/CheckoutProvider", () => ({
  useCheckoutContext: () => mockUseCheckoutContext(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CheckoutHeader", () => {
  it("renders total amounts and exchange rate details", () => {
    mockUseCheckoutContext.mockReturnValue({
      totalUsd: 25.5,
      totalVes: 1160.25,
      tasaNum: 45.5,
      totals: {
        monto_exento_usd: 5.5,
        base_imponible_usd: 17.24,
        monto_iva_usd: 2.76,
      },
      totalDivisasItems: 0,
      divisasSummary: null,
    });

    render(<CheckoutHeader />);

    expect(screen.getByText("$25,50")).toBeInTheDocument();
    expect(screen.getByText("Bs 1.160,25")).toBeInTheDocument();
    expect(screen.getByText(/Tasa: 45,50/i)).toBeInTheDocument();
  });
});

describe("CheckoutSpeedPayment", () => {
  it("renders payment methods and handles click", async () => {
    const handleExpressClick = vi.fn();
    const setIsSplit = vi.fn();
    const setReferences = vi.fn();
    const resetAmounts = vi.fn();

    mockUseCheckoutContext.mockReturnValue({
      methods: mockMethods,
      amounts: {},
      references: {},
      hasAnyAmount: false,
      handleExpressClick,
      setReferences,
      setIsSplit,
      resetAmounts,
    });

    render(<CheckoutSpeedPayment />);

    expect(screen.getByText("Cobro rápido")).toBeInTheDocument();
    expect(screen.getByText("Toca un método para asignar el 100%")).toBeInTheDocument();

    const efBtn = screen.getByText("Efectivo");
    await userEvent.click(efBtn);
    expect(handleExpressClick).toHaveBeenCalledWith(mockMethods[0]);

    const splitBtn = screen.getByText("Pago dividido / monto exacto?");
    await userEvent.click(splitBtn);
    expect(setIsSplit).toHaveBeenCalledWith(true);
    expect(resetAmounts).toHaveBeenCalled();
  });

  it("renders reference input when method accepts reference and has amount", async () => {
    const setReferences = vi.fn();

    mockUseCheckoutContext.mockReturnValue({
      methods: mockMethods,
      amounts: { 2: "50.00" },
      references: { 2: "1234" },
      hasAnyAmount: true,
      handleExpressClick: vi.fn(),
      setReferences,
      setIsSplit: vi.fn(),
    });

    render(<CheckoutSpeedPayment />);

    const refInput = screen.getByPlaceholderText("Número de referencia");
    expect(refInput).toHaveValue("1234");
    await userEvent.type(refInput, "5");
    expect(setReferences).toHaveBeenCalled();
  });
});

describe("CheckoutSplitPayment", () => {
  it("renders inputs and handles changes", async () => {
    const setAmount = vi.fn();
    const setAmounts = vi.fn();
    const setIsSplit = vi.fn();

    mockUseCheckoutContext.mockReturnValue({
      methods: mockMethods,
      amounts: { 1: "10.00" },
      references: {},
      financials: { progressPct: 50 },
      setAmount,
      setAmounts,
      setReferences: vi.fn(),
      setIsSplit,
    });

    render(<CheckoutSplitPayment />);

    expect(screen.getByText("Desglose de pagos")).toBeInTheDocument();
    const backBtn = screen.getByText("Volver a Cobro Exprés");
    await userEvent.click(backBtn);
    expect(setAmounts).toHaveBeenCalledWith({});
    expect(setIsSplit).toHaveBeenCalledWith(false);

    const input = screen.getByLabelText(/Efectivo \(VES\)/i);
    expect(input).toHaveValue(10);
    await userEvent.type(input, "5");
    expect(setAmount).toHaveBeenCalled();
  });
});

describe("CheckoutFooter", () => {
  it("renders correctly and triggers callbacks", async () => {
    const onClose = vi.fn();
    const handleConfirm = vi.fn();

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

    mockUseCheckoutContext.mockReturnValue({
      financials,
      saving: false,
      onClose,
      handleConfirm,
    });

    render(<CheckoutFooter />);

    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Cambio / Vuelto")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    await userEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();

    const processBtn = screen.getByRole("button", { name: "Procesar Cobro" });
    await userEvent.click(processBtn);
    expect(handleConfirm).toHaveBeenCalled();
  });
});
