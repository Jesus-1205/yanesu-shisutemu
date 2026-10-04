import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { api } from "@/services/api";
import { useInvoiceSuppliers } from "@/features/invoices/hooks/useInvoiceSuppliers";

vi.mock("@/services/api", () => ({
  api: {
    getSuppliers: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("useInvoiceSuppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches suppliers and updates loading state", async () => {
    mockApi.getSuppliers.mockResolvedValue([
      { id: 1, nombre: "Proveedor Polar", telefono: null, email: null },
    ]);

    const { result } = renderHook(() => useInvoiceSuppliers());

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.suppliers).toHaveLength(1);
    expect(result.current.suppliers[0].nombre).toBe("Proveedor Polar");
  });

  it("handles error without crashing", async () => {
    mockApi.getSuppliers.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useInvoiceSuppliers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.suppliers).toEqual([]);
  });
});
