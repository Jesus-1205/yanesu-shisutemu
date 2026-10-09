import { describe, it, expect, vi, beforeEach } from "vitest";
import { useExchangeRateStore } from "../../stores/exchangeRateStore";
import { api } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    getLatestRates: vi.fn(),
  },
}));

beforeEach(() => {
  useExchangeRateStore.setState({ tasa: 0, tasaEUR: 0, loading: true });
  vi.clearAllMocks();
});

describe("exchangeRateStore", () => {
  it("starts with loading=true and zero rates", () => {
    const s = useExchangeRateStore.getState();
    expect(s.tasa).toBe(0);
    expect(s.tasaEUR).toBe(0);
    expect(s.loading).toBe(true);
  });

  it("loadTasa sets USD and EUR rates on success", async () => {
    vi.mocked(api.getLatestRates).mockResolvedValueOnce({
      rates: { USD: "45.5", EUR: "48.2" },
      timestamp: "2025-01-01T00:00:00Z",
    } as never);
    await useExchangeRateStore.getState().loadTasa();
    const s = useExchangeRateStore.getState();
    expect(s.tasa).toBe(45.5);
    expect(s.tasaEUR).toBe(48.2);
    expect(s.loading).toBe(false);
  });

  it("loadTasa sets 0 when API returns invalid numbers", async () => {
    vi.mocked(api.getLatestRates).mockResolvedValueOnce({
      rates: { USD: "INVALID", EUR: null },
    } as never);
    await useExchangeRateStore.getState().loadTasa();
    const s = useExchangeRateStore.getState();
    expect(s.tasa).toBe(0);
    expect(s.tasaEUR).toBe(0);
    expect(s.loading).toBe(false);
  });

  it("loadTasa handles API error gracefully", async () => {
    vi.mocked(api.getLatestRates).mockRejectedValueOnce(new Error("Network"));
    await useExchangeRateStore.getState().loadTasa();
    const s = useExchangeRateStore.getState();
    expect(s.tasa).toBe(0);
    expect(s.loading).toBe(false);
  });

  it("deduplicates concurrent in-flight loadTasa calls", async () => {
    let resolveApi: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    vi.mocked(api.getLatestRates).mockReturnValue(pendingPromise as never);

    const call1 = useExchangeRateStore.getState().loadTasa();
    const call2 = useExchangeRateStore.getState().loadTasa();
    const call3 = useExchangeRateStore.getState().loadTasa();

    expect(api.getLatestRates).toHaveBeenCalledTimes(1);

    resolveApi!({
      rates: { USD: "50.0", EUR: "55.0" },
      timestamp: "2025-01-01T00:00:00Z",
      fecha_ultima_actualizacion: "2025-01-01",
    });

    await Promise.all([call1, call2, call3]);

    const s = useExchangeRateStore.getState();
    expect(s.tasa).toBe(50.0);
    expect(s.tasaEUR).toBe(55.0);
    expect(s.loading).toBe(false);
    expect(api.getLatestRates).toHaveBeenCalledTimes(1);
  });
});