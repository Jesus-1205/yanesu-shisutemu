import { api } from "@/services/api";
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { usePaymentMethods } from "@/features/payment-methods/hooks/usePaymentMethods";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
    createPaymentMethod: vi.fn(),
    updatePaymentMethod: vi.fn(),
    deletePaymentMethod: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockMethods = [
  { id: 1, nombre: "EFECTIVO", activo: true, moneda_default: "USD" as const, acepta_referencia: false },
  { id: 2, nombre: "TRANSFERENCIA", activo: false, moneda_default: "VES" as const, acepta_referencia: true },
];

describe("usePaymentMethods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga metodos de pago exitosamente", async () => {
    mockApi.getPaymentMethods.mockResolvedValueOnce(mockMethods);

    const { result } = renderHook(() => usePaymentMethods());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.methods).toEqual(mockMethods);
    expect(result.current.error).toBeNull();
  });

  it("maneja error al cargar metodos de pago", async () => {
    mockApi.getPaymentMethods.mockRejectedValueOnce(new Error("Error de conexion"));

    const { result } = renderHook(() => usePaymentMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Error de conexion");
    expect(result.current.methods).toEqual([]);
  });

  it("crea un nuevo metodo de pago", async () => {
    mockApi.getPaymentMethods.mockResolvedValue(mockMethods);
    mockApi.createPaymentMethod.mockResolvedValueOnce({
      id: 3,
      nombre: "PAGO MOVIL",
      activo: true,
      moneda_default: "VES",
      acepta_referencia: true,
    });

    const { result } = renderHook(() => usePaymentMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.createMethod({
        nombre: "PAGO MOVIL",
        activo: true,
        moneda_default: "VES",
        acepta_referencia: true,
      });
    });

    expect(success).toBe(true);
    expect(mockApi.createPaymentMethod).toHaveBeenCalledWith({
      nombre: "PAGO MOVIL",
      activo: true,
      moneda_default: "VES",
      acepta_referencia: true,
    });
    expect(mockToast).toHaveBeenCalledWith("Método de pago creado", "success");
  });

  it("maneja error al crear metodo de pago", async () => {
    mockApi.getPaymentMethods.mockResolvedValue(mockMethods);
    mockApi.createPaymentMethod.mockRejectedValueOnce(new Error("Error al crear"));

    const { result } = renderHook(() => usePaymentMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = true;
    await act(async () => {
      success = await result.current.createMethod({
        nombre: "PAGO MOVIL",
        activo: true,
        moneda_default: "VES",
        acepta_referencia: true,
      });
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("Error al crear", "error");
  });

  it("actualiza un metodo de pago", async () => {
    mockApi.getPaymentMethods.mockResolvedValue(mockMethods);
    mockApi.updatePaymentMethod.mockResolvedValueOnce({
      id: 1,
      nombre: "EFECTIVO EDITADO",
      activo: true,
      moneda_default: "USD",
      acepta_referencia: false,
    });

    const { result } = renderHook(() => usePaymentMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.updateMethod(1, {
        nombre: "EFECTIVO EDITADO",
      });
    });

    expect(success).toBe(true);
    expect(mockApi.updatePaymentMethod).toHaveBeenCalledWith(1, {
      nombre: "EFECTIVO EDITADO",
    });
    expect(mockToast).toHaveBeenCalledWith("Método de pago actualizado", "success");
  });

  it("elimina un metodo de pago", async () => {
    mockApi.getPaymentMethods.mockResolvedValue(mockMethods);
    mockApi.deletePaymentMethod.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePaymentMethods());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteMethod(1);
    });

    expect(success).toBe(true);
    expect(mockApi.deletePaymentMethod).toHaveBeenCalledWith(1);
    expect(mockToast).toHaveBeenCalledWith("Método de pago eliminado", "success");
  });
});
