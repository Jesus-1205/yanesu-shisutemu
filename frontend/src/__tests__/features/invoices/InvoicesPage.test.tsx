import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InvoicesPage from "@/features/invoices/pages/InvoicesPage";
import type { FacturaOut, SupplierOut } from "@/types/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/services/api", () => ({
  api: {
    getInvoices: vi.fn(),
    getSuppliers: vi.fn(),
    getInvoiceStats: vi.fn(),
  },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { api } from "@/services/api";
import { useInvoiceFiltersStore } from "@/features/invoices/store/invoiceFiltersStore";

const mockApi = vi.mocked(api);

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
    estado_pago: "PAGADA",
    created_at: "2026-08-21T12:00:00",
    procesada_por_ia: false,
    raw_json_ia: null,
    total_pagado_usd: 50,
    total_pagado_bs: 37500,
    saldo_pendiente_usd: 0,
    saldo_pendiente_bs: 0,
    porcentaje_pagado: 100,
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/invoices"]}>
      <InvoicesPage />
    </MemoryRouter>,
  );
}

describe("InvoicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFiltersStore.getState().clearAll();
    mockApi.getInvoices.mockResolvedValue({
      items: mockInvoices,
      total: 2,
      page: 1,
      page_size: 20,
      pages: 1,
    });
    mockApi.getSuppliers.mockResolvedValue(mockSuppliers);
    mockApi.getInvoiceStats.mockResolvedValue({
      pendientes: 1,
      parciales: 0,
      pagadas: 1,
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
    expect(screen.getByText("Todos los tipos")).toBeInTheDocument();
  });

  it("changing tipo_documento filter calls api.getInvoices with correct param", async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledTimes(1);
    });

    const selects = screen.getAllByRole("combobox");
    const tipoSelect = selects.find((sel) =>
      Array.from((sel as HTMLSelectElement).options).some(
        (opt) => opt.text === "Todos los tipos",
      ),
    );
    expect(tipoSelect).toBeTruthy();

    fireEvent.change(tipoSelect!, { target: { value: "FACTURA" } });

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ tipo_documento: "FACTURA" }),
      );
    });
  });

  it("changing tipo_documento to NOTA_ENTREGA calls api.getInvoices with NOTA_ENTREGA", async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledTimes(1);
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
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ tipo_documento: "NOTA_ENTREGA" }),
      );
    });
  });

  it("renders invoice data including tipo_documento badges", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("001-00012345")).toBeInTheDocument();
    });

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
    mockApi.getInvoices.mockResolvedValue({
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

  it("filters invoices by search query", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("001-00012345")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Buscar factura...");
    await userEvent.type(searchInput, "001");

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ search: "001" }),
      );
    });
  });

  it("switches status tabs (Pendientes, Pagadas)", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("001-00012345")).toBeInTheDocument();
    });

    const pendientesTab = screen.getByText("Pendientes");
    await userEvent.click(pendientesTab);

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ estado_pago: "PENDIENTE" }),
      );
    });

    const pagadasTab = screen.getByText("Pagadas");
    await userEvent.click(pagadasTab);

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ estado_pago: "PAGADA" }),
      );
    });
  });

  it("filters by date range and clears date filters", async () => {
    const { container } = renderPage();
    await waitFor(() => {
      expect(screen.getByText("001-00012345")).toBeInTheDocument();
    });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(0);
    const desdeInput = dateInputs[0];

    fireEvent.change(desdeInput, { target: { value: "2026-08-01" } });

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_desde: "2026-08-01" }),
      );
    });

    const clearDatesBtn = screen.getByText("Limpiar fechas");
    await userEvent.click(clearDatesBtn);

    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_desde: undefined }),
      );
    });
  });

  it("handles sortBy dropdown change", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("001-00012345")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    const sortSelect = selects.find((sel) =>
      Array.from((sel as HTMLSelectElement).options).some(
        (opt) => opt.value === "fecha_limite_pago",
      ),
    );

    expect(sortSelect).toBeDefined();

    fireEvent.change(sortSelect!, { target: { value: "fecha_limite_pago" } });
    await waitFor(() => {
      expect(mockApi.getInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ sort_by: "fecha_limite_pago" }),
      );
    });
  });

  it("handles error state and retries fetch on button click", async () => {
    mockApi.getInvoices
      .mockRejectedValueOnce(new Error("Fallo de red"))
      .mockResolvedValueOnce({
        items: mockInvoices,
        total: 2,
        page: 1,
        page_size: 20,
        pages: 1,
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Fallo de red")).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Reintentar");
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("001-00012345")).toBeInTheDocument();
    });
  });

  it("navigates to new invoice page when clicking Nueva Factura", async () => {
    renderPage();
    const newBtn = screen.getByRole("button", { name: /Nueva Factura/ });
    await userEvent.click(newBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/invoices/new");
  });
});
