import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInvoiceExchangeRateSync } from "@/features/invoices/hooks/useInvoiceExchangeRateSync";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { ExchangeRateOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getRateHistory: vi.fn().mockResolvedValue({
      history: [
        {
          id: 1,
          tasa_usd: 36.50,
          tasa_eur: 39.50,
          fecha_registro: "2025-01-01T12:00:00Z",
          registrado_por: 1,
        },
      ],
    }),
  },
}));

describe("useInvoiceExchangeRateSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
    useExchangeRateStore.setState({ tasa: 40.0, fechaUltimaActualizacion: "2025-01-01T10:00:00Z" });
  });

  it("loads rate history and synchronizes initial tasa to invoice store", async () => {
    const { result } = renderHook(() => useInvoiceExchangeRateSync());

    await waitFor(() => {
      expect(result.current.rateHistory).toHaveLength(1);
    });

    expect(useInvoiceFormStore.getState().tasa).toBe("40");
  });

  it("applies a selected rate from history", async () => {
    const { result } = renderHook(() => useInvoiceExchangeRateSync());

    await waitFor(() => {
      expect(result.current.rateHistory).toHaveLength(1);
    });

    const rate: ExchangeRateOut = {
      id: 2,
      tasa_usd: 38.25,
      tasa_eur: 41.00,
      fecha_registro: "2025-01-02T12:00:00Z",
      registrado_por: 1,
    };

    act(() => {
      result.current.applyRate(rate);
    });

    expect(useInvoiceFormStore.getState().tasa).toBe("38.25");
    expect(result.current.showRateHistory).toBe(false);
    expect(mockToast).toHaveBeenCalled();
  });
});
