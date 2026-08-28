import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ComprasHubPage from "@/features/invoices/pages/ComprasHubPage";
import type { FacturaOut, SupplierOut } from "@/types/api";

// ─── Mock API ──────────────────────────────────────────────────────────────
vi.mock("@/services/api", () => ({
  api: {
    getInvoicePendingSummary: vi.fn().mockResolvedValue({ total_pendiente_usd: 0 }),
    getInvoiceStats: vi.fn().mockResolvedValue({
      pendientes: 0,
      parciales: 0,
      pagadas: 0,
      total: 0,
    }),
    getInvoices: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 5,
      pages: 0,
    }),
    getSuppliers: vi.fn().mockResolvedValue([]),
  },
}));

// ─── Mock Toast ────────────────────────────────────────────────────────────
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────
import { api } from "@/services/api";

// ─── Test Data ────────────────────────────────────────────────────────────
const mockSuppliers: SupplierOut[] = [
  { id: 1, nombre: "Proveedor A", telefono: "0412-1234567", email: "provA@test.com" },
  { id: 2, nombre: "Proveedor B", telefono: null, email: null },
];

const mockInvoices: FacturaOut[] = [
  {
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
    fecha_limite_pago: "2026-09-01",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/compras"]}>
      <ComprasHubPage />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("ComprasHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getInvoicePendingSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      total_pendiente_usd: 150.0,
    });
    (api.getInvoiceStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      pendientes: 3,
      parciales: 1,
      pagadas: 10,
      total: 14,
    });
    (api.getInvoices as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: mockInvoices,
      total: 1,
      page: 1,
      page_size: 5,
      pages: 1,
    });
    (api.getSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuppliers);
  });

  it("renders page with 'Compras' header", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Compras/ })).toBeInTheDocument();
    });
  });

  it("displays pending total USD KPI", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("$150.00")).toBeInTheDocument();
    });
  });

  it("displays paid invoices count", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  it("shows nearby invoices section", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Facturas Próximas a Vencer")).toBeInTheDocument();
    });
  });

  it("shows suppliers section", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Proveedores" })).toBeInTheDocument();
    });
  });

  it("renders supplier names in the table", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText("Proveedor A").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Proveedor B").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows empty state when no suppliers exist", async () => {
    (api.getSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay proveedores registrados")).toBeInTheDocument();
    });
  });

  it("calls all API methods on mount", async () => {
    renderPage();
    await waitFor(() => {
      expect(api.getInvoicePendingSummary).toHaveBeenCalledTimes(1);
      expect(api.getInvoiceStats).toHaveBeenCalledTimes(1);
      expect(api.getInvoices).toHaveBeenCalledTimes(1);
      expect(api.getSuppliers).toHaveBeenCalledTimes(1);
    });
  });
});
