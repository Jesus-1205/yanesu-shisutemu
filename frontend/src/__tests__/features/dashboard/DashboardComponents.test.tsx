import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardShortcuts from "@/features/dashboard/components/DashboardShortcuts";
import DashboardKpis from "@/features/dashboard/components/DashboardKpis";
import DashboardCharts from "@/features/dashboard/components/DashboardCharts";
import type { DashboardStatsOut, InvoicePendingSummaryOut, ProductOut, SalesSummaryItem } from "@/types/api";

vi.mock("@/features/dashboard/components/SalesTrendChart", () => ({
  default: () => <div data-testid="sales-trend-chart">SalesTrendChart</div>,
}));

vi.mock("@/features/dashboard/components/TopProductsBarChart", () => ({
  default: () => <div data-testid="top-products-chart">TopProductsBarChart</div>,
}));

const mockProduct: ProductOut = {
  id: 1,
  codigo_barra: "7591234567890",
  nombre: "Ron Cacique",
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

describe("DashboardShortcuts", () => {
  it("renderiza todos los accesos directos con sus enlaces respectivos", () => {
    render(
      <MemoryRouter>
        <DashboardShortcuts />
      </MemoryRouter>,
    );

    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Facturas")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/sales/new")).toBe(true);
    expect(links.some((l) => l.getAttribute("href") === "/products")).toBe(true);
    expect(links.some((l) => l.getAttribute("href") === "/invoices")).toBe(true);
    expect(links.some((l) => l.getAttribute("href") === "/sales")).toBe(true);
  });
});

describe("DashboardKpis", () => {
  const mockStats: DashboardStatsOut = {
    total_productos: 25,
    sin_stock: 2,
    total_categorias: 6,
    total_proveedores: 9,
  };

  const mockVentasSemana: SalesSummaryItem = {
    periodo: "2025-W10",
    total_usd: 850.25,
    total_ves: 38261.25,
    total_ventas: 18,
    costo_usd: 500,
    margen_usd: 350.25,
  };

  const mockPendingSummary: InvoicePendingSummaryOut = {
    total_pendiente_usd: 600.0,
    total_facturas_pendientes: 4,
  };

  it("renderiza las tarjetas de KPI y la sección de facturas pendientes con datos", () => {
    render(
      <MemoryRouter>
        <DashboardKpis
          stats={mockStats}
          ventasSemana={mockVentasSemana}
          pendingSummary={mockPendingSummary}
          pendingCount={4}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("$850,25")).toBeInTheDocument();
    expect(screen.getByText("$600,00")).toBeInTheDocument();
    expect(screen.getByText("Facturas pendientes — 4 facturas sin pagar")).toBeInTheDocument();
  });

  it("renderiza valores por defecto si stats y ventasSemana son nulos", () => {
    render(
      <MemoryRouter>
        <DashboardKpis
          stats={null}
          ventasSemana={null}
          pendingSummary={null}
          pendingCount={0}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("Facturas pendientes — 0 facturas sin pagar")).toBeInTheDocument();
  });
});

describe("DashboardCharts", () => {
  it("renderiza los contenedores de gráficos", async () => {
    render(
      <DashboardCharts
        salesSummary={[]}
        topProducts={[{ producto: mockProduct, total_vendido: 10 }]}
      />,
    );

    expect(screen.getByText("Ventas Semanales — Últimas 5 Semanas")).toBeInTheDocument();
    expect(screen.getByText("Top 5 Más Vendidos — Histórico")).toBeInTheDocument();
    expect(await screen.findByTestId("sales-trend-chart")).toBeInTheDocument();
    expect(await screen.findByTestId("top-products-chart")).toBeInTheDocument();
  });
});
