import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PagosTab from "@/features/reports/components/PagosTab";
import { ToastProvider } from "@/ui-components/Toast";
import type { PaymentMethodSummaryItem } from "@/types/api";
import type { ReactNode } from "react";

vi.mock("@/features/reports/components/PaymentMethodsDonut", () => ({
  default: ({ data }: { data: PaymentMethodSummaryItem[] }) => (
    <div data-testid="payment-methods-donut" data-count={data.length}>
      PaymentMethodsDonut
    </div>
  ),
}));

function renderWithToast(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const mockPaymentData: PaymentMethodSummaryItem[] = [
  {
    metodo_pago_id: 1,
    metodo_pago_nombre: "EFECTIVO_USD",
    moneda_default: "USD",
    cantidad_pagos: 15,
    total_usd: 150.75,
    total_ves: 0,
    total_equivalente_usd: 150.75,
  },
  {
    metodo_pago_id: 2,
    metodo_pago_nombre: "PAGO_MOVIL",
    moneda_default: "VES",
    cantidad_pagos: 10,
    total_usd: 0,
    total_ves: 4500.5,
    total_equivalente_usd: 100.0,
  },
  {
    metodo_pago_id: 3,
    metodo_pago_nombre: "PUNTO_VENTA",
    moneda_default: "VES",
    cantidad_pagos: 5,
    total_usd: 0,
    total_ves: 2250.25,
    total_equivalente_usd: 50.0,
  },
];

describe("PagosTab", () => {
  it("muestra el Spinner cuando loading es true", () => {
    renderWithToast(
      <PagosTab
        data={[]}
        loading={true}
        desde=""
        hasta=""
        onDesdeChange={vi.fn()}
        onHastaChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByText("Recibido USD")).not.toBeInTheDocument();
    expect(screen.queryByText("Detalle por Método de Pago")).not.toBeInTheDocument();
  });

  it("calcula y muestra correctamente las tarjetas de resumen y totales acumulados", () => {
    renderWithToast(
      <PagosTab
        data={mockPaymentData}
        loading={false}
        desde=""
        hasta=""
        onDesdeChange={vi.fn()}
        onHastaChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    // Totales calculados:
    // USD: 150.75 -> $150,75 (formato es-VE)
    // VES: 4500.5 + 2250.25 = 6750.75 -> Bs 6.750,75
    // Equiv USD: 150.75 + 100 + 50 = 300.75 -> $300,75
    // Pagos: 15 + 10 + 5 = 30
    expect(screen.getByText("Recibido USD")).toBeInTheDocument();
    expect(screen.getAllByText("$150,75").length).toBeGreaterThan(0);
    expect(screen.getByText("Recibido VES")).toBeInTheDocument();
    expect(screen.getAllByText("Bs 6.750,75").length).toBeGreaterThan(0);
    expect(screen.getByText("Equivalente USD")).toBeInTheDocument();
    expect(screen.getAllByText("$300,75").length).toBeGreaterThan(0);
    expect(screen.getByText("Total de Pagos")).toBeInTheDocument();
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
  });

  it("renderiza la tabla con los métodos de pago formateados", () => {
    renderWithToast(
      <PagosTab
        data={mockPaymentData}
        loading={false}
        desde=""
        hasta=""
        onDesdeChange={vi.fn()}
        onHastaChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("Detalle por Método de Pago")).toBeInTheDocument();
    expect(screen.getByText("Efectivo Usd")).toBeInTheDocument();
    expect(screen.getByText("Pago Movil")).toBeInTheDocument();
    expect(screen.getByText("Punto Venta")).toBeInTheDocument();
  });

  it("muestra estado vacío cuando data está vacío", () => {
    renderWithToast(
      <PagosTab
        data={[]}
        loading={false}
        desde=""
        hasta=""
        onDesdeChange={vi.fn()}
        onHastaChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getAllByText("$0,00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bs 0,00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("permite interactuar con los campos de fecha desde y hasta", async () => {
    const user = userEvent.setup();
    const handleDesdeChange = vi.fn();
    const handleHastaChange = vi.fn();
    const handleClear = vi.fn();

    renderWithToast(
      <PagosTab
        data={mockPaymentData}
        loading={false}
        desde="2025-01-01"
        hasta="2025-01-31"
        onDesdeChange={handleDesdeChange}
        onHastaChange={handleHastaChange}
        onClear={handleClear}
      />,
    );

    const inputs = screen.getAllByDisplayValue(/2025-01/);
    expect(inputs).toHaveLength(2);

    const clearButton = screen.getByRole("button", { name: "Limpiar" });
    expect(clearButton).toBeInTheDocument();
    await user.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("no muestra el botón Limpiar si no hay fechas seleccionadas", () => {
    renderWithToast(
      <PagosTab
        data={mockPaymentData}
        loading={false}
        desde=""
        hasta=""
        onDesdeChange={vi.fn()}
        onHastaChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Limpiar" })).not.toBeInTheDocument();
  });
});
