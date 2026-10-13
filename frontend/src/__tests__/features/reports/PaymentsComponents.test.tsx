import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentsKpiCards from "@/features/reports/components/PaymentsKpiCards";
import PaymentsToolbar from "@/features/reports/components/PaymentsToolbar";
import PaymentsTable from "@/features/reports/components/PaymentsTable";
import type { PaymentKpis, PaymentTableRow } from "@/features/reports/types";

describe("PaymentsKpiCards", () => {
  const mockKpis: PaymentKpis = {
    totalUsd: 1500,
    totalVes: 50000,
    totalTransacciones: 45,
    totalEquivUsd: 2500,
    totalRecaudado: 2500,
    lider: {
      metodo_pago_id: 1,
      metodo_pago_nombre: "PUNTO_VENTA",
      moneda_default: "VES",
      cantidad_pagos: 30,
      total_usd: 0,
      total_ves: 50000,
      total_equivalente_usd: 1500,
    },
    ventaPromedio: 55.55,
  };

  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(
      <PaymentsKpiCards kpis={mockKpis} loading={true} currency="USD" currSymbol="$" />,
    );
    expect(screen.getByText("Total Recaudado")).toBeInTheDocument();
    expect(screen.getByText("Método Principal")).toBeInTheDocument();
    expect(screen.getByText("Total Ventas")).toBeInTheDocument();
    expect(screen.getByText("Venta Promedio")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra valores formateados cuando loading es false", () => {
    render(
      <PaymentsKpiCards kpis={mockKpis} loading={false} currency="USD" currSymbol="$" />,
    );
    expect(screen.getByText("$2.500,00")).toBeInTheDocument();
    expect(screen.getByText("Punto Venta")).toBeInTheDocument();
    expect(screen.getByText("60.0% del total recibido")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("$55,55")).toBeInTheDocument();
  });
});

describe("PaymentsToolbar", () => {
  it("renderiza botones de modo de gráfico y responde al toggle", async () => {
    const onChartModeChange = vi.fn();
    render(
      <PaymentsToolbar
        viewMode="chart"
        chartMode="donut"
        onViewModeChange={vi.fn()}
        onChartModeChange={onChartModeChange}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText("Distribución por Método de Pago")).toBeInTheDocument();
    const comparativaBtn = screen.getByRole("button", { name: /comparativa/i });
    expect(comparativaBtn).toBeInTheDocument();
    await userEvent.click(comparativaBtn);
    expect(onChartModeChange).toHaveBeenCalledWith("bars");
  });

  it("muestra botón exportar solo en modo tabla", async () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <PaymentsToolbar
        viewMode="chart"
        chartMode="donut"
        onViewModeChange={vi.fn()}
        onChartModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();

    rerender(
      <PaymentsToolbar
        viewMode="table"
        chartMode="donut"
        onViewModeChange={vi.fn()}
        onChartModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    const exportBtn = screen.getByRole("button", { name: /exportar excel/i });
    expect(exportBtn).toBeInTheDocument();
    await userEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});

describe("PaymentsTable", () => {
  const mockRows: PaymentTableRow[] = [
    {
      id: 1,
      nombre: "ZELLE",
      nombreFormatted: "Zelle",
      monedaDefault: "USD",
      cantidadPagos: 15,
      totalUsd: 450,
      totalVes: 0,
      totalEquiv: 450,
      participacionPct: 50.0,
      participacionFormatted: "50.0",
    },
  ];

  it("renderiza columnas, badge de moneda, fila y responde al cambio de pestaña", async () => {
    const onTabChange = vi.fn();
    render(
      <PaymentsTable
        data={mockRows}
        totalRows={1}
        page={1}
        totalPages={1}
        pageSize={10}
        tableTab="todos"
        currency="USD"
        currSymbol="$"
        onTabChange={onTabChange}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Zelle")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getAllByText("$450,00")).toHaveLength(2);
    expect(screen.getByText("50.0%")).toBeInTheDocument();

    const divisasTab = screen.getByRole("button", { name: /divisas \(usd\)/i });
    await userEvent.click(divisasTab);
    expect(onTabChange).toHaveBeenCalledWith("divisas");
  });
});
