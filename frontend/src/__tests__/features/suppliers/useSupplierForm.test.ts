import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSupplierForm } from "@/features/suppliers/hooks/useSupplierForm";
import { api } from "@/services/api";

const mockSupplier = {
  id: 1,
  nombre: "Distribuidora ABC",
  telefono: "+58 412 123 4567",
  email: "contacto@distribuidora.com",
};

vi.mock("@/services/api", () => ({
  api: {
    getSupplier: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("useSupplierForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default empty values in create mode", () => {
    const { result } = renderHook(() => useSupplierForm());

    expect(result.current.isEdit).toBe(false);
    expect(result.current.nombre).toBe("");
    expect(result.current.telefono).toBe("");
    expect(result.current.email).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("initializes with initialNombre capitalized", () => {
    const { result } = renderHook(() =>
      useSupplierForm({ initialNombre: "polar distribucion" }),
    );

    expect(result.current.nombre).toBe("Polar Distribucion");
  });

  it("fetches supplier data when supplierId is provided", async () => {
    mockApi.getSupplier.mockResolvedValueOnce(mockSupplier);

    const { result } = renderHook(() => useSupplierForm({ supplierId: 1 }));

    expect(result.current.isEdit).toBe(true);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getSupplier).toHaveBeenCalledWith(1);
    expect(result.current.nombre).toBe("Distribuidora ABC");
    expect(result.current.telefono).toBe("+58 412 123 4567");
    expect(result.current.email).toBe("contacto@distribuidora.com");
  });

  it("handles error when fetching supplier data fails", async () => {
    mockApi.getSupplier.mockRejectedValueOnce(new Error("Error al cargar proveedor"));

    const { result } = renderHook(() => useSupplierForm({ supplierId: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Error al cargar proveedor");
  });

  it("creates a supplier successfully", async () => {
    mockApi.createSupplier.mockResolvedValueOnce(mockSupplier);
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useSupplierForm({ onSuccess, onClose }),
    );

    act(() => {
      result.current.setNombre("distribuidora abc");
      result.current.setTelefono("+58 412 123 4567");
      result.current.setEmail("contacto@distribuidora.com");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.createSupplier).toHaveBeenCalledWith({
      nombre: "Distribuidora Abc",
      telefono: "+58 412 123 4567",
      email: "contacto@distribuidora.com",
    });
    expect(onSuccess).toHaveBeenCalledWith(mockSupplier);
    expect(onClose).toHaveBeenCalled();
  });

  it("updates a supplier successfully", async () => {
    mockApi.getSupplier.mockResolvedValueOnce(mockSupplier);
    mockApi.updateSupplier.mockResolvedValueOnce({
      ...mockSupplier,
      nombre: "Distribuidora Actualizada",
    });

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useSupplierForm({ supplierId: 1, onSuccess, onClose }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setNombre("distribuidora actualizada");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockApi.updateSupplier).toHaveBeenCalledWith(1, {
      nombre: "Distribuidora Actualizada",
      telefono: "+58 412 123 4567",
      email: "contacto@distribuidora.com",
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("handles error during submission", async () => {
    mockApi.createSupplier.mockRejectedValueOnce(new Error("Error al guardar proveedor"));

    const { result } = renderHook(() => useSupplierForm());

    act(() => {
      result.current.setNombre("Test");
    });

    let res: unknown;
    await act(async () => {
      res = await result.current.handleSubmit();
    });

    expect(res).toBeUndefined();
    expect(result.current.error).toBe("Error al guardar proveedor");
  });

  it("resets form on handleClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSupplierForm({ onClose }));

    act(() => {
      result.current.setNombre("Temp");
      result.current.setTelefono("123");
    });

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.nombre).toBe("");
    expect(result.current.telefono).toBe("");
    expect(onClose).toHaveBeenCalled();
  });
});
