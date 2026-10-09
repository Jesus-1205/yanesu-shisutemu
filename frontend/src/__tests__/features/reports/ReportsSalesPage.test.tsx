import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReportsSalesPage from "@/features/reports/pages/ReportsSalesPage";
import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";

vi.mock("@/services/api", () => ({
  api: {
    getSalesSummary: vi.fn(),
  },
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

const mockSalesData = [
  {
    periodo: "2026-10-01",
    total_ventas: 10,
    total_usd: 1000,
    total_ves: 860000,
    costo_usd: 700,
    margen_usd: 300,
  },
  {
    periodo: "2026-10-02",
    total_ventas: 15,
    total_usd: 1500,
    total_ves: 1290000,
    costo_usd: 1000,
    margen_usd: 500,
  },
];

function renderWithRouter(initialEntry = "/reports/sales") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/reports/sales" element={<ReportsSalesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesData);
});

describe("ReportsSalesPage", () => {
  it("renders micro-KPI cards and loads sales summary", async () => {
    renderWithRouter();

    expect(screen.getByText("Ingresos Brutos")).toBeInTheDocument();
    expect(screen.getByText("Costo Mercancía")).toBeInTheDocument();
    expect(screen.getByText("Margen de Ganancia")).toBeInTheDocument();
    expect(screen.getByText("N° de Ventas")).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getSalesSummary).toHaveBeenCalledWith({
        rango: "diario",
        fecha_desde: undefined,
        fecha_hasta: undefined,
      });
    });

    // Check calculated totals: 1000 + 1500 = 2500
    await waitFor(() => {
      expect(screen.getByText("$2.500,00")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument(); // 10 + 15 ventas
    });
  });

  it("switches grouping to semanal and mensual", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(api.getSalesSummary).toHaveBeenCalledTimes(1);
    });

    const semanalBtn = screen.getByRole("button", { name: /semanal/i });
    await userEvent.click(semanalBtn);

    await waitFor(() => {
      expect(api.getSalesSummary).toHaveBeenCalledWith({
        rango: "semanal",
        fecha_desde: undefined,
        fecha_hasta: undefined,
      });
    });
  });

  it("toggles between chart and table view", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Evolución de Ventas vs. Costos")).toBeInTheDocument();
    });

    const tableBtn = screen.getByRole("button", { name: /tabla/i });
    await userEvent.click(tableBtn);

    await waitFor(() => {
      expect(screen.getByText("Tabla de Desglose de Ventas")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /exportar excel/i })).toBeInTheDocument();
      expect(screen.getByText("Rentabilidad")).toBeInTheDocument();
    });

    // Click Export Excel
    const exportBtn = screen.getByRole("button", { name: /exportar excel/i });
    await userEvent.click(exportBtn);

    expect(exportToExcel).toHaveBeenCalledTimes(1);
  });

  it("adapts numbers when currency is set to VES via search params", async () => {
    renderWithRouter("/reports/sales?currency=VES");

    await waitFor(() => {
      // 860,000 + 1,290,000 = 2,150,000 Bs
      expect(screen.getByText("Bs 2.150.000,00")).toBeInTheDocument();
    });
  });

  it("renders grouping and view mode controls", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /diario/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /semanal/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /mensual/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /gráfico/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /tabla/i })).toBeInTheDocument();
    });
  });
});
