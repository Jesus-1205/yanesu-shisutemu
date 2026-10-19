import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useDashboardData,
  getDashboardWeeklyDateRange,
} from "@/features/dashboard/hooks/useDashboardData";
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

const mockStats: DashboardStatsOut = {
  total_productos: 50,
  sin_stock: 4,
  total_categorias: 10,
  total_proveedores: 15,
};

const mockSalesSummary: SalesSummaryItem[] = [
  {
    periodo: "2025-W01",
    total_usd: 1000.0,
    total_ves: 45000.0,
    total_ventas: 20,
    costo_usd: 600.0,
    margen_usd: 400.0,
  },
  {
    periodo: "2025-W02",
    total_usd: 1500.0,
    total_ves: 67500.0,
    total_ventas: 35,
    costo_usd: 900.0,
    margen_usd: 600.0,
  },
];

const mockInvoiceStats: InvoiceStatsOut = {
  pendientes: 3,
  parciales: 2,
  pagadas: 8,
  total: 13,
};

const mockPendingSummary: InvoicePendingSummaryOut = {
  total_pendiente_usd: 1200.0,
  total_facturas_pendientes: 5,
};

describe("getDashboardWeeklyDateRange", () => {
  it("calcula fechaDesde y fechaHasta correctamente con base en un domingo de referencia", () => {
    // 2025-06-15 es domingo (getDay() === 0)
    const sunday = new Date(2025, 5, 15, 12, 0, 0);
    const { fechaDesde, fechaHasta } = getDashboardWeeklyDateRange(sunday);

    expect(fechaHasta).toBe("2025-06-15");
    // 41 días antes de 2025-06-15 es 2025-05-05
    expect(fechaDesde).toBe("2025-05-05");
  });
});

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia con loading=true y datos iniciales vacíos/nulos", () => {
    vi.mocked(api.getDashboardStats).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getSalesSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTopSellingProducts).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getInvoiceStats).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getInvoicePendingSummary).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.salesSummary).toEqual([]);
    expect(result.current.ventasSemana).toBeNull();
    expect(result.current.topProducts).toEqual([]);
    expect(result.current.pendingSummary).toBeNull();
    expect(result.current.pendingCount).toBe(0);
  });

  it("recupera y asigna los datos correctamente cuando las llamadas se completan", async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesSummary);
    vi.mocked(api.getTopSellingProducts).mockResolvedValue([
      { producto: mockProduct, total_vendido: 40 },
    ]);
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockInvoiceStats);
    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue(mockPendingSummary);

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.salesSummary).toEqual(mockSalesSummary);
    expect(result.current.ventasSemana).toEqual(mockSalesSummary[1]);
    expect(result.current.topProducts).toEqual([
      { producto: mockProduct, total_vendido: 40 },
    ]);
    expect(api.getInvoiceStats).not.toHaveBeenCalled();
    expect(result.current.pendingSummary).toEqual(mockPendingSummary);
    expect(result.current.pendingCount).toBe(5);
  });

  it("soporta reintento/refetch actualizando los datos", async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(mockStats);
    vi.mocked(api.getSalesSummary).mockResolvedValue([]);
    vi.mocked(api.getTopSellingProducts).mockResolvedValue([]);
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockInvoiceStats);
    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue(mockPendingSummary);

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.salesSummary).toEqual([]);

    vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesSummary);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.salesSummary).toEqual(mockSalesSummary);
    expect(result.current.ventasSemana).toEqual(mockSalesSummary[1]);
  });

  it("conserva la robustez si algunas llamadas son rechazadas", async () => {
    vi.mocked(api.getDashboardStats).mockRejectedValue(new Error("Stats error"));
    vi.mocked(api.getSalesSummary).mockRejectedValue(new Error("Sales error"));
    vi.mocked(api.getTopSellingProducts).mockRejectedValue(new Error("Top products error"));
    vi.mocked(api.getInvoiceStats).mockRejectedValue(new Error("Invoice stats error"));
    vi.mocked(api.getInvoicePendingSummary).mockRejectedValue(new Error("Pending error"));

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toBeNull();
    expect(result.current.salesSummary).toEqual([]);
    expect(result.current.ventasSemana).toBeNull();
    expect(result.current.topProducts).toEqual([]);
    expect(result.current.pendingSummary).toBeNull();
    expect(result.current.pendingCount).toBe(0);
  });
});
