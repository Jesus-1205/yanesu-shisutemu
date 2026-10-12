import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReportsProductsPage from "@/features/reports/pages/ReportsProductsPage";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getProductsMatrix: vi.fn(),
  },
}));

vi.mock("@/features/reports/components/RentabilityScatterChart", () => ({
  default: () => <div data-testid="scatter-chart">ScatterChart</div>,
}));

vi.mock("@/features/reports/components/ProductsTop10Chart", () => ({
  default: () => <div data-testid="top10-chart">Top10Chart</div>,
}));

const MOCK_MATRIX = [
  {
    id: 1, nombre: "Ron Cacique", total_vendido: 38,
    precio_unidad_usd: 10, precio_costo_usd: 5, margen_porcentaje: 50, stock_unidades: 24,
  },
  {
    id: 2, nombre: "Whisky Black Label", total_vendido: 12,
    precio_unidad_usd: 30, precio_costo_usd: 18, margen_porcentaje: 40, stock_unidades: 8,
  },
  {
    id: 3, nombre: "Producto Sin Venta", total_vendido: 0,
    precio_unidad_usd: 5, precio_costo_usd: 3, margen_porcentaje: 40, stock_unidades: 100,
  },
];

function renderPage(search = "?from=2026-09-10&to=2026-10-09") {
  render(
    <MemoryRouter initialEntries={[`/reports/products${search}`]}>
      <Routes>
        <Route path="/reports/products" element={<ReportsProductsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getProductsMatrix).mockResolvedValue(MOCK_MATRIX);
});

describe("ReportsProductsPage", () => {
  it("renders KPI cards", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Unidades Vendidas")).toBeInTheDocument();
      expect(screen.getByText("Producto Líder")).toBeInTheDocument();
      expect(screen.getByText("Margen Promedio")).toBeInTheDocument();
      expect(screen.getByText("Sin Rotación")).toBeInTheDocument();
    });
  });

  it("shows correct KPI values after load", async () => {
    renderPage();
    await waitFor(() => {
      // 38 + 12 = 50 total vendidos
      expect(screen.getByText("50")).toBeInTheDocument();
      // leader product
      expect(screen.getByText("Ron Cacique")).toBeInTheDocument();
      // 1 product without sales
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("renders scatter chart by default", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("scatter-chart")).toBeInTheDocument();
    });
  });

  it("switches to top10 chart mode", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("scatter-chart"));
    await userEvent.click(screen.getByRole("button", { name: /top 10/i }));
    expect(screen.getByTestId("top10-chart")).toBeInTheDocument();
  });

  it("switches to table mode and shows sub-tabs", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("scatter-chart"));
    await userEvent.click(screen.getByRole("button", { name: /tabla/i }));
    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Más Vendidos")).toBeInTheDocument();
    expect(screen.getByText("Mayor Margen")).toBeInTheDocument();
    expect(screen.getByText("Menor Margen")).toBeInTheDocument();
    // "Sin Rotación" appears in both KPI card and table tab button
    expect(screen.getAllByText(/Sin Rotación/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows product rows in table mode", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("scatter-chart"));
    await userEvent.click(screen.getByRole("button", { name: /tabla/i }));
    await waitFor(() => {
      // Product names appear in both KPI "Producto Líder" card and table rows
      expect(screen.getAllByText("Ron Cacique").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Whisky Black Label")).toBeInTheDocument();
    });
  });

  it("filters to sin-rotacion tab correctly", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("scatter-chart"));
    await userEvent.click(screen.getByRole("button", { name: /tabla/i }));
    const sinRotBtn = screen.getAllByRole("button").find((b) => b.textContent?.includes("Sin Rotación"));
    await userEvent.click(sinRotBtn!);
    await waitFor(() => {
      expect(screen.getByText("Producto Sin Venta")).toBeInTheDocument();
      // "Ron Cacique" may still appear in the KPI "Producto Líder" card; verify it's not in any table cell
      const cells = screen.queryAllByRole("cell");
      const cellTexts = cells.map((c) => c.textContent ?? "");
      expect(cellTexts.some((t) => t.includes("Ron Cacique"))).toBe(false);
    });
  });

  it("calls getProductsMatrix with correct dates", async () => {
    renderPage();
    await waitFor(() => {
      expect(api.getProductsMatrix).toHaveBeenCalledWith({
        fecha_desde: "2026-09-10",
        fecha_hasta: "2026-10-09",
        limit: 200,
      });
    });
  });

  it("handles VES currency and displays formatted VES headers", async () => {
    renderPage("?from=2026-09-10&to=2026-10-09&currency=VES");
    await waitFor(() => screen.getByTestId("scatter-chart"));
    await userEvent.click(screen.getByRole("button", { name: /tabla/i }));
    expect(screen.getByText("Ingresos (VES)")).toBeInTheDocument();
    expect(screen.getByText("Costos (VES)")).toBeInTheDocument();
    expect(screen.getByText("Margen (VES)")).toBeInTheDocument();
  });
});
