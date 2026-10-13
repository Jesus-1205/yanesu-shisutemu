import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useProductsReport } from "@/features/reports/hooks/useProductsReport";
import type { ProductTableTab } from "@/features/reports/types";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

vi.mock("@/services/api", () => ({
  api: {
    getProductsMatrix: vi.fn(),
  },
}));

const mockMatrixData = [
  {
    id: 1,
    nombre: "Ron Cacique",
    total_vendido: 38,
    precio_unidad_usd: 10,
    precio_costo_usd: 5,
    margen_porcentaje: 50,
    stock_unidades: 24,
  },
  {
    id: 2,
    nombre: "Whisky Black Label",
    total_vendido: 12,
    precio_unidad_usd: 30,
    precio_costo_usd: 18,
    margen_porcentaje: 40,
    stock_unidades: 8,
  },
  {
    id: 3,
    nombre: "Producto Sin Venta",
    total_vendido: 0,
    precio_unidad_usd: 5,
    precio_costo_usd: 3,
    margen_porcentaje: 40,
    stock_unidades: 100,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getProductsMatrix).mockResolvedValue(mockMatrixData);
  useExchangeRateStore.setState({ tasa: 40 });
});

describe("useProductsReport", () => {
  it("inicia en loading=true y luego carga datos", async () => {
    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.rawData).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rawData).toEqual(mockMatrixData);
    expect(result.current.currSymbol).toBe("$");
  });

  it("calcula kpis correctamente", async () => {
    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 38 + 12 = 50 totalUnidades
    expect(result.current.kpis.totalUnidades).toBe(50);
    // Ron Cacique tiene 38 unidades
    expect(result.current.kpis.lider?.nombre).toBe("Ron Cacique");
    // (50 + 40) / 2 = 45 margenPromedio
    expect(result.current.kpis.margenPromedio).toBe(45);
    // 1 producto sin rotación
    expect(result.current.kpis.sinRotacion).toBe(1);
  });

  it("calcula valores monetarios en USD y VES correctamente", async () => {
    const { result: resUsd } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(resUsd.current.loading).toBe(false);
    });

    // Ron Cacique en USD: 10 * 38 = 380 ingresos, 5 * 38 = 190 costos, 190 margen
    const ronUsd = resUsd.current.tableData.find((p) => p.id === 1)!;
    expect(ronUsd.ingresos).toBe(380);
    expect(ronUsd.costos).toBe(190);
    expect(ronUsd.margen).toBe(190);

    const { result: resVes } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "VES",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(resVes.current.loading).toBe(false);
    });

    expect(resVes.current.currSymbol).toBe("Bs ");
    expect(resVes.current.conversionRate).toBe(40);
    // Ron Cacique en VES: 380 * 40 = 15200 ingresos, 190 * 40 = 7600 costos
    const ronVes = resVes.current.tableData.find((p) => p.id === 1)!;
    expect(ronVes.ingresos).toBe(15200);
    expect(ronVes.costos).toBe(7600);
    expect(ronVes.margen).toBe(7600);
  });

  it("filtra por pestañas de tabla correctamente", async () => {
    const { result, rerender } = renderHook(
      ({ tab }: { tab: ProductTableTab }) =>
        useProductsReport({
          from: "2026-09-10",
          to: "2026-10-09",
          currency: "USD",
          tableTab: tab,
          page: 1,
          pageSize: 10,
        }),
      { initialProps: { tab: "sin_rotacion" as ProductTableTab } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tableData).toHaveLength(1);
    expect(result.current.tableData[0].nombre).toBe("Producto Sin Venta");

    rerender({ tab: "mas_vendidos" });
    expect(result.current.tableData).toHaveLength(2);
    expect(result.current.tableData[0].nombre).toBe("Ron Cacique");
  });

  it("pagina los datos correctamente", async () => {
    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 2,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.totalRows).toBe(3);
    expect(result.current.paginatedData).toHaveLength(2);
  });

  it("maneja errores y permite retry()", async () => {
    vi.mocked(api.getProductsMatrix).mockRejectedValueOnce(new Error("Error de conexión"));

    const { result } = renderHook(() =>
      useProductsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Error de conexión");
    });

    vi.mocked(api.getProductsMatrix).mockResolvedValueOnce(mockMatrixData);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.rawData).toEqual(mockMatrixData);
    });
  });
});
