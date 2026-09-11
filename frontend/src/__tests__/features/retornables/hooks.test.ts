import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useRetornableResumen,
  useRetornableReportes,
  useRetornableDetalleReporte,
  useRetornableHistorico,
  useRetornableProductos,
  useRetornableComparacion,
} from "../../../features/retornables/hooks/useRetornable";

const mockGetRetornableResumen = vi.fn();
const mockGetRetornableReportes = vi.fn();
const mockGetRetornableDetalleReporte = vi.fn();
const mockGetRetornableHistorico = vi.fn();
const mockGetRetornableProductos = vi.fn();
const mockGetRetornableComparacion = vi.fn();

vi.mock("../../../services/api", () => ({
  api: {
    getRetornableResumen: (...args: unknown[]) => mockGetRetornableResumen(...args),
    getRetornableReportes: (...args: unknown[]) => mockGetRetornableReportes(...args),
    getRetornableDetalleReporte: (...args: unknown[]) => mockGetRetornableDetalleReporte(...args),
    getRetornableHistorico: (...args: unknown[]) => mockGetRetornableHistorico(...args),
    getRetornableProductos: (...args: unknown[]) => mockGetRetornableProductos(...args),
    getRetornableComparacion: (...args: unknown[]) => mockGetRetornableComparacion(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRetornableResumen", () => {
  it("fetches resumen on mount", async () => {
    const mockData = {
      presentaciones: [],
      ultimo_reporte_fecha: null,
      ultimo_reporte_realizado_por: null,
    };
    mockGetRetornableResumen.mockResolvedValue(mockData);

    const { result } = renderHook(() => useRetornableResumen());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("handles error", async () => {
    mockGetRetornableResumen.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useRetornableResumen());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
    expect(result.current.data).toBeNull();
  });
});

describe("useRetornableReportes", () => {
  it("fetches reportes with pagination", async () => {
    const mockData = { items: [], total: 0, page: 1, page_size: 20, pages: 0 };
    mockGetRetornableReportes.mockResolvedValue(mockData);

    const { result } = renderHook(() => useRetornableReportes(1, 20));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(mockGetRetornableReportes).toHaveBeenCalledWith(1, 20);
  });

  it("refetches when page changes", async () => {
    const mockData = { items: [], total: 0, page: 2, page_size: 10, pages: 0 };
    mockGetRetornableReportes.mockResolvedValue(mockData);

    const { result, rerender } = renderHook(
      ({ page }) => useRetornableReportes(page, 10),
      { initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ page: 2 });
    await waitFor(() => expect(mockGetRetornableReportes).toHaveBeenCalledWith(2, 10));
  });
});

describe("useRetornableDetalleReporte", () => {
  it("does not fetch when id is null", () => {
    const { result } = renderHook(() => useRetornableDetalleReporte(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(mockGetRetornableDetalleReporte).not.toHaveBeenCalled();
  });

  it("fetches detalle when id is provided", async () => {
    const mockData = { reporte: { id: 1 }, detalles: [] };
    mockGetRetornableDetalleReporte.mockResolvedValue(mockData);

    const { result } = renderHook(() => useRetornableDetalleReporte(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
  });
});

describe("useRetornableHistorico", () => {
  it("fetches historico with filters", async () => {
    const mockData = { items: [], total: 0, page: 1, page_size: 20, pages: 0 };
    mockGetRetornableHistorico.mockResolvedValue(mockData);

    const filters = { presentacion: "222", tipo_movimiento: "VENTA" };
    const { result } = renderHook(() => useRetornableHistorico(1, 20, filters));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(mockGetRetornableHistorico).toHaveBeenCalledWith(1, 20, filters);
  });
});

describe("useRetornableProductos", () => {
  it("fetches productos on mount", async () => {
    const mockData = [
      { id: 1, producto_id: 1, presentacion: "222", producto_nombre: "Polar", stock_cajas: 10, stock_unidades: 0 },
    ];
    mockGetRetornableProductos.mockResolvedValue(mockData);

    const { result } = renderHook(() => useRetornableProductos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
  });

  it("handles empty list", async () => {
    mockGetRetornableProductos.mockResolvedValue([]);

    const { result } = renderHook(() => useRetornableProductos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
  });
});

describe("useRetornableComparacion", () => {
  it("fetches comparacion on mount", async () => {
    const mockData = {
      ultimo_reporte: null,
      reporte_anterior: null,
      lineas_sistema: [],
      lineas_anterior: [],
    };
    mockGetRetornableComparacion.mockResolvedValue(mockData);

    const { result } = renderHook(() => useRetornableComparacion());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
  });

  it("handles error gracefully", async () => {
    mockGetRetornableComparacion.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useRetornableComparacion());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Server error");
  });
});
