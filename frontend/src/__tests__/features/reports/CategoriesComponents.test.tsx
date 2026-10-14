import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import CategoriesKpiCards from "@/features/reports/components/CategoriesKpiCards";
import CategoriesToolbar from "@/features/reports/components/CategoriesToolbar";
import CategoriesChartSection from "@/features/reports/components/CategoriesChartSection";
import CategoriesTable from "@/features/reports/components/CategoriesTable";
import type {
  CategoryKpis,
  CategoryTableRow,
} from "@/features/reports/types";
import type { CategoryReportItemOut } from "@/types/api";

// Mock recharts for jsdom testing
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="pie" data-count={data?.length}>
      {children}
    </div>
  ),
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe("CategoriesKpiCards", () => {
  const mockKpis: CategoryKpis = {
    totalIngresos: 500,
    lider: {
      id: 1,
      nombre: "Licores",
      total_productos: 10,
      stock_total: 50,
      stock_valorado_usd: 500,
      total_ordenes: 15,
      unidades_vendidas: 30,
      ingresos_usd: 300,
      costos_usd: 150,
      margen_usd: 150,
      margen_porcentaje: 50,
    },
    liderParticipacion: 60,
    totalUnidades: 100,
    margenPromedio: 42.0,
  };

  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(
      <CategoriesKpiCards
        kpis={mockKpis}
        loading={true}
        currency="USD"
        currSymbol="$"
      />,
    );
    expect(screen.getByText("Total Facturado")).toBeInTheDocument();
    expect(screen.getByText("Categoría Principal")).toBeInTheDocument();
    expect(screen.getByText("Unidades Vendidas")).toBeInTheDocument();
    expect(screen.getByText("Margen Promedio")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra valores formateados cuando loading es false", () => {
    render(
      <CategoriesKpiCards
        kpis={mockKpis}
        loading={false}
        currency="USD"
        currSymbol="$"
      />,
    );
    expect(screen.getByText("$500,00")).toBeInTheDocument();
    expect(screen.getByText("Licores")).toBeInTheDocument();
    expect(screen.getByText(/60(\.0)?%/)).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText(/42(\.0)?%/)).toBeInTheDocument();
  });

  it("muestra estado vacío cuando no hay líder", () => {
    const emptyKpis: CategoryKpis = {
      totalIngresos: 0,
      lider: null,
      liderParticipacion: 0,
      totalUnidades: 0,
      margenPromedio: 0,
    };
    render(
      <CategoriesKpiCards
        kpis={emptyKpis}
        loading={false}
        currency="USD"
        currSymbol="$"
      />,
    );
    expect(screen.getByText(/Sin ventas|—/)).toBeInTheDocument();
  });

  it("formatea en VES correctamente", () => {
    const vesKpis: CategoryKpis = {
      ...mockKpis,
      totalIngresos: 25000,
    };
    render(
      <CategoriesKpiCards
        kpis={vesKpis}
        loading={false}
        currency="VES"
        currSymbol="Bs "
      />,
    );
    expect(screen.getByText("Bs 25.000,00")).toBeInTheDocument();
  });
});

describe("CategoriesToolbar", () => {
  it("renderiza botones de modo de gráfico y responde al toggle", async () => {
    const onChartModeChange = vi.fn();
    render(
      <CategoriesToolbar
        viewMode="chart"
        chartMode="donut"
        onViewModeChange={vi.fn()}
        onChartModeChange={onChartModeChange}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText("Distribución por Categoría")).toBeInTheDocument();
    const comparativaBtn = screen.getByRole("button", { name: /comparativa/i });
    expect(comparativaBtn).toBeInTheDocument();
    await userEvent.click(comparativaBtn);
    expect(onChartModeChange).toHaveBeenCalledWith("bars");
  });

  it("renderiza botones de vista (Gráfico/Tabla) y responde al cambio", async () => {
    const onViewModeChange = vi.fn();
    render(
      <CategoriesToolbar
        viewMode="chart"
        chartMode="donut"
        onViewModeChange={onViewModeChange}
        onChartModeChange={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    const tablaBtn = screen.getByRole("button", { name: /tabla/i });
    await userEvent.click(tablaBtn);
    expect(onViewModeChange).toHaveBeenCalledWith("table");
  });

  it("muestra botón exportar solo en modo tabla", async () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <CategoriesToolbar
        viewMode="chart"
        chartMode="donut"
        onViewModeChange={vi.fn()}
        onChartModeChange={vi.fn()}
        onExport={onExport}
      />,
    );

    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();

    rerender(
      <CategoriesToolbar
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

describe("CategoriesChartSection", () => {
  const mockData: CategoryReportItemOut[] = [
    {
      id: 1,
      nombre: "Licores",
      total_productos: 10,
      stock_total: 50,
      stock_valorado_usd: 500,
      total_ordenes: 15,
      unidades_vendidas: 30,
      ingresos_usd: 300,
      costos_usd: 150,
      margen_usd: 150,
      margen_porcentaje: 50,
    },
    {
      id: 2,
      nombre: "Cervezas",
      total_productos: 5,
      stock_total: 100,
      stock_valorado_usd: 400,
      total_ordenes: 25,
      unidades_vendidas: 70,
      ingresos_usd: 200,
      costos_usd: 140,
      margen_usd: 60,
      margen_porcentaje: 30,
    },
  ];

  it("muestra estado vacío cuando no hay datos", () => {
    render(
      <CategoriesChartSection
        chartMode="donut"
        data={[]}
        currency="USD"
        currSymbol="$"
        conversionRate={1}
      />,
    );
    expect(screen.getByText(/sin datos de categorías/i)).toBeInTheDocument();
  });

  it("renderiza Donut chart cuando chartMode es donut", () => {
    render(
      <CategoriesChartSection
        chartMode="donut"
        data={mockData}
        currency="USD"
        currSymbol="$"
        conversionRate={1}
      />,
    );
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("renderiza Bar chart cuando chartMode es bars", () => {
    render(
      <CategoriesChartSection
        chartMode="bars"
        data={mockData}
        currency="USD"
        currSymbol="$"
        conversionRate={1}
      />,
    );
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});

describe("CategoriesTable", () => {
  const mockRows: CategoryTableRow[] = [
    {
      id: 1,
      nombre: "Licores",
      total_productos: 10,
      stock_total: 50,
      stock_valorado: 500,
      total_ordenes: 15,
      unidades_vendidas: 30,
      ingresos: 300,
      costos: 150,
      margen: 150,
      rentabilidad_pct: 50,
      participacion_pct: 60,
    },
    {
      id: 2,
      nombre: "Cervezas",
      total_productos: 5,
      stock_total: 100,
      stock_valorado: 400,
      total_ordenes: 25,
      unidades_vendidas: 70,
      ingresos: 200,
      costos: 140,
      margen: 60,
      rentabilidad_pct: 30,
      participacion_pct: 40,
    },
  ];

  it("renderiza columnas, filas formateadas y barra de participación", () => {
    render(
      <CategoriesTable
        data={mockRows}
        totalRows={2}
        page={1}
        totalPages={1}
        pageSize={10}
        tableTab="todos"
        currency="USD"
        currSymbol="$"
        onTabChange={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Categoría")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Unidades Vendidas")).toBeInTheDocument();
    expect(screen.getByText(/Ingresos/)).toBeInTheDocument();
    expect(screen.getByText(/Costos/)).toBeInTheDocument();
    expect(screen.getByText(/Margen/)).toBeInTheDocument();
    expect(screen.getByText(/Rentabilidad/)).toBeInTheDocument();
    expect(screen.getByText("Participación")).toBeInTheDocument();

    expect(screen.getByText("Licores")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("$300,00")).toBeInTheDocument();
    expect(screen.getAllByText("$150,00")).toHaveLength(2);
    expect(screen.getByText(/50(\.0)?%/)).toBeInTheDocument();
    expect(screen.getByText(/60(\.0)?%/)).toBeInTheDocument();
  });

  it("responde al cambio de pestaña (sub-tabs)", async () => {
    const onTabChange = vi.fn();
    render(
      <CategoriesTable
        data={mockRows}
        totalRows={2}
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

    const masVendidasTab = screen.getByRole("button", { name: /más vendidas/i });
    await userEvent.click(masVendidasTab);
    expect(onTabChange).toHaveBeenCalledWith("mas_vendidas");

    const mayorMargenTab = screen.getByRole("button", { name: /mayor margen/i });
    await userEvent.click(mayorMargenTab);
    expect(onTabChange).toHaveBeenCalledWith("mayor_margen");

    const menorMargenTab = screen.getByRole("button", { name: /menor margen/i });
    await userEvent.click(menorMargenTab);
    expect(onTabChange).toHaveBeenCalledWith("menor_margen");
  });

  it("renderiza paginación y responde al cambio de página", async () => {
    const onPageChange = vi.fn();
    render(
      <CategoriesTable
        data={[mockRows[0]]}
        totalRows={2}
        page={1}
        totalPages={2}
        pageSize={1}
        tableTab="todos"
        currency="USD"
        currSymbol="$"
        onTabChange={vi.fn()}
        onPageChange={onPageChange}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: /siguiente/i });
    await userEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("muestra mensaje cuando no hay categorías en la tabla", () => {
    render(
      <CategoriesTable
        data={[]}
        totalRows={0}
        page={1}
        totalPages={1}
        pageSize={10}
        tableTab="todos"
        currency="USD"
        currSymbol="$"
        onTabChange={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/no hay categorías/i)).toBeInTheDocument();
  });
});
