import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSuppliersList } from "@/features/suppliers/hooks/useSuppliersList";
import { api } from "@/services/api";

const mockSetSearchParams = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

vi.mock("@/services/api", () => ({
  api: {
    getSuppliersPaginated: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
});

describe("useSuppliersList", () => {
  it("initializes and fetches paginated suppliers successfully", async () => {
    const mockResponse = {
      items: [
        { id: 1, nombre: "Distribuidora Polar", telefono: "04141234567", email: "polar@test.com" },
        { id: 2, nombre: "Santa Teresa", telefono: null, email: null },
      ],
      total: 2,
      page: 1,
      page_size: 20,
      pages: 1,
    };
    (api.getSuppliersPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useSuppliersList());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.suppliers).toEqual(mockResponse.items);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error gracefully", async () => {
    (api.getSuppliersPaginated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Error de conexión"),
    );

    const { result } = renderHook(() => useSuppliersList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Error de conexión");
    expect(result.current.suppliers).toEqual([]);
  });

  it("opens and closes analytics drawer manually", async () => {
    (api.getSuppliersPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 1,
    });

    const { result } = renderHook(() => useSuppliersList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.drawerOpen).toBe(false);

    act(() => {
      result.current.openDrawer({ id: 5, nombre: "Cervecería", telefono: null, email: null });
    });

    expect(result.current.drawerOpen).toBe(true);
    expect(result.current.selectedSupplierId).toBe(5);
    expect(result.current.selectedSupplierName).toBe("Cervecería");

    act(() => {
      result.current.closeDrawer();
    });

    expect(result.current.drawerOpen).toBe(false);
  });

  it("auto-opens drawer when URL parameter ?open is present", async () => {
    mockSearchParams = new URLSearchParams("open=1");
    const mockResponse = {
      items: [
        { id: 1, nombre: "Distribuidora Polar", telefono: "04141234567", email: "polar@test.com" },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    };
    (api.getSuppliersPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useSuppliersList());

    await waitFor(() => {
      expect(result.current.drawerOpen).toBe(true);
    });

    expect(result.current.selectedSupplierId).toBe(1);
    expect(result.current.selectedSupplierName).toBe("Distribuidora Polar");
    expect(mockSetSearchParams).toHaveBeenCalledWith({}, { replace: true });
  });

  it("refetches suppliers when refetch is called", async () => {
    (api.getSuppliersPaginated as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 1,
    });

    const { result } = renderHook(() => useSuppliersList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.refetch();
    });

    expect(api.getSuppliersPaginated).toHaveBeenCalledTimes(2);
  });
});
