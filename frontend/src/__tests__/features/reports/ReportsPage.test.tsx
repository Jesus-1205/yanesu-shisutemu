import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportsPage from "../../../features/reports/pages/ReportsPage";
import { ToastProvider } from "../../../ui-components/Toast";
import type { ReactNode } from "react";

const mockCategoryAnalytics = {
  total_categorias: 2,
  total_productos: 5,
  stock_total: 100,
  margen_promedio_general: 25,
  unidades_vendidas: 200,
  ingresos_usd: 5000,
  categorias: [
    { id: 1, nombre: "Bebidas", total_productos: 3, stock_total: 60, margen_promedio: 30, unidades_vendidas: 120, ingresos_usd: 3000 },
    { id: 2, nombre: "Snacks", total_productos: 2, stock_total: 40, margen_promedio: 20, unidades_vendidas: 80, ingresos_usd: 2000 },
  ],
};

const mockSupplierAnalytics = {
  total_proveedores: 1,
  total_productos: 5,
  stock_total: 100,
  margen_promedio_general: 25,
  unidades_vendidas: 200,
  ingresos_usd: 5000,
  proveedores: [
    { id: 1, nombre: "Distribuidora ABC", telefono: null, email: null, total_productos: 5, stock_total: 100, margen_promedio: 25, unidades_vendidas: 200, ingresos_usd: 5000 },
  ],
};

vi.mock("@/services/api", () => ({
  api: {
    getSalesSummary: vi.fn().mockResolvedValue([]),
    getTopWeek: vi.fn().mockResolvedValue(null),
    getTopSellingProducts: vi.fn().mockResolvedValue([]),
    getTopMarginProducts: vi.fn().mockResolvedValue([]),
    getLowestMarginProducts: vi.fn().mockResolvedValue([]),
    getLowRotationProducts: vi.fn().mockResolvedValue([]),
    getProductsMatrix: vi.fn().mockResolvedValue([]),
    getCategoryAnalytics: vi.fn(),
    getTopSellingCategories: vi.fn().mockResolvedValue([]),
    getLowRotationCategories: vi.fn().mockResolvedValue([]),
    getSupplierAnalytics: vi.fn(),
  },
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

vi.mock("../components/VentasVsCostosChart", () => ({
  default: () => <div data-testid="chart-ventas">Chart</div>,
}));

vi.mock("../components/RentabilityScatterChart", () => ({
  default: () => <div data-testid="chart-rentabilidad">Chart</div>,
}));

vi.mock("../components/CategorySalesDonut", () => ({
  default: () => <div data-testid="chart-categorias">Chart</div>,
}));

vi.mock("../components/SupplierComparisonBar", () => ({
  default: () => <div data-testid="chart-proveedores">Chart</div>,
}));

import { api } from "@/services/api";

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getSalesSummary).mockResolvedValue([]);
  vi.mocked(api.getTopWeek).mockResolvedValue(null as never);
  vi.mocked(api.getTopSellingProducts).mockResolvedValue([]);
  vi.mocked(api.getTopMarginProducts).mockResolvedValue([]);
  vi.mocked(api.getLowestMarginProducts).mockResolvedValue([]);
  vi.mocked(api.getLowRotationProducts).mockResolvedValue([]);
  vi.mocked(api.getProductsMatrix).mockResolvedValue([]);
  vi.mocked(api.getCategoryAnalytics).mockResolvedValue(mockCategoryAnalytics as never);
  vi.mocked(api.getTopSellingCategories).mockResolvedValue([]);
  vi.mocked(api.getLowRotationCategories).mockResolvedValue([]);
  vi.mocked(api.getSupplierAnalytics).mockResolvedValue(mockSupplierAnalytics as never);
});

describe("ReportsPage", () => {
  it("renders the page header", async () => {
    render(<ReportsPage />, { wrapper });
    expect(screen.getByText("Panel de Control")).toBeInTheDocument();
    expect(screen.getByText("Estadísticas detalladas del sistema")).toBeInTheDocument();
  });

  it("renders the tab bar", async () => {
    render(<ReportsPage />, { wrapper });
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Categorías")).toBeInTheDocument();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
  });

  it("starts on Resumen tab", async () => {
    render(<ReportsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Resumen de Ventas")).toBeInTheDocument();
    });
  });

  it("switches to Productos tab on click", async () => {
    render(<ReportsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Resumen de Ventas")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Productos"));
    await waitFor(() => {
      expect(screen.getByText("Más Vendidos")).toBeInTheDocument();
    });
  }, 10000);

  it("switches to Categorías tab on click", async () => {
    render(<ReportsPage />, { wrapper });
    await userEvent.click(screen.getByText("Categorías"));
    await waitFor(() => {
      expect(screen.getByText("Detalle por Categoría")).toBeInTheDocument();
    });
  });

  it("switches to Proveedores tab on click", async () => {
    render(<ReportsPage />, { wrapper });
    await userEvent.click(screen.getByText("Proveedores"));
    await waitFor(() => {
      expect(screen.getByText("Detalle por Proveedor")).toBeInTheDocument();
    });
  });

  it("calls API on mount", async () => {
    render(<ReportsPage />, { wrapper });
    await waitFor(() => {
      expect(api.getSalesSummary).toHaveBeenCalled();
      expect(api.getTopWeek).toHaveBeenCalled();
      expect(api.getTopSellingProducts).toHaveBeenCalled();
    });
  });

  it("renders rango select in Resumen tab", async () => {
    render(<ReportsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Ventas vs. Costos vs. Margen")).toBeInTheDocument();
    });
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });
});
