import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/services/api";
import { useRateTrend } from "@/features/exchange-rates/hooks/useRateTrend";

vi.mock("@/services/api", () => ({
  api: {
    getRateHistory: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockApiHistory = [
  {
    id: 2,
    tasa_usd: 46,
    tasa_eur: 50,
    fecha_registro: "2026-08-10T10:00:00",
    registrado_por: 1,
  },
  {
    id: 1,
    tasa_usd: 45,
    tasa_eur: 49,
    fecha_registro: "2026-08-09T10:00:00",
    registrado_por: 1,
  },
];

describe("useRateTrend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads trend with 30D default interval and reverses chronological order", async () => {
    mockApi.getRateHistory.mockResolvedValue({
      history: mockApiHistory,
    });

    const { result } = renderHook(() => useRateTrend());

    expect(result.current.intervalo).toBe("30D");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.trend.length).toBe(2);
    });

    expect(result.current.trend[0]).toEqual({
      fecha: "2026-08-09T10:00:00",
      usd: 45,
      eur: 49,
    });
    expect(result.current.trend[1]).toEqual({
      fecha: "2026-08-10T10:00:00",
      usd: 46,
      eur: 50,
    });

    expect(mockApi.getRateHistory).toHaveBeenCalledWith({ days: 30 });
  });

  it("changes interval and refetches API with corresponding days count", async () => {
    mockApi.getRateHistory.mockResolvedValue({ history: [] });

    const { result } = renderHook(() => useRateTrend());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setIntervalo("90D");
    });

    await waitFor(() => {
      expect(mockApi.getRateHistory).toHaveBeenCalledWith({ days: 90 });
    });

    expect(result.current.intervalo).toBe("90D");
  });

  it("handles network errors by leaving trend array empty", async () => {
    mockApi.getRateHistory.mockRejectedValue(new Error("Error del servidor"));

    const { result } = renderHook(() => useRateTrend());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trend).toEqual([]);
  });
});
