import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { api } from "@/services/api";
import { useInvoiceFiltersStore } from "@/features/invoices/store/invoiceFiltersStore";
import { useInvoicesList } from "@/features/invoices/hooks/useInvoicesList";
import type { FacturaOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getInvoices: vi.fn(),
    getInvoiceStats: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockInvoice: FacturaOut = {
  id: 1,
  proveedor_id: 1,
  numero_factura: "001-00012345",
  tipo_documento: "FACTURA",
  fecha_factura: "2026-08-20",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  moneda_principal: "USD",
  tasa_bs: 750,
  total_usd: 100,
  total_bs: 75000,
  aplica_iva: true,
  estado_pago: "PENDIENTE",
  created_at: "2026-08-20T12:00:00",
  procesada_por_ia: false,
  raw_json_ia: null,
  total_pagado_usd: 0,
  total_pagado_bs: 0,
  saldo_pendiente_usd: 100,
  saldo_pendiente_bs: 75000,
  porcentaje_pagado: 0,
  supplier: { id: 1, nombre: "Proveedor A", telefono: null, email: null },
  detalles: [],
  obsequios: [],
  fecha_limite_pago: null,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={["/invoices?estado=PENDIENTE"]}>
    {children}
  </MemoryRouter>
);

describe("useInvoicesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFiltersStore.getState().clearAll();
    mockApi.getInvoices.mockResolvedValue({
      items: [mockInvoice],
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    });
    mockApi.getInvoiceStats.mockResolvedValue({
      pendientes: 1,
      parciales: 0,
      pagadas: 0,
      total: 1,
    });
  });

  it("fetches invoices and stats correctly and initializes url searchParam", async () => {
    const { result } = renderHook(() => useInvoicesList(), { wrapper });

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.invoices).toHaveLength(1);
    expect(result.current.invoices[0].id).toBe(1);
    expect(result.current.stats.pendientes).toBe(1);
    expect(result.current.tabsWithCounts.find((t) => t.value === "PENDIENTE")?.badge).toBe(1);
    expect(useInvoiceFiltersStore.getState().estadoPago).toBe("PENDIENTE");
  });

  it("handles pagination and tab change", async () => {
    const { result } = renderHook(() => useInvoicesList(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handlePageChange(2);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(useInvoiceFiltersStore.getState().page).toBe(2);

    act(() => {
      result.current.handleTabChange("PAGADA");
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(useInvoiceFiltersStore.getState().estadoPago).toBe("PAGADA");
    expect(useInvoiceFiltersStore.getState().page).toBe(1);
  });

  it("captures error when api fails", async () => {
    mockApi.getInvoices.mockRejectedValue(new Error("Error fetching invoices"));
    const { result } = renderHook(() => useInvoicesList(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Error fetching invoices");
  });
});
