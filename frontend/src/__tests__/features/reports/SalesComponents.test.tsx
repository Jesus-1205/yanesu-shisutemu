import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesKpiCards from "@/features/reports/components/SalesKpiCards";
import SalesTable from "@/features/reports/components/SalesTable";
import SalesToolbar from "@/features/reports/components/SalesToolbar";
import type { SalesKpis, SalesChartRow } from "@/features/reports/types";

describe("SalesKpiCards", () => {
  const mockTotals: SalesKpis = {
    totalVentas: 42,
    ingresos: 5000,
    costos: 3500,
    margen: 1500,
    margenPct: 30.0,
  };

  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(
      <SalesKpiCards totals={mockTotals} loading={true} currSymbol="$" />,
    );
    expect(screen.getByText("Ingresos Brutos")).toBeInTheDocument();
    expect(screen.getByText("Costo Mercancía")).toBeInTheDocument();
    expect(screen.getByText("Margen de Ganancia")).toBeInTheDocument();
    expect(screen.getByText("N° de Ventas")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra valores formateados cuando loading es false", () => {
    render(<SalesKpiCards totals={mockTotals} loading={false} currSymbol="$" />);
    expect(screen.getByText("$5.000,00")).toBeInTheDocument();
    expect(screen.getByText("$3.500,00")).toBeInTheDocument();
    expect(screen.getByText("$1.500,00")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

describe("SalesToolbar", () => {
  it("renderiza botones de agrupación y modos de vista", () => {
    render(
      <SalesToolbar
        grouping="diario"
        viewMode="chart"
        onGroupingChange={vi.fn()}
        onViewModeChange={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /diario/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /semanal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mensual/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gráfico/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tabla/i })).toBeInTheDocument();
    // En modo chart NO debe haber botón de exportar
    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();
  });

  it("muestra botón exportar solo en modo tabla y responde al click", async () => {
    const onExport = vi.fn();
    render(
      <SalesToolbar
        grouping="diario"
        viewMode="table"
        onGroupingChange={vi.fn()}
        onViewModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    const exportBtn = screen.getByRole("button", { name: /exportar excel/i });
    expect(exportBtn).toBeInTheDocument();
    await userEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});

describe("SalesTable", () => {
  const mockRows: SalesChartRow[] = [
    {
      periodoRaw: "2026-10-02",
      periodoFormatted: "2 Oct",
      ventas: 15,
      ingresos: 1500,
      costos: 1000,
      margen: 500,
    },
  ];

  it("renderiza columnas y datos de filas", () => {
    render(
      <SalesTable
        data={mockRows}
        totalRows={1}
        page={1}
        totalPages={1}
        pageSize={10}
        currency="USD"
        currSymbol="$"
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Período")).toBeInTheDocument();
    expect(screen.getByText("N° de Ventas")).toBeInTheDocument();
    expect(screen.getByText("2 Oct")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("$1.500,00")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
  });
});
