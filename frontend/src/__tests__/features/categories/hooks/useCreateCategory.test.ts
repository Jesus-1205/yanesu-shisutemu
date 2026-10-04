import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCreateCategory } from "@/features/categories/hooks/useCreateCategory";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    createCategory: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCreateCategory", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useCreateCategory());
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("creates category successfully and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const createdCategory = {
      id: 1,
      nombre: "Licores",
      descripcion: "Premium",
    };
    (api.createCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      createdCategory,
    );

    const { result } = renderHook(() => useCreateCategory({ onSuccess }));

    let res;
    await act(async () => {
      res = await result.current.createCategory({
        nombre: " Licores ",
        descripcion: " Premium ",
      });
    });

    expect(api.createCategory).toHaveBeenCalledWith({
      nombre: "Licores",
      descripcion: "Premium",
    });
    expect(res).toEqual(createdCategory);
    expect(onSuccess).toHaveBeenCalledWith(createdCategory);
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles empty description converting to null", async () => {
    const createdCategory = { id: 2, nombre: "Vinos", descripcion: null };
    (api.createCategory as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      createdCategory,
    );

    const { result } = renderHook(() => useCreateCategory());

    await act(async () => {
      await result.current.createCategory({
        nombre: "Vinos",
        descripcion: "   ",
      });
    });

    expect(api.createCategory).toHaveBeenCalledWith({
      nombre: "Vinos",
      descripcion: null,
    });
  });

  it("handles errors when creating category", async () => {
    const onSuccess = vi.fn();
    (api.createCategory as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Categoría ya existe"),
    );

    const { result } = renderHook(() => useCreateCategory({ onSuccess }));

    let res;
    await act(async () => {
      res = await result.current.createCategory({
        nombre: "Licores",
      });
    });

    expect(res).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBe("Categoría ya existe");
  });

  it("clears error with clearError", () => {
    const { result } = renderHook(() => useCreateCategory());

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
