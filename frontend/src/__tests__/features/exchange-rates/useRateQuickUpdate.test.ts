import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRateQuickUpdate, norm } from "../../../features/exchange-rates/hooks/useRateQuickUpdate";
import { api } from "../../../services/api";

// Mock the API service
vi.mock("../../../services/api", () => ({
  api: {
    getBcvRates: vi.fn(),
    saveBulkRates: vi.fn(),
  },
}));

// Mock useToast to prevent errors during tests
const mockToast = vi.fn();
vi.mock("../../../ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useRateQuickUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty values and disabled save", () => {
    const { result } = renderHook(() =>
      useRateQuickUpdate({
        open: false,
        currentUsd: "40.0000",
        currentEur: "42.0000",
        onClose: vi.fn(),
        onSaved: vi.fn(),
      })
    );

    expect(result.current.usd).toBe("");
    expect(result.current.eur).toBe("");
    expect(result.current.disabledSave).toBe(true);
    expect(result.current.sinCambios).toBe(false);
  });

  it("fetches BCV rates when loaded", async () => {
    vi.mocked(api.getBcvRates).mockResolvedValueOnce({
      rates: { USD: "45.1234", EUR: "48.5678" }
    } as never);

    const { result } = renderHook(() =>
      useRateQuickUpdate({
        open: true,
        currentUsd: "40.0000",
        currentEur: "42.0000",
        onClose: vi.fn(),
        onSaved: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleLoadBcv();
    });

    expect(result.current.usd).toBe("45.1234");
    expect(result.current.eur).toBe("48.5678");
    expect(mockToast).toHaveBeenCalledWith("Tasas del BCV cargadas", "success");
  });

  it("disables save if values are the same as current", async () => {
    vi.mocked(api.getBcvRates).mockResolvedValueOnce({ rates: { USD: "1", EUR: "1" } } as never);
    const { result } = renderHook(() =>
      useRateQuickUpdate({
        open: true,
        currentUsd: "45.1234",
        currentEur: "48.5678",
        onClose: vi.fn(),
        onSaved: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(result.current.bcvLoading).toBe(false);
    });

    act(() => {
      result.current.setUsd("45.1234");
      result.current.setEur("48.5678");
    });

    expect(result.current.sinCambios).toBe(true);
    expect(result.current.disabledSave).toBe(true);
  });

  it("calls saveBulkRates and triggers callbacks on save", async () => {
    vi.mocked(api.getBcvRates).mockResolvedValueOnce({ rates: { USD: "1", EUR: "1" } } as never);
    vi.mocked(api.saveBulkRates).mockResolvedValueOnce({} as never);
    
    const onSavedSpy = vi.fn();
    const onCloseSpy = vi.fn();

    const { result } = renderHook(() =>
      useRateQuickUpdate({
        open: true,
        currentUsd: "40.0000",
        currentEur: "42.0000",
        onClose: onCloseSpy,
        onSaved: onSavedSpy,
      })
    );

    await waitFor(() => {
      expect(result.current.bcvLoading).toBe(false);
    });

    act(() => {
      result.current.setUsd("45.1234");
      result.current.setEur("48.5678");
    });

    expect(result.current.disabledSave).toBe(false);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(api.saveBulkRates).toHaveBeenCalledWith({ usd: "45.1234", eur: "48.5678" });
    expect(mockToast).toHaveBeenCalledWith("Tasas guardadas correctamente", "success");
    expect(onSavedSpy).toHaveBeenCalled();
    expect(onCloseSpy).toHaveBeenCalled();
  });

  it("handles normalization properly", () => {
    expect(norm("45.1")).toBe("45.1000");
    expect(norm("abc")).toBe("");
  });
});
