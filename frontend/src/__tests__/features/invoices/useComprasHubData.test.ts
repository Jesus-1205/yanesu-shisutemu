import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useComprasHubData,
  getDaysUntil,
} from "@/features/invoices/hooks/useComprasHubData";
import { api } from "@/services/api";
import type { FacturaOut, InvoicePendingSummaryOut, InvoiceStatsOut, TopSupplier, EstadoPago } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getInvoicePendingSummary: vi.fn(),
    getInvoiceStats: vi.fn(),
    getInvoices: vi.fn(),
    getTopSuppliers: vi.fn(),
  },
}));

const mockPending: InvoicePendingSummaryOut = {
  total_pendiente_usd: 250.5,
};

const mockStats: InvoiceStatsOut = {
  pendientes: 4,
  parciales: 1,
  pagadas: 15,
  total: 20,
};

const mockTopSuppliers: TopSupplier[] = [
  { supplier_id: 1, supplier_name: "Distribuidora Polar", invoice_count: 20 },
  { supplier_id: 2, supplier_name: "Cervecería Regional", invoice_count: 14 },
];

function createMockInvoice(id: number, dateStr: string | null, estado: EstadoPago): FacturaOut {
  return {
    id,
    proveedor_id: 1,
    numero_factura: `FAC-${id}`,
    tipo_documento: "FACTURA",
    fecha_factura: "2026-08-01",
    image_path: null,
    usuario_id: 1,
    observaciones: null,
    moneda_principal: "USD",
    tasa_bs: 750,
    total_usd: 100,
    total_bs: 75000,
    aplica_iva: true,
    estado_pago: estado,
    created_at: "2026-08-01T12:00:00",
    procesada_por_ia: false,
    raw_json_ia: null,
    total_pagado_usd: 0,
    total_pagado_bs: 0,
    saldo_pendiente_usd: 100,
    saldo_pendiente_bs: 75000,
    porcentaje_pagado: 0,
    supplier: { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null },
    detalles: [],
    obsequios: [],
    fecha_limite_pago: dateStr,
  };
}

describe("getDaysUntil", () => {
  it("calculates difference in days correctly", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const year = in3Days.getFullYear();
    const month = String(in3Days.getMonth() + 1).padStart(2, "0");
    const day = String(in3Days.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    expect(getDaysUntil(dateStr)).toBe(3);
  });
});

describe("useComprasHubData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with loading=true and default values", () => {
    vi.mocked(api.getInvoicePendingSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getInvoiceStats).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getInvoices).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getTopSuppliers).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useComprasHubData());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBeNull();
    expect(result.current.stats).toBeNull();
    expect(result.current.nearbyInvoices).toEqual([]);
    expect(result.current.invoicesByDue).toEqual([]);
    expect(result.current.upcomingDueCount).toBe(0);
    expect(result.current.topSuppliers).toEqual([]);
  });

  it("fetches and sets all data successfully with calculated fields", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const formatDate = (daysOffset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const invDueIn2 = createMockInvoice(1, formatDate(2), "PENDIENTE");
    const invDueIn5 = createMockInvoice(2, formatDate(5), "PARCIALMENTE_PAGADA");
    const invDueIn10 = createMockInvoice(3, formatDate(10), "PENDIENTE");
    const invPaid = createMockInvoice(4, formatDate(1), "PAGADA");
    const invNoDue = createMockInvoice(5, null, "PENDIENTE");

    const invoicesList = [invDueIn5, invDueIn2, invDueIn10, invPaid, invNoDue];

    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue(mockPending);
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockStats);
    vi.mocked(api.getInvoices).mockResolvedValue({
      items: invoicesList,
      total: invoicesList.length,
      page: 1,
      page_size: 5,
      pages: 1,
    });
    vi.mocked(api.getTopSuppliers).mockResolvedValue(mockTopSuppliers);

    const { result } = renderHook(() => useComprasHubData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.pending).toEqual(mockPending);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.topSuppliers).toEqual(mockTopSuppliers);
    expect(result.current.nearbyInvoices).toHaveLength(5);

    // invoicesByDue filters out PAGADA and null dates, and sorts ascending by due date
    expect(result.current.invoicesByDue).toEqual([invDueIn2, invDueIn5, invDueIn10]);

    // upcomingDueCount counts between 0 and 7 days for non-paid (invDueIn2 and invDueIn5)
    expect(result.current.upcomingDueCount).toBe(2);
  });

  it("handles errors gracefully", async () => {
    vi.mocked(api.getInvoicePendingSummary).mockRejectedValue(new Error("Network failure"));
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockStats);
    vi.mocked(api.getInvoices).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5, pages: 0 });
    vi.mocked(api.getTopSuppliers).mockResolvedValue([]);

    const { result } = renderHook(() => useComprasHubData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Network failure");
    expect(result.current.pending).toBeNull();
  });

  it("supports refetching data", async () => {
    vi.mocked(api.getInvoicePendingSummary).mockResolvedValue(mockPending);
    vi.mocked(api.getInvoiceStats).mockResolvedValue(mockStats);
    vi.mocked(api.getInvoices).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5, pages: 0 });
    vi.mocked(api.getTopSuppliers).mockResolvedValue([]);

    const { result } = renderHook(() => useComprasHubData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const updatedSuppliers = [...mockTopSuppliers];
    vi.mocked(api.getTopSuppliers).mockResolvedValue(updatedSuppliers);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.topSuppliers).toEqual(updatedSuppliers);
  });
});
