import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpdateCategory } from "@/features/categories/hooks/useUpdateCategory";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    updateCategory: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpdateCategory", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useUpdateCategory());
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("updates category successfully and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const updatedCategory = {
      id: 1,
      nombre: "Licores Editado",
      descripcion: "Premium Editado",
    };
    (api.updateCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      updatedCategory,
    );

    const { result } = renderHook(() => useUpdateCategory({ onSuccess }));

    let res;
    await act(async () => {
      res = await result.current.updateCategory(1, {
        nombre: " Licores Editado ",
        descripcion: " Premium Editado ",
      });
    });

    expect(api.updateCategory).toHaveBeenCalledWith(1, {
      nombre: "Licores Editado",
      descripcion: "Premium Editado",
    });
    expect(res).toEqual(updatedCategory);
    expect(onSuccess).toHaveBeenCalledWith(updatedCategory);
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles empty description converting to null", async () => {
    const updatedCategory = { id: 2, nombre: "Vinos", descripcion: null };
    (api.updateCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      updatedCategory,
    );

    const { result } = renderHook(() => useUpdateCategory());

    await act(async () => {
      await result.current.updateCategory(2, {
        nombre: "Vinos",
        descripcion: "   ",
      });
    });

    expect(api.updateCategory).toHaveBeenCalledWith(2, {
      nombre: "Vinos",
      descripcion: null,
    });
  });

  it("handles undefined fields gracefully", async () => {
    const updatedCategory = { id: 2, nombre: "Vinos", descripcion: null };
    (api.updateCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      updatedCategory,
    );

    const { result } = renderHook(() => useUpdateCategory());

    await act(async () => {
      await result.current.updateCategory(2, {});
    });

    expect(api.updateCategory).toHaveBeenCalledWith(2, {
      nombre: undefined,
      descripcion: undefined,
    });
  });

  it("handles errors when updating category", async () => {
    const onSuccess = vi.fn();
    (api.updateCategory as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Error al actualizar"),
    );

    const { result } = renderHook(() => useUpdateCategory({ onSuccess }));

    let res;
    await act(async () => {
      res = await result.current.updateCategory(1, {
        nombre: "Licores",
      });
    });

    expect(res).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBe("Error al actualizar");
  });

  it("clears error with clearError", () => {
    const { result } = renderHook(() => useUpdateCategory());

    act(() => {
      result.current.setError("Error de prueba");
    });
    expect(result.current.error).toBe("Error de prueba");

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
});
