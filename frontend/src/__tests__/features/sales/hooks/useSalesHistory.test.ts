import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSalesHistory } from "../../../../features/sales/hooks/useSalesHistory";
import { ToastProvider } from "../../../../ui-components/Toast";
import { api } from "../../../../services/api";
import { exportToExcel } from "../../../../lib/exportToExcel";
import { useSalesFiltersStore } from "../../../../features/sales/store/salesFiltersStore";
import type { SaleListItem } from "../../../../features/sales/types";

vi.mock("../../../../lib/exportToExcel", () => ({
  exportToExcel: vi.fn().mockReturnValue("Ventas_2025.xlsx"),
}));

const mockSales: SaleListItem[] = [
  {
    id: 1,
    fecha_venta: "2025-01-15T14:30:00",
    usuario_id: 1,
    usuario_nombre: "Admin",
    tasa_bcv_aplicada: 45,
    historico_tasa_id: 1,
    observaciones: null,
    monto_exento_usd: 0,
    base_imponible_usd: 100,
    monto_iva_usd: 16,
    total_usd: 100,
    monto_exento_ves: 0,
    base_imponible_ves: 4500,
    monto_iva_ves: 720,
    total_ves: 4500,
    metodo_pago: "Efectivo",
    items_count: 1,
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(ToastProvider, null, children)
);

describe("useSalesHistory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSalesFiltersStore.getState().clearAll();
    vi.spyOn(api, "getSalesPaginated").mockResolvedValue({
      items: mockSales,
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    });
  });

  it("fetches sales on mount", async () => {
    const { result } = renderHook(() => useSalesHistory(), { wrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sales).toEqual(mockSales);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch error gracefully", async () => {
    vi.spyOn(api, "getSalesPaginated").mockRejectedValueOnce(new Error("Error al conectar"));

    const { result } = renderHook(() => useSalesHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Error al conectar");
    expect(result.current.sales).toEqual([]);
  });

  it("handles page change", async () => {
    const { result } = renderHook(() => useSalesHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handlePageChange(2);
    });

    expect(useSalesFiltersStore.getState().page).toBe(2);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("exports all sales across multiple pages", async () => {
    const saleA: SaleListItem = { ...mockSales[0], id: 1 };
    const saleB: SaleListItem = { ...mockSales[0], id: 2 };

    const getSalesPaginatedSpy = vi.spyOn(api, "getSalesPaginated")
      .mockResolvedValueOnce({ items: [saleA], total: 2, page: 1, page_size: 20, pages: 2 })
      .mockResolvedValueOnce({ items: [saleA], total: 2, page: 1, page_size: 200, pages: 2 })
      .mockResolvedValueOnce({ items: [saleB], total: 2, page: 2, page_size: 200, pages: 2 });

    const { result } = renderHook(() => useSalesHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(getSalesPaginatedSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 1, page_size: 200 }));
    expect(getSalesPaginatedSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2, page_size: 200 }));
    expect(exportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [saleA, saleB],
        filename: "Ventas",
      })
    );
  });

  it("handles export error gracefully", async () => {
    vi.spyOn(api, "getSalesPaginated")
      .mockResolvedValueOnce({ items: mockSales, total: 1, page: 1, page_size: 20, pages: 1 })
      .mockRejectedValueOnce(new Error("Export error"));

    const { result } = renderHook(() => useSalesHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleExportAll();
    });
  });
});
