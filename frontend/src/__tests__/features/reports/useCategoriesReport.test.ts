import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCategoriesReport } from "@/features/reports/hooks/useCategoriesReport";
import type { CategoryTableTab } from "@/features/reports/types";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

vi.mock("@/services/api", () => ({
  api: {
    getCategoryReport: vi.fn(),
  },
}));

const mockCategories = [
  {
    id: 1,
    nombre: "Licores",
    total_productos: 10,
    stock_total: 50,
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
    unidades_vendidas: 70,
    ingresos_usd: 200,
    costos_usd: 140,
    margen_usd: 60,
    margen_porcentaje: 30,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getCategoryReport).mockResolvedValue(mockCategories);
  useExchangeRateStore.setState({ tasa: 50 });
});

describe("useCategoriesReport", () => {
  it("inicia en loading=true y carga datos de categorías", async () => {
    const { result } = renderHook(() =>
      useCategoriesReport({
        from: "2026-09-01",
        to: "2026-09-30",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rawData).toEqual(mockCategories);
    expect(result.current.currSymbol).toBe("$");
    expect(result.current.conversionRate).toBe(1);
    expect(result.current.kpis.totalIngresos).toBe(500);
    expect(result.current.kpis.totalUnidades).toBe(100);
    expect(result.current.kpis.lider?.nombre).toBe("Licores");
    expect(result.current.kpis.margenPromedio).toBe(42);
  });

  it("aplica tasa de conversión cuando currency es VES", async () => {
    const { result } = renderHook(() =>
      useCategoriesReport({
        from: "2026-09-01",
        to: "2026-09-30",
        currency: "VES",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.conversionRate).toBe(50);
    expect(result.current.currSymbol).toBe("Bs ");
    expect(result.current.kpis.totalIngresos).toBe(25000); // 500 * 50

    const licores = result.current.tableData.find((c) => c.id === 1)!;
    expect(licores.ingresos).toBe(15000); // 300 * 50
    expect(licores.costos).toBe(7500); // 150 * 50
    expect(licores.margen).toBe(7500); // 15000 - 7500
  });

  it("calcula participacion_pct y rentabilidad_pct correctamente en la tabla", async () => {
    const { result } = renderHook(() =>
      useCategoriesReport({
        from: "2026-09-01",
        to: "2026-09-30",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const licores = result.current.tableData.find((c) => c.id === 1)!;
    const cervezas = result.current.tableData.find((c) => c.id === 2)!;

    // Participación: Licores 300 / 500 = 60%, Cervezas 200 / 500 = 40%
    expect(licores.participacion_pct).toBe(60);
    expect(licores.rentabilidad_pct).toBe(50);
    expect(cervezas.participacion_pct).toBe(40);
    expect(cervezas.rentabilidad_pct).toBe(30);
  });

  it("filtra y ordena correctamente por sub-pestañas", async () => {
    const { result, rerender } = renderHook(
      ({ tab }: { tab: CategoryTableTab }) =>
        useCategoriesReport({
          from: "2026-09-01",
          to: "2026-09-30",
          currency: "USD",
          tableTab: tab,
          page: 1,
          pageSize: 10,
        }),
      { initialProps: { tab: "todos" as CategoryTableTab } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // 'todos': orden descendente por ingresos (Licores: 300, Cervezas: 200)
    expect(result.current.tableData.map((c) => c.nombre)).toEqual(["Licores", "Cervezas"]);

    // 'mas_vendidas': orden descendente por unidades (Cervezas: 70, Licores: 30)
    rerender({ tab: "mas_vendidas" });
    expect(result.current.tableData.map((c) => c.nombre)).toEqual(["Cervezas", "Licores"]);

    // 'mayor_margen': orden descendente por rentabilidad (Licores: 50%, Cervezas: 30%)
    rerender({ tab: "mayor_margen" });
    expect(result.current.tableData.map((c) => c.nombre)).toEqual(["Licores", "Cervezas"]);

    // 'menor_margen': orden ascendente por rentabilidad (Cervezas: 30%, Licores: 50%)
    rerender({ tab: "menor_margen" });
    expect(result.current.tableData.map((c) => c.nombre)).toEqual(["Cervezas", "Licores"]);
  });

  it("pagina los datos correctamente", async () => {
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useCategoriesReport({
          from: "2026-09-01",
          to: "2026-09-30",
          currency: "USD",
          tableTab: "todos",
          page,
          pageSize: 1,
        }),
      { initialProps: { page: 1 } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalRows).toBe(2);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedData).toHaveLength(1);
    expect(result.current.paginatedData[0].nombre).toBe("Licores");

    rerender({ page: 2 });
    expect(result.current.paginatedData).toHaveLength(1);
    expect(result.current.paginatedData[0].nombre).toBe("Cervezas");
  });

  it("maneja errores de API y permite reintentar con retry()", async () => {
    vi.mocked(api.getCategoryReport).mockRejectedValueOnce(
      new Error("Error al consultar categorías"),
    );

    const { result } = renderHook(() =>
      useCategoriesReport({
        from: "2026-09-01",
        to: "2026-09-30",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => expect(result.current.error).toBe("Error al consultar categorías"));
    expect(result.current.loading).toBe(false);

    vi.mocked(api.getCategoryReport).mockResolvedValueOnce(mockCategories);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.rawData).toEqual(mockCategories);
    });
  });

  it("maneja lista vacía sin errores", async () => {
    vi.mocked(api.getCategoryReport).mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useCategoriesReport({
        from: "2026-09-01",
        to: "2026-09-30",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rawData).toEqual([]);
    expect(result.current.kpis.totalIngresos).toBe(0);
    expect(result.current.kpis.totalUnidades).toBe(0);
    expect(result.current.kpis.lider).toBeNull();
    expect(result.current.kpis.margenPromedio).toBe(0);
    expect(result.current.tableData).toEqual([]);
    expect(result.current.paginatedData).toEqual([]);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.totalRows).toBe(0);
  });
});
