import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProductExport } from "@/features/products/hooks/useProductExport";
import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";
import type { ProductOut as Product, SupplierOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getProducts: vi.fn(),
  },
}));

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(() => "Productos_2026.xlsx"),
}));

describe("useProductExport", () => {
  const suppliers: SupplierOut[] = [
    { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defines exportColumns and correctly renders supplier names and categories", () => {
    const { result } = renderHook(() => useProductExport(suppliers));
    expect(result.current.exportColumns).toHaveLength(12);

    const sampleProduct = {
      id: 1,
      nombre: "Cerveza Polar",
      codigo_barra: "12345",
      categories: [{ id: 1, nombre: "Bebidas" }],
      unidades_por_caja: 24,
      stock_unidades: 48,
      stock_minimo: 12,
      precio_costo_caja_usd: "20.00",
      precio_costo_usd: "0.83",
      precio_unidad_usd: "1.20",
      precio_caja_usd: "24.00",
      proveedor_id: 1,
      tipo_iva: "GRAVADO",
    } as unknown as Product;

    const catCol = result.current.exportColumns.find((c) => c.key === "categorias");
    const supCol = result.current.exportColumns.find((c) => c.key === "proveedor_id");

    expect(catCol?.render?.(sampleProduct)).toBe("Bebidas");
    expect(supCol?.render?.(sampleProduct)).toBe("Distribuidora Polar");
  });

  it("fetches paginated products and triggers exportToExcel", async () => {
    vi.mocked(api.getProducts).mockResolvedValueOnce({
      items: [
        { id: 1, nombre: "P1" } as unknown as Product,
      ],
      total: 1,
      page: 1,
      page_size: 200,
      pages: 1,
    });

    const { result } = renderHook(() => useProductExport(suppliers));

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(api.getProducts).toHaveBeenCalledWith({ page: 1, page_size: 200 });
    expect(exportToExcel).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Archivo descargado: Productos_2026.xlsx", "success");
  });

  it("handles export error with toast", async () => {
    vi.mocked(api.getProducts).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useProductExport(suppliers));

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(mockToast).toHaveBeenCalledWith("Error al exportar productos", "error");
  });
});
