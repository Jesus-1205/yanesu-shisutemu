import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useSalesPaymentMethods } from "@/features/sales/hooks/useSalesPaymentMethods";
import { api } from "@/services/api";
import type { PaymentMethodOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
  },
}));

describe("useSalesPaymentMethods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches active payment methods on mount", async () => {
    const mockMethods: PaymentMethodOut[] = [
      { id: 1, nombre: "Efectivo USD", moneda_default: "USD", activo: true, acepta_referencia: false },
      { id: 2, nombre: "Pago Móvil", moneda_default: "VES", activo: true, acepta_referencia: true },
    ];
    vi.mocked(api.getPaymentMethods).mockResolvedValue(mockMethods);

    const { result } = renderHook(() => useSalesPaymentMethods());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.getPaymentMethods).toHaveBeenCalledWith(true);
    expect(result.current.methods).toEqual(mockMethods);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error gracefully", async () => {
    vi.mocked(api.getPaymentMethods).mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useSalesPaymentMethods());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.methods).toEqual([]);
    expect(result.current.error).toBe("Network failure");
  });
});
