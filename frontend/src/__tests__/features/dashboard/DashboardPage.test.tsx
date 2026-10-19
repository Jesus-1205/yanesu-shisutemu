import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import { api } from "@/services/api";
import type {
  DashboardStatsOut,
  InvoicePendingSummaryOut,
  InvoiceStatsOut,
  ProductOut,
  SalesSummaryItem,
} from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getDashboardStats: vi.fn(),
    getSalesSummary: vi.fn(),
    getTopSellingProducts: vi.fn(),
    getInvoiceStats: vi.fn(),
    getInvoicePendingSummary: vi.fn(),
  },
}));

vi.mock("@/features/dashboard/components/SalesTrendChart", () => ({
  default: () => <div data-testid="sales-trend-chart">SalesTrendChart</div>,
}));

vi.mock("@/features/dashboard/components/TopProductsBarChart", () => ({
  default: () => <div data-testid="top-products-chart">TopProductsBarChart</div>,
}));

const mockProduct: ProductOut = {
  id: 1,
  codigo_barra: "7591234567890",
  nombre: "Ron Cacique Añejo",
  categories: [],
  unidades_por_caja: 12,
  stock_cajas: 5,
  stock_unidades: 60,
  stock_minimo: 10,
  precio_costo_caja_usd: 60.0,
  precio_costo_usd: 5.0,
  precio_unidad_usd: 8.5,
  precio_caja_usd: 100.0,
  precio_sugerido_unidad_usd: 8.5,
  precio_sugerido_caja_usd: 100.0,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

const mockStats: DashboardStatsOut = {
  total_productos: 45,
  sin_stock: 3,
  total_categorias: 8,
  total_proveedores: 12,
};

const mockSalesSummary: SalesSummaryItem[] = [
  {
    periodo: "2025-W01",
    total_usd: 1200.0,
    total_ves: 54000.0,
    total_ventas: 30,
    costo_usd: 800.0,
    margen_usd: 400.0,
  },
  {
    periodo: "2025-W02",
    total_usd: 1850.5,
    total_ves: 83272.5,
    total_ventas: 45,
    costo_usd: 1100.0,
    margen_usd: 750.5,
  },
];

const mockInvoiceStats: InvoiceStatsOut = {
  pendientes: 2,
  parciales: 1,
  pagadas: 10,
  total: 13,
};

const mockPendingSummary: InvoicePendingSummaryOut = {
  total_pendiente_usd: 1450.0,
  total_facturas_pendientes: 3,
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el spinner durante la carga inicial", () => {
    vi.mocked(api.getDashboardStats).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getSalesSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTopSellingProducts).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getInvoiceStats).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getInvoicePendingSummary).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Punto de Venta")).not.toBeInTheDocument();
  });

  it("carga y muestra los accesos directos y KPIs cuando todas las llamadas son exitosas", async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesSummary);
    vi.mocked(api.getTopSellingProducts).mockResolvedValue([
      { producto: mockProduct, total_vendido: 120 },
    ]);
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockInvoiceStats);
    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue(mockPendingSummary);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    // Accesos directos
    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getAllByText("Productos").length).toBeGreaterThan(0);
    expect(screen.getByText("Facturas")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();

    // KPIs
    expect(screen.getByText("45")).toBeInTheDocument(); // total_productos
    expect(screen.getByText("8")).toBeInTheDocument(); // total_categorias
    expect(screen.getByText("12")).toBeInTheDocument(); // total_proveedores
    expect(screen.getByText("3")).toBeInTheDocument(); // sin_stock
    expect(screen.getByText("$1.850,50")).toBeInTheDocument(); // última semana ventas
    expect(screen.getByText("$1.450,00")).toBeInTheDocument(); // facturas pendientes
    expect(
      screen.getByText("Facturas pendientes — 3 facturas sin pagar"),
    ).toBeInTheDocument();
  });

  it("renderiza texto singular cuando hay exactamente 1 factura sin pagar", async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(api.getSalesSummary).mockResolvedValue([]);
    vi.mocked(api.getTopSellingProducts).mockResolvedValue([]);
    vi.mocked(api.getInvoiceStats).mockResolvedValue({
      pendientes: 1,
      parciales: 0,
      pagadas: 5,
      total: 6,
    });
    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue({
      total_pendiente_usd: 250.0,
      total_facturas_pendientes: 1,
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Facturas pendientes — 1 factura sin pagar"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("$250,00")).toBeInTheDocument();
  });

  it("maneja fallos en las peticiones sin que la pantalla colapse (tolerancia a fallos)", async () => {
    vi.mocked(api.getDashboardStats).mockRejectedValue(new Error("Network error"));
    vi.mocked(api.getSalesSummary).mockRejectedValue(new Error("Sales error"));
    vi.mocked(api.getTopSellingProducts).mockRejectedValue(new Error("Top products error"));
    vi.mocked(api.getInvoiceStats).mockRejectedValue(new Error("Invoice stats error"));
    vi.mocked(api.getInvoicePendingSummary).mockRejectedValue(new Error("Pending error"));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    // Debe mostrar valores por defecto seguros
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(
      screen.getByText("Facturas pendientes — 0 facturas sin pagar"),
    ).toBeInTheDocument();
  });

  it("renderiza el titulo y subtitulo descriptivo del dashboard", async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesSummary);
    vi.mocked(api.getTopSellingProducts).mockResolvedValue([]);
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockInvoiceStats);
    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue(mockPendingSummary);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByText("Resumen general y métricas clave del negocio")).toBeInTheDocument();
    });
  });
});
