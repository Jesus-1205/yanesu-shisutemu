import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReportsPaymentsPage from "@/features/reports/pages/ReportsPaymentsPage";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { PaymentMethodSummaryItem } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethodSummary: vi.fn(),
  },
}));

vi.mock("@/features/reports/components/PaymentMethodsDonut", () => ({
  default: () => <div data-testid="donut-chart">DonutChart</div>,
}));

vi.mock("@/features/reports/components/PaymentMethodsBarChart", () => ({
  default: () => <div data-testid="bar-chart">BarChart</div>,
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

const MOCK_PAYMENTS: PaymentMethodSummaryItem[] = [
  {
    metodo_pago_id: 1,
    metodo_pago_nombre: "EFECTIVO_USD",
    moneda_default: "USD",
    cantidad_pagos: 20,
    total_usd: 200,
    total_ves: 0,
    total_equivalente_usd: 200,
  },
  {
    metodo_pago_id: 2,
    metodo_pago_nombre: "PAGO_MOVIL",
    moneda_default: "VES",
    cantidad_pagos: 10,
    total_usd: 0,
    total_ves: 5000,
    total_equivalente_usd: 100,
  },
  {
    metodo_pago_id: 3,
    metodo_pago_nombre: "TRANSFERENCIA",
    moneda_default: "VES",
    cantidad_pagos: 0,
    total_usd: 0,
    total_ves: 0,
    total_equivalente_usd: 0,
  },
];

function renderPage(search = "?from=2026-09-10&to=2026-10-09") {
  render(
    <MemoryRouter initialEntries={[`/reports/payments${search}`]}>
      <Routes>
        <Route path="/reports/payments" element={<ReportsPaymentsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useExchangeRateStore.setState({ tasa: 50 });
  vi.mocked(api.getPaymentMethodSummary).mockResolvedValue(MOCK_PAYMENTS);
});

describe("ReportsPaymentsPage", () => {
  it("renders the 4 KPI cards", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Total Recaudado")).toBeInTheDocument();
      expect(screen.getByText("Método Principal")).toBeInTheDocument();
      expect(screen.getByText("Total Ventas")).toBeInTheDocument();
      expect(screen.getByText("Venta Promedio")).toBeInTheDocument();
    });
  });

  it("calculates and displays correct KPI values", async () => {
    renderPage();
    await waitFor(() => {
      // Total equiv USD: 200 + 100 = 300
      expect(screen.getByText("$300,00")).toBeInTheDocument();
      // Líder: EFECTIVO_USD (66.7% del total)
      expect(screen.getByText("Efectivo Usd")).toBeInTheDocument();
      // Total transacciones: 20 + 10 = 30
      expect(screen.getByText("30")).toBeInTheDocument();
      // Venta Promedio: 300 / 30 = 10,00
      expect(screen.getByText("$10,00")).toBeInTheDocument();
    });
  });

  it("switches between Gráfico and Tabla views", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
    });

    const tablaBtn = screen.getByRole("button", { name: /tabla/i });
    await userEvent.click(tablaBtn);

    expect(screen.getByRole("heading", { name: "Tabla de Desglose de Pagos" })).toBeInTheDocument();
    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Divisas (USD)")).toBeInTheDocument();
    expect(screen.getByText("Bolívares (VES)")).toBeInTheDocument();
  });

  it("switches between Donut and Bars in chart mode", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
    });

    const comparativaBtn = screen.getByRole("button", { name: /comparativa/i });
    await userEvent.click(comparativaBtn);

    await waitFor(() => {
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });
  });

  it("filters table data with sub-tabs", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
    });

    const tablaBtn = screen.getByRole("button", { name: /tabla/i });
    await userEvent.click(tablaBtn);

    // Initial table has all 3 methods ("Efectivo Usd" also appears in the KPI card)
    expect(screen.getAllByText("Efectivo Usd").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Pago Movil")).toBeInTheDocument();
    expect(screen.getByText("Transferencia")).toBeInTheDocument();

    // Click Divisas (USD)
    const divisasTab = screen.getByRole("button", { name: /divisas \(usd\)/i });
    await userEvent.click(divisasTab);

    // In table, only Efectivo Usd exists; Pago Movil is gone from table
    expect(screen.getAllByText("Efectivo Usd").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Pago Movil")).not.toBeInTheDocument();

    // Click Bolívares (VES)
    const bolivaresTab = screen.getByRole("button", { name: /bolívares \(ves\)/i });
    await userEvent.click(bolivaresTab);

    // Efectivo Usd is gone from the table (only 1 exists in the KPI card)
    expect(screen.getAllByText("Efectivo Usd").length).toBe(1);
    expect(screen.getByText("Pago Movil")).toBeInTheDocument();
    expect(screen.getByText("Transferencia")).toBeInTheDocument();
  });

  it("supports VES currency mode using exchange rate store", async () => {
    // tasa = 50, total equiv USD 300 => 300 * 50 = 15000 VES
    renderPage("?from=2026-09-10&to=2026-10-09&currency=VES");
    await waitFor(() => {
      expect(screen.getByText("Bs 15.000,00")).toBeInTheDocument();
      // Venta promedio: 15000 / 30 = 500
      expect(screen.getByText("Bs 500,00")).toBeInTheDocument();
    });
  });

  it("renders ErrorBanner when fetch fails and allows retry", async () => {
    vi.mocked(api.getPaymentMethodSummary).mockRejectedValueOnce(new Error("Error de red"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error de red")).toBeInTheDocument();
    });

    const reintentarBtn = screen.getByRole("button", { name: /reintentar/i });
    await userEvent.click(reintentarBtn);

    await waitFor(() => {
      expect(screen.getByText("Total Recaudado")).toBeInTheDocument();
    });
  });
});
