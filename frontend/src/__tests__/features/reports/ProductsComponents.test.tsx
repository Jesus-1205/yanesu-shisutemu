import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductsKpiCards from "@/features/reports/components/ProductsKpiCards";
import ProductsToolbar from "@/features/reports/components/ProductsToolbar";
import ProductsTable from "@/features/reports/components/ProductsTable";
import type { ProductKpis, ProductTableRow } from "@/features/reports/types";

describe("ProductsKpiCards", () => {
  const mockKpis: ProductKpis = {
    totalUnidades: 125,
    lider: {
      id: 1,
      nombre: "Cerveza Polar",
      total_vendido: 80,
      precio_unidad_usd: 1.5,
      precio_costo_usd: 1,
      margen_porcentaje: 33.3,
      stock_unidades: 200,
    },
    margenPromedio: 28.5,
    sinRotacion: 4,
  };

  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(<ProductsKpiCards kpis={mockKpis} loading={true} />);
    expect(screen.getByText("Unidades Vendidas")).toBeInTheDocument();
    expect(screen.getByText("Producto Líder")).toBeInTheDocument();
    expect(screen.getByText("Margen Promedio")).toBeInTheDocument();
    expect(screen.getByText("Sin Rotación")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra valores formateados cuando loading es false", () => {
    render(<ProductsKpiCards kpis={mockKpis} loading={false} />);
    expect(screen.getByText("125")).toBeInTheDocument();
    expect(screen.getByText("Cerveza Polar")).toBeInTheDocument();
    expect(screen.getByText("80 unidades vendidas")).toBeInTheDocument();
    expect(screen.getByText("28.5%")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

describe("ProductsToolbar", () => {
  it("renderiza botones de modo de gráfico y responde al toggle", async () => {
    const onChartModeChange = vi.fn();
    render(
      <ProductsToolbar
        viewMode="chart"
        chartMode="matrix"
        onViewModeChange={vi.fn()}
        onChartModeChange={onChartModeChange}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText("Matriz de Rendimiento: Rotación vs. Margen %")).toBeInTheDocument();
    const top10Btn = screen.getByRole("button", { name: /top 10/i });
    expect(top10Btn).toBeInTheDocument();
    await userEvent.click(top10Btn);
    expect(onChartModeChange).toHaveBeenCalledWith("top10");
  });

  it("muestra botón exportar solo en modo tabla", async () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <ProductsToolbar
        viewMode="chart"
        chartMode="matrix"
        onViewModeChange={vi.fn()}
        onChartModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();

    rerender(
      <ProductsToolbar
        viewMode="table"
        chartMode="matrix"
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

describe("ProductsTable", () => {
  const mockRows: ProductTableRow[] = [
    {
      id: 1,
      nombre: "Ron Santa Teresa",
      total_vendido: 20,
      ingresos: 400,
      costos: 260,
      margen: 140,
      rentabilidad_pct: 35.0,
      stock_unidades: 12,
    },
  ];

  it("renderiza columnas, filas y responde al cambio de pestaña", async () => {
    const onTabChange = vi.fn();
    render(
      <ProductsTable
        data={mockRows}
        totalRows={1}
        page={1}
        totalPages={1}
        pageSize={10}
        tableTab="todos"
        sinRotacionCount={2}
        currency="USD"
        currSymbol="$"
        onTabChange={onTabChange}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Ron Santa Teresa")).toBeInTheDocument();
    expect(screen.getByText("$400,00")).toBeInTheDocument();
    expect(screen.getByText("35.0%")).toBeInTheDocument();
    expect(screen.getByText("12 u")).toBeInTheDocument();

    const sinRotTab = screen.getByRole("button", { name: /sin rotación/i });
    await userEvent.click(sinRotTab);
    expect(onTabChange).toHaveBeenCalledWith("sin_rotacion");
  });
});
