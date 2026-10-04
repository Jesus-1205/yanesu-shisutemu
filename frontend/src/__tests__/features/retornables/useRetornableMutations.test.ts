import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useSearchProductosSelect,
  useAsociarProductoRetornable,
  useDesasociarProductoRetornable,
  useCrearReporteRetornable,
} from "../../../features/retornables/hooks/useRetornableMutations";

const mockGetProducts = vi.fn();
const mockAsociarRetornableProducto = vi.fn();
const mockDesasociarRetornableProducto = vi.fn();
const mockCrearRetornableReporte = vi.fn();

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("../../../services/api", () => ({
  api: {
    getProducts: (...args: unknown[]) => mockGetProducts(...args),
    asociarRetornableProducto: (...args: unknown[]) => mockAsociarRetornableProducto(...args),
    desasociarRetornableProducto: (...args: unknown[]) => mockDesasociarRetornableProducto(...args),
    crearRetornableReporte: (...args: unknown[]) => mockCrearRetornableReporte(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSearchProductosSelect", () => {
  it("searches and formats options correctly", async () => {
    mockGetProducts.mockResolvedValue({
      items: [
        { id: 10, nombre: "Cerveza Polar", codigo_barra: "7591001" },
        { id: 11, nombre: "Cerveza Zulia", codigo_barra: null },
      ],
    });

    const { result } = renderHook(() => useSearchProductosSelect());
    const options = await result.current.searchProducts("Polar");

    expect(mockGetProducts).toHaveBeenCalledWith({ search: "Polar", page_size: 10 });
    expect(options).toEqual([
      { value: 10, label: "Cerveza Polar", subtitle: "7591001" },
      { value: 11, label: "Cerveza Zulia", subtitle: undefined },
    ]);
  });
});

describe("useAsociarProductoRetornable", () => {
  it("handles asociar success and triggers callbacks", async () => {
    mockAsociarRetornableProducto.mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => useAsociarProductoRetornable());

    const onSuccess = vi.fn();
    let success: boolean = false;
    await act(async () => {
      success = await result.current.asociar({ producto_id: 1, presentacion: "222" }, onSuccess);
    });

    expect(success).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Producto asociado exitosamente", "success");
  });

  it("handles asociar failure and displays error toast", async () => {
    mockAsociarRetornableProducto.mockRejectedValueOnce(new Error("Falló asociación"));
    const { result } = renderHook(() => useAsociarProductoRetornable());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.asociar({ producto_id: 1, presentacion: "222" });
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("Falló asociación", "error");
  });
});

describe("useDesasociarProductoRetornable", () => {
  it("handles desasociar success and triggers callbacks", async () => {
    mockDesasociarRetornableProducto.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useDesasociarProductoRetornable());

    const onSuccess = vi.fn();
    let success: boolean = false;
    await act(async () => {
      success = await result.current.desasociar(5, onSuccess);
    });

    expect(success).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Producto desasociado", "success");
  });

  it("handles desasociar failure and displays error toast", async () => {
    mockDesasociarRetornableProducto.mockRejectedValueOnce(new Error("Error al borrar"));
    const { result } = renderHook(() => useDesasociarProductoRetornable());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.desasociar(5);
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("Error al borrar", "error");
  });
});

describe("useCrearReporteRetornable", () => {
  it("handles crearReporte success and triggers callbacks", async () => {
    mockCrearRetornableReporte.mockResolvedValueOnce({ id: 99 });
    const { result } = renderHook(() => useCrearReporteRetornable());

    const onSuccess = vi.fn();
    let success: boolean = false;
    await act(async () => {
      success = await result.current.crearReporte(
        { realizado_por: "Tester", detalles: [] },
        onSuccess
      );
    });

    expect(success).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Reporte creado exitosamente", "success");
  });

  it("handles crearReporte failure and displays error toast", async () => {
    mockCrearRetornableReporte.mockRejectedValueOnce(new Error("Detalle inválido"));
    const { result } = renderHook(() => useCrearReporteRetornable());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.crearReporte({ realizado_por: "Tester", detalles: [] });
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("Detalle inválido", "error");
  });
});
