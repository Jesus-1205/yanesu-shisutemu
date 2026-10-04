import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { api } from "@/services/api";
import { useRateHistory } from "@/features/exchange-rates/hooks/useRateHistory";
import type { ExchangeRate } from "@/features/exchange-rates/types";

vi.mock("@/services/api", () => ({
  api: {
    getRateHistoryPaginated: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockHistoryItems = [
  {
    id: 1,
    tasa_usd: 45.123,
    tasa_eur: 49.5,
    fecha_registro: "2026-08-11T10:30:00",
    registrado_por: 1,
    registrado_por_nombre: "admin",
  },
];

describe("useRateHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with loading true and loads paginated data correctly", async () => {
    mockApi.getRateHistoryPaginated.mockResolvedValue({
      items: mockHistoryItems,
      pages: 3,
      total: 50,
      page: 1,
      page_size: 20,
    });

    const { result } = renderHook(() => useRateHistory());

    expect(result.current.loading).toBe(true);
    expect(result.current.page).toBe(1);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toEqual(mockHistoryItems);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.error).toBeNull();
    expect(mockApi.getRateHistoryPaginated).toHaveBeenCalledWith({ page: 1, page_size: 20 });
  });

  it("handles page changes by refetching from the API", async () => {
    mockApi.getRateHistoryPaginated.mockResolvedValue({
      items: mockHistoryItems,
      pages: 3,
      total: 50,
      page: 1,
      page_size: 20,
    });

    const { result } = renderHook(() => useRateHistory());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(mockApi.getRateHistoryPaginated).toHaveBeenCalledWith({ page: 2, page_size: 20 });
    });
    expect(result.current.page).toBe(2);
  });

  it("handles network errors and resets state accordingly", async () => {
    mockApi.getRateHistoryPaginated.mockRejectedValue(new Error("Conexión perdida"));

    const { result } = renderHook(() => useRateHistory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBe("Conexión perdida");
  });

  it("allows manually refreshing the history data", async () => {
    mockApi.getRateHistoryPaginated.mockResolvedValue({
      items: mockHistoryItems,
      pages: 1,
      total: 1,
      page: 1,
      page_size: 20,
    });

    const { result } = renderHook(() => useRateHistory());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refreshHistory();
    });

    expect(mockApi.getRateHistoryPaginated).toHaveBeenCalledTimes(2);
  });

  it("fetches all pages iteratively with fetchAllRates", async () => {
    mockApi.getRateHistoryPaginated
      .mockResolvedValueOnce({
        items: mockHistoryItems,
        pages: 2,
        total: 2,
        page: 1,
        page_size: 20,
      })
      .mockResolvedValueOnce({
        items: [{ ...mockHistoryItems[0], id: 2 }],
        pages: 2,
        total: 2,
        page: 2,
        page_size: 200,
      })
      .mockResolvedValueOnce({
        items: [{ ...mockHistoryItems[0], id: 3 }],
        pages: 2,
        total: 2,
        page: 2,
        page_size: 200,
      });

    const { result } = renderHook(() => useRateHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let allRates: ExchangeRate[] = [];
    await act(async () => {
      allRates = await result.current.fetchAllRates();
    });

    expect(allRates.length).toBe(2);
    expect(mockApi.getRateHistoryPaginated).toHaveBeenCalledWith({ page: 1, page_size: 200 });
    expect(mockApi.getRateHistoryPaginated).toHaveBeenCalledWith({ page: 2, page_size: 200 });
  });
});
