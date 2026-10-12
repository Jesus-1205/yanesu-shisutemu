import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentMethodsBarChart from "@/features/reports/components/PaymentMethodsBarChart";
import type { PaymentMethodSummaryItem } from "@/types/api";
import type { ReactNode } from "react";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-count={data.length}>
      {children}
    </div>
  ),
  Bar: ({ children }: { children: ReactNode }) => (
    <div data-testid="bar">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

function makeMethod(
  id: number,
  name: string,
  totalUsd: number,
  count = 1,
  moneda: "USD" | "VES" = "USD",
): PaymentMethodSummaryItem {
  return {
    metodo_pago_id: id,
    metodo_pago_nombre: name,
    moneda_default: moneda,
    cantidad_pagos: count,
    total_usd: totalUsd,
    total_ves: 0,
    total_equivalente_usd: totalUsd,
  };
}

describe("PaymentMethodsBarChart", () => {
  it("muestra mensaje vacío cuando no hay datos", () => {
    render(
      <PaymentMethodsBarChart
        data={[]}
        currency="USD"
        currSymbol="$"
        conversionRate={1}
      />
    );
    expect(screen.getByText(/sin pagos registrados en el período/i)).toBeInTheDocument();
  });

  it("muestra mensaje vacío cuando todos los métodos tienen 0 pagos", () => {
    const data = [makeMethod(1, "EFECTIVO", 0, 0)];
    render(
      <PaymentMethodsBarChart
        data={data}
        currency="USD"
        currSymbol="$"
        conversionRate={1}
      />
    );
    expect(screen.getByText(/sin pagos registrados en el período/i)).toBeInTheDocument();
  });

  it("renderiza el gráfico de barras y celdas para métodos activos", () => {
    const data = [
      makeMethod(1, "EFECTIVO_USD", 100, 5),
      makeMethod(2, "PAGO_MOVIL", 50, 3, "VES"),
    ];
    render(
      <PaymentMethodsBarChart
        data={data}
        currency="USD"
        currSymbol="$"
        conversionRate={1}
      />
    );

    expect(
      screen.getByRole("heading", { name: /comparativa de recaudación/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-count", "2");
    expect(screen.getAllByTestId("cell")).toHaveLength(2);
  });
});
