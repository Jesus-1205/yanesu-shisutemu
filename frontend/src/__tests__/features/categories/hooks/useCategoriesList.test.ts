import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCategoriesList } from "@/features/categories/hooks/useCategoriesList";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getCategoriesPaginated: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCategoriesList", () => {
  it("initializes with loading state and default pagination", () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}),
    );
    const { result } = renderHook(() => useCategoriesList());

    expect(result.current.loading).toBe(true);
    expect(result.current.categories).toEqual([]);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBeNull();
    expect(result.current.search).toBe("");
  });

  it("fetches categories successfully and updates state", async () => {
    const mockData = {
      items: [
        { id: 1, nombre: "Licores", descripcion: "Desc 1" },
        { id: 2, nombre: "Vinos", descripcion: "Desc 2" },
      ],
      total: 2,
      page: 1,
      page_size: 20,
      pages: 1,
    };
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useCategoriesList());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toEqual(mockData.items);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch errors and stores error message", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Error de conexión"),
    );

    const { result } = renderHook(() => useCategoriesList());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Error de conexión");
    expect(result.current.categories).toEqual([]);
  });

  it("debounces search input and triggers fetch with search query", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 1,
    });

    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearch("ron");
    });

    await waitFor(() => {
      expect(api.getCategoriesPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "ron" }),
      );
    });
  });

  it("adjusts page automatically if page > totalPages", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ id: 1, nombre: "Cat 1", descripcion: null }],
      total: 60,
      page: 1,
      page_size: 20,
      pages: 3,
    });

    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(3);
    });
    await waitFor(() => expect(result.current.page).toBe(3));

    // Simulate response when page count drops to 2
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      total: 40,
      page: 3,
      page_size: 20,
      pages: 2,
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });
  });

  it("refetches data when refetch is called", async () => {
    (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 1,
    });

    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const initialCalls = (api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mock.calls.length;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect((api.getCategoriesPaginated as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
        initialCalls + 1,
      );
    });
  });
});
