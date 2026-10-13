import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSalesSummary } from "@/features/reports/hooks/useSalesSummary";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getSalesSummary: vi.fn(),
  },
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getSalesSummary).mockResolvedValue(mockSalesData);
});

describe("useSalesSummary", () => {
  it("inicia en loading=true y luego carga datos", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.rawData).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rawData).toEqual(mockSalesData);
  });

  it("calcula totales correctamente en USD", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totals.totalVentas).toBe(25);
    expect(result.current.totals.ingresos).toBe(2500);
    expect(result.current.totals.costos).toBe(1700);
    expect(result.current.totals.margen).toBe(800);
    expect(result.current.totals.margenPct).toBeCloseTo(32.0, 1);
  });

  it("calcula totales y costos proporcionales en VES", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "VES",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totals.ingresos).toBe(2150000);
    // ratio = 2150000 / 2500 = 860. Costos VES = 1700 * 860 = 1462000
    expect(result.current.totals.costos).toBe(1462000);
    expect(result.current.totals.margen).toBe(688000);
  });

  it("transforma chartData y tableData en orden inverso", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.chartData).toHaveLength(2);
    expect(result.current.chartData[0].periodoRaw).toBe("2026-10-01");
    expect(result.current.chartData[1].periodoRaw).toBe("2026-10-02");

    // tableData debe ser descendente (más reciente primero)
    expect(result.current.tableData[0].periodoRaw).toBe("2026-10-02");
    expect(result.current.tableData[1].periodoRaw).toBe("2026-10-01");
  });

  it("pagina tableData correctamente", async () => {
    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedData).toHaveLength(1);
    expect(result.current.paginatedData[0].periodoRaw).toBe("2026-10-02");
  });

  it("maneja errores de la API correctamente", async () => {
    vi.mocked(api.getSalesSummary).mockRejectedValueOnce(new Error("Fallo de red"));

    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Fallo de red");
  });

  it("reintenta la carga al llamar a retry()", async () => {
    vi.mocked(api.getSalesSummary).mockRejectedValueOnce(new Error("Fallo"));

    const { result } = renderHook(() =>
      useSalesSummary({
        grouping: "diario",
        from: "2026-10-01",
        to: "2026-10-02",
        currency: "USD",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Fallo");
    });

    vi.mocked(api.getSalesSummary).mockResolvedValueOnce(mockSalesData);

    result.current.retry();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.rawData).toEqual(mockSalesData);
    });
  });
});
