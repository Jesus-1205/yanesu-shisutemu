import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCatalogMutations } from "@/features/products/hooks/useCatalogMutations";
import { api } from "@/services/api";
import type { ProductOut as Product } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    toggleProductFavorite: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useCatalogMutations", () => {
  const mockSetProducts = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles toggling favorite status successfully", async () => {
    const sampleProduct = { id: 10, nombre: "Ron Pampero", es_favorito: false } as Product;
    vi.mocked(api.toggleProductFavorite).mockResolvedValueOnce({ id: 10, es_favorito: true } as unknown as Product);

    const { result } = renderHook(() => useCatalogMutations(mockSetProducts));

    await act(async () => {
      await result.current.handleToggleFavorite(sampleProduct);
    });

    expect(api.toggleProductFavorite).toHaveBeenCalledWith(10);
    expect(mockSetProducts).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('"Ron Pampero" agregado a favoritos', "success");
  });

  it("handles deletion workflow using requestDelete and cancelDelete", async () => {
    const sampleProduct = { id: 5, nombre: "Cerveza Zulia" } as Product;
    vi.mocked(api.deleteProduct).mockResolvedValueOnce(undefined as unknown as void);

    const { result } = renderHook(() => useCatalogMutations(mockSetProducts));

    act(() => {
      result.current.requestDelete(sampleProduct);
    });
    expect(result.current.deleteTarget).toEqual(sampleProduct);

    act(() => {
      result.current.cancelDelete();
    });
    expect(result.current.deleteTarget).toBeNull();

    act(() => {
      result.current.requestDelete(sampleProduct);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(api.deleteProduct).toHaveBeenCalledWith(5);
    expect(mockSetProducts).toHaveBeenCalled();
    expect(result.current.deleteTarget).toBeNull();
    expect(mockToast).toHaveBeenCalledWith('Producto "Cerveza Zulia" eliminado', "success");
  });

  it("handles delete error", async () => {
    const sampleProduct = { id: 5, nombre: "Cerveza Zulia" } as Product;
    vi.mocked(api.deleteProduct).mockRejectedValueOnce(new Error("Cannot delete"));

    const { result } = renderHook(() => useCatalogMutations(mockSetProducts));

    act(() => {
      result.current.requestDelete(sampleProduct);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockToast).toHaveBeenCalledWith("Cannot delete", "error");
    expect(result.current.deleting).toBe(false);
  });
});
