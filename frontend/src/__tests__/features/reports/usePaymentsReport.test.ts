import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePaymentsReport } from "@/features/reports/hooks/usePaymentsReport";
import type { PaymentTableTab } from "@/features/reports/types";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethodSummary: vi.fn(),
  },
}));

const mockPaymentsData = [
  {
    metodo_pago_id: 1,
    metodo_pago_nombre: "EFECTIVO_USD",
    moneda_default: "USD" as const,
    cantidad_pagos: 20,
    total_usd: 200,
    total_ves: 0,
    total_equivalente_usd: 200,
  },
  {
    metodo_pago_id: 2,
    metodo_pago_nombre: "PAGO_MOVIL",
    moneda_default: "VES" as const,
    cantidad_pagos: 10,
    total_usd: 0,
    total_ves: 5000,
    total_equivalente_usd: 100,
  },
  {
    metodo_pago_id: 3,
    metodo_pago_nombre: "TRANSFERENCIA",
    moneda_default: "VES" as const,
    cantidad_pagos: 0,
    total_usd: 0,
    total_ves: 0,
    total_equivalente_usd: 0,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getPaymentMethodSummary).mockResolvedValue(mockPaymentsData);
  useExchangeRateStore.setState({ tasa: 50 });
});

describe("usePaymentsReport", () => {
  it("inicia en loading=true y luego carga datos", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
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

    expect(result.current.rawData).toEqual(mockPaymentsData);
    expect(result.current.currSymbol).toBe("$");
  });

  it("calcula kpis correctamente en USD", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
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

    // Total equiv USD: 200 + 100 = 300
    expect(result.current.kpis.totalEquivUsd).toBe(300);
    expect(result.current.kpis.totalRecaudado).toBe(300);
    // Transacciones: 20 + 10 = 30
    expect(result.current.kpis.totalTransacciones).toBe(30);
    // Venta Promedio: 300 / 30 = 10
    expect(result.current.kpis.ventaPromedio).toBe(10);
    // Líder es EFECTIVO_USD
    expect(result.current.kpis.lider?.metodo_pago_nombre).toBe("EFECTIVO_USD");
  });

  it("calcula kpis y totales convertidos a VES", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "VES",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currSymbol).toBe("Bs ");
    expect(result.current.conversionRate).toBe(50);
    // 300 USD equiv * 50 = 15000 VES
    expect(result.current.kpis.totalRecaudado).toBe(15000);
    // 15000 / 30 = 500 VES promedio
    expect(result.current.kpis.ventaPromedio).toBe(500);

    // Pago móvil en VES: 100 * 50 = 5000
    const pagoMovil = result.current.tableData.find((p) => p.id === 2)!;
    expect(pagoMovil.totalEquiv).toBe(5000);
  });

  it("filtra por pestañas de tabla correctamente", async () => {
    const { result, rerender } = renderHook(
      ({ tab }: { tab: PaymentTableTab }) =>
        usePaymentsReport({
          from: "2026-09-10",
          to: "2026-10-09",
          currency: "USD",
          tableTab: tab,
          page: 1,
          pageSize: 10,
        }),
      { initialProps: { tab: "divisas" as PaymentTableTab } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Divisas sólo debe tener EFECTIVO_USD
    expect(result.current.tableData).toHaveLength(1);
    expect(result.current.tableData[0].nombre).toBe("EFECTIVO_USD");

    // Bolívares debe tener PAGO_MOVIL y TRANSFERENCIA
    rerender({ tab: "bolivares" });
    expect(result.current.tableData).toHaveLength(2);
    expect(result.current.tableData.map((p) => p.nombre)).toEqual([
      "PAGO_MOVIL",
      "TRANSFERENCIA",
    ]);
  });

  it("pagina los datos correctamente", async () => {
    const { result } = renderHook(() =>
      usePaymentsReport({
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
    vi.mocked(api.getPaymentMethodSummary).mockRejectedValueOnce(new Error("Fallo de red"));

    const { result } = renderHook(() =>
      usePaymentsReport({
        from: "2026-09-10",
        to: "2026-10-09",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Fallo de red");
    });

    vi.mocked(api.getPaymentMethodSummary).mockResolvedValueOnce(mockPaymentsData);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.rawData).toEqual(mockPaymentsData);
    });
  });
});
