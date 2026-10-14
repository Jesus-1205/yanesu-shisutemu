import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import ReportsCategoriesPage from "@/features/reports/pages/ReportsCategoriesPage";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { exportToExcel } from "@/lib/exportToExcel";
import type { CategoryReportItemOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getCategoryReport: vi.fn(),
  },
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

// Mock recharts for jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: { children: ReactNode; data?: unknown[] }) => (
    <div data-testid="pie" data-count={data?.length}>
      {children}
    </div>
  ),
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const MOCK_CATEGORIES: CategoryReportItemOut[] = [
  {
    id: 1,
    nombre: "Licores",
    total_productos: 12,
    stock_total: 80,
    stock_valorado_usd: 800,
    total_ordenes: 20,
    unidades_vendidas: 50,
    ingresos_usd: 500,
    costos_usd: 250,
    margen_usd: 250,
    margen_porcentaje: 50,
  },
  {
    id: 2,
    nombre: "Cervezas",
    total_productos: 6,
    stock_total: 120,
    stock_valorado_usd: 600,
    total_ordenes: 40,
    unidades_vendidas: 100,
    ingresos_usd: 300,
    costos_usd: 210,
    margen_usd: 90,
    margen_porcentaje: 30,
  },
  {
    id: 3,
    nombre: "Snacks",
    total_productos: 4,
    stock_total: 20,
    stock_valorado_usd: 100,
    total_ordenes: 0,
    unidades_vendidas: 0,
    ingresos_usd: 0,
    costos_usd: 0,
    margen_usd: 0,
    margen_porcentaje: 0,
  },
];

function renderPage(search = "?from=2026-09-10&to=2026-10-09") {
  return render(
    <MemoryRouter initialEntries={[`/reports/categories${search}`]}>
      <Routes>
        <Route path="/reports/categories" element={<ReportsCategoriesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useExchangeRateStore.setState({ tasa: 50 });
  vi.mocked(api.getCategoryReport).mockResolvedValue(MOCK_CATEGORIES);
});

describe("ReportsCategoriesPage", () => {
  it("renders the 4 KPI cards, Toolbar, and Chart initially", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Total Facturado")).toBeInTheDocument();
      expect(screen.getByText("Categoría Principal")).toBeInTheDocument();
      expect(screen.getByText("Unidades Vendidas")).toBeInTheDocument();
      expect(screen.getByText("Margen Promedio")).toBeInTheDocument();
    });

    // KPI values: Total facturado = $800,00; Líder = Licores; Unidades = 150; Margen = 42.5%
    expect(screen.getByText("$800,00")).toBeInTheDocument();
    expect(screen.getByText("Licores")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("42.5%")).toBeInTheDocument();

    // Chart mode default is donut
    expect(screen.getByText("Distribución por Categoría")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("switches between Gráfico and Tabla views", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    const tablaBtn = screen.getByRole("button", { name: /tabla/i });
    await userEvent.click(tablaBtn);

    expect(screen.getByText("Tabla de Rendimiento de Categorías")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Más vendidas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mayor margen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menor margen" })).toBeInTheDocument();

    // Verify rows in table
    expect(screen.getAllByText("Licores").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cervezas")).toBeInTheDocument();
    expect(screen.getByText("Snacks")).toBeInTheDocument();
  });

  it("switches between Donut and Bars in chart mode", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    const comparativaBtn = screen.getByRole("button", { name: /comparativa/i });
    await userEvent.click(comparativaBtn);

    await waitFor(() => {
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
      expect(screen.getByText("Comparativa de Categorías")).toBeInTheDocument();
    });
  });

  it("filters table data with sub-tabs", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    const tablaBtn = screen.getByRole("button", { name: /tabla/i });
    await userEvent.click(tablaBtn);

    // Click Más vendidas
    const masVendidasTab = screen.getByRole("button", { name: "Más vendidas" });
    await userEvent.click(masVendidasTab);
    expect(masVendidasTab).toHaveClass("bg-brand-blue");

    // Click Mayor margen
    const mayorMargenTab = screen.getByRole("button", { name: "Mayor margen" });
    await userEvent.click(mayorMargenTab);
    expect(mayorMargenTab).toHaveClass("bg-brand-blue");
  });

  it("calls exportToExcel when clicking Exportar Excel in table mode", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    const tablaBtn = screen.getByRole("button", { name: /tabla/i });
    await userEvent.click(tablaBtn);

    const exportBtn = screen.getByRole("button", { name: /exportar excel/i });
    expect(exportBtn).toBeInTheDocument();
    await userEvent.click(exportBtn);

    expect(exportToExcel).toHaveBeenCalledTimes(1);
    expect(exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "reporte_categorias_todos_usd",
      }),
    );
  });

  it("supports VES currency mode using exchange rate store", async () => {
    // tasa = 50, total $800 => 800 * 50 = Bs 40.000,00
    renderPage("?from=2026-09-10&to=2026-10-09&currency=VES");

    await waitFor(() => {
      expect(screen.getByText("Bs 40.000,00")).toBeInTheDocument();
    });
  });

  it("renders ErrorBanner when fetch fails and allows retry", async () => {
    vi.mocked(api.getCategoryReport).mockRejectedValueOnce(new Error("Error al obtener categorías"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error al obtener categorías")).toBeInTheDocument();
    });

    const reintentarBtn = screen.getByRole("button", { name: /reintentar/i });
    await userEvent.click(reintentarBtn);

    await waitFor(() => {
      expect(screen.getByText("Total Facturado")).toBeInTheDocument();
      expect(screen.getByText("$800,00")).toBeInTheDocument();
    });
  });
});
