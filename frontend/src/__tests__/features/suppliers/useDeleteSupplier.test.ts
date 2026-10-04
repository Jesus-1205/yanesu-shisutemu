import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeleteSupplier } from "@/features/suppliers/hooks/useDeleteSupplier";
import { api } from "@/services/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    deleteSupplier: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDeleteSupplier", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useDeleteSupplier());
    expect(result.current.deleteTarget).toBeNull();
    expect(result.current.deleting).toBe(false);
  });

  it("updates deleteTarget with setDeleteTarget and can cancel", () => {
    const { result } = renderHook(() => useDeleteSupplier());
    const supplier = { id: 10, nombre: "Polar", telefono: "123", email: "p@p.com" };

    act(() => {
      result.current.setDeleteTarget(supplier);
    });

    expect(result.current.deleteTarget).toEqual(supplier);

    act(() => {
      result.current.cancelDelete();
    });

    expect(result.current.deleteTarget).toBeNull();
  });

  it("does nothing if confirmDelete is called without a target", async () => {
    const { result } = renderHook(() => useDeleteSupplier());

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(api.deleteSupplier).not.toHaveBeenCalled();
  });

  it("deletes supplier successfully, triggers toast and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    (api.deleteSupplier as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteSupplier({ onSuccess }));
    const supplier = { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null };

    act(() => {
      result.current.setDeleteTarget(supplier);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(api.deleteSupplier).toHaveBeenCalledWith(1);
    expect(mockToast).toHaveBeenCalledWith('Proveedor "Distribuidora Polar" eliminado', "success");
    expect(result.current.deleteTarget).toBeNull();
    expect(result.current.deleting).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("handles deletion errors with toast and resets deleting state", async () => {
    const onSuccess = vi.fn();
    (api.deleteSupplier as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Proveedor con compras asociadas"),
    );

    const { result } = renderHook(() => useDeleteSupplier({ onSuccess }));
    const supplier = { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null };

    act(() => {
      result.current.setDeleteTarget(supplier);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(api.deleteSupplier).toHaveBeenCalledWith(1);
    expect(mockToast).toHaveBeenCalledWith("Proveedor con compras asociadas", "error");
    expect(result.current.deleting).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
