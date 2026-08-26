import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InvoicesPage from "@/features/invoices/pages/InvoicesPage";
import type { FacturaOut, SupplierOut } from "@/types/api";

// ─── Mock API ──────────────────────────────────────────────────────────────
vi.mock("@/services/api", () => ({
  api: {
    getInvoices: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 0,
    }),
    getSuppliers: vi.fn().mockResolvedValue([]),
    getInvoiceStats: vi.fn().mockResolvedValue({
      pendientes: 0,
      parciales: 0,
      pagadas: 0,
      total: 0,
    }),
  },
}));

// ─── Mock Toast ────────────────────────────────────────────────────────────
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────
import { api } from "@/services/api";

// ─── Test Data ────────────────────────────────────────────────────────────
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
    fecha_limite_pago: null,
  },
  {
    id: 2,
    proveedor_id: 2,
    numero_factura: "002-00012345",
    tipo_documento: "NOTA_ENTREGA",
    fecha_factura: "2026-08-21",
    image_path: null,
    usuario_id: 1,
    observaciones: null,
    moneda_principal: "BS",
    tasa_bs: 750,
    total_usd: 50,
    total_bs: 37500,
    aplica_iva: false,
    estado_pago: "PENDIENTE",
    created_at: "2026-08-21T12:00:00",
    procesada_por_ia: false,
    raw_json_ia: null,
    total_pagado_usd: 0,
    total_pagado_bs: 0,
    saldo_pendiente_usd: 50,
    saldo_pendiente_bs: 37500,
    porcentaje_pagado: 0,
    supplier: { id: 2, nombre: "Proveedor B", telefono: null, email: null },
    detalles: [],
    obsequios: [],
    fecha_limite_pago: null,
  },
];

const mockSuppliers: SupplierOut[] = [
  { id: 1, nombre: "Proveedor A", telefono: null, email: null },
  { id: 2, nombre: "Proveedor B", telefono: null, email: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/invoices"]}>
      <InvoicesPage />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("InvoicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getInvoices as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: mockInvoices,
      total: 2,
      page: 1,
      page_size: 20,
      pages: 1,
    });
    (api.getSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuppliers,
    );
    (api.getInvoiceStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      pendientes: 2,
      parciales: 0,
      pagadas: 0,
      total: 2,
    });
  });

  it("renders page with 'Facturas de Proveedor' header", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /Facturas de Proveedor/ }),
    ).toBeInTheDocument();
  });

  it("shows 'Todos los tipos' filter option", () => {
    renderPage();
    // The Select component renders a native <select> element.
    // "Todos los tipos" is the default label for the tipo_documento filter.
    expect(screen.getByText("Todos los tipos")).toBeInTheDocument();
  });

  it("changing tipo_documento filter calls api.getInvoices with correct param", async () => {
    renderPage();

    // Wait for initial load to complete
    await waitFor(() => {
      expect(api.getInvoices).toHaveBeenCalledTimes(1);
    });

    // Initial call should not include tipo_documento (undefined is not sent)
    expect(api.getInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_documento: undefined }),
    );

    // Find the tipo_documento <select> by looking for the one with "Todos los tipos"
    const selects = screen.getAllByRole("combobox");
    // The tipo_documento select is the third one (search input, proveedor select, tipo select)
    // Actually, SearchInput is an <input>, so selects are: proveedor select + tipo select
    // The tipo select has "Todos los tipos" as its first option
    const tipoSelect = selects.find((sel) =>
      Array.from((sel as HTMLSelectElement).options).some(
        (opt) => opt.text === "Todos los tipos",
      ),
    );
    expect(tipoSelect).toBeTruthy();

    // Change to FACTURA
    fireEvent.change(tipoSelect!, { target: { value: "FACTURA" } });

    await waitFor(() => {
      expect(api.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ tipo_documento: "FACTURA" }),
      );
    });
  });

  it("changing tipo_documento to NOTA_ENTREGA calls api.getInvoices with NOTA_ENTREGA", async () => {
    renderPage();

    await waitFor(() => {
      expect(api.getInvoices).toHaveBeenCalledTimes(1);
    });

    const selects = screen.getAllByRole("combobox");
    const tipoSelect = selects.find((sel) =>
      Array.from((sel as HTMLSelectElement).options).some(
        (opt) => opt.text === "Todos los tipos",
      ),
    );
    expect(tipoSelect).toBeTruthy();

    fireEvent.change(tipoSelect!, { target: { value: "NOTA_ENTREGA" } });

    await waitFor(() => {
      expect(api.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ tipo_documento: "NOTA_ENTREGA" }),
      );
    });
  });

  it("renders invoice data including tipo_documento badges", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("001-00012345")).toBeInTheDocument();
    });

    // Both invoice types should appear as badges
    expect(screen.getAllByText("Factura").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Nota Entrega")).toBeInTheDocument();
  });

  it("shows supplier names in the table", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("Proveedor A").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("Proveedor B").length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no invoices exist", async () => {
    (api.getInvoices as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No hay facturas")).toBeInTheDocument();
    });
  });
});
