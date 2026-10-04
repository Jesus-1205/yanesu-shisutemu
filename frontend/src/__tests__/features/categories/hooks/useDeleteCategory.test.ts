import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeleteCategory } from "@/features/categories/hooks/useDeleteCategory";
import { api } from "@/services/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    deleteCategory: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDeleteCategory", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useDeleteCategory());
    expect(result.current.deleteTarget).toBeNull();
    expect(result.current.deleting).toBe(false);
  });

  it("updates deleteTarget with setDeleteTarget", () => {
    const { result } = renderHook(() => useDeleteCategory());
    const category = { id: 10, nombre: "Cervezas", descripcion: "Variedad" };

    act(() => {
      result.current.setDeleteTarget(category);
    });

    expect(result.current.deleteTarget).toEqual(category);
  });

  it("does nothing if confirmDelete is called without a target", async () => {
    const { result } = renderHook(() => useDeleteCategory());

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(api.deleteCategory).not.toHaveBeenCalled();
  });

  it("deletes category successfully, triggers toast and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    (api.deleteCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteCategory({ onSuccess }));
    const category = { id: 1, nombre: "Licores", descripcion: null };

    act(() => {
      result.current.setDeleteTarget(category);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(api.deleteCategory).toHaveBeenCalledWith(1);
    expect(mockToast).toHaveBeenCalledWith('Categoría "Licores" eliminada', "success");
    expect(result.current.deleteTarget).toBeNull();
    expect(result.current.deleting).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("handles deletion errors with toast and resets deleting state", async () => {
    const onSuccess = vi.fn();
    (api.deleteCategory as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Categoría en uso"),
    );

    const { result } = renderHook(() => useDeleteCategory({ onSuccess }));
    const category = { id: 1, nombre: "Licores", descripcion: null };

    act(() => {
      result.current.setDeleteTarget(category);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(api.deleteCategory).toHaveBeenCalledWith(1);
    expect(mockToast).toHaveBeenCalledWith("Categoría en uso", "error");
    expect(result.current.deleting).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
