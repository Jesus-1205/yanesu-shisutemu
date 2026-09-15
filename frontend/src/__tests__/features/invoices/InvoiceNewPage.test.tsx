import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InvoiceNewPage from "@/features/invoices/pages/InvoiceNewPage";
import type { SupplierOut, ProductOut, FacturaOut } from "@/types/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// @ts-expect-error vi.hoisted + require is valid at runtime in vitest mock factories
const React = vi.hoisted(() => require("react") as typeof import("react"));

// ─── Mock API ──────────────────────────────────────────────────────────────
vi.mock("@/services/api", () => ({
  api: {
    getSuppliers: vi.fn().mockResolvedValue([]),
    getProducts: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 0,
    }),
    createInvoice: vi.fn(),
    getRateHistory: vi.fn().mockResolvedValue({ history: [] }),
    analyzeInvoice: vi.fn(),
  },
}));

// ─── Mock Toast ────────────────────────────────────────────────────────────
const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ─── Mock Exchange Rate Store ──────────────────────────────────────────────
vi.mock("@/stores/exchangeRateStore", () => ({
  useExchangeRateStore: vi.fn(() => ({
    tasa: 742.81,
    tasaEUR: 805.32,
    loading: false,
    fechaUltimaActualizacion: "2026-08-24T12:00:00",
    needsUpdate: false,
    loadTasa: vi.fn().mockResolvedValue(undefined),
    checkDailyStatus: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ─── Mock AsyncCombobox (functional for testing) ───────────────────────────
vi.mock("@/ui-components/AsyncCombobox", () => ({
  default: function AsyncComboboxMock({
    value: _value,
    onChange,
    onSearch,
    placeholder,
  }: {
    value: number | null;
    onChange: (v: number | null) => void;
    onSearch: (q: string) => Promise<Array<{ value: number; label: string }>>;
    placeholder: string;
  }) {
    const [options, setOptions] = React.useState<Array<{ value: number; label: string }>>([]);
    const [query, setQuery] = React.useState("");

    const doSearch = React.useCallback(async () => {
      if (!query) { setOptions([]); return; }
      try { setOptions(await onSearch(query)); } catch { setOptions([]); }
    }, [query, onSearch]);

    return React.createElement("div", { "data-testid": `combobox-${placeholder}` },
      React.createElement("input", {
        placeholder,
        value: query,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
        "data-testid": `input-${placeholder}`,
      }),
      React.createElement("button", { type: "button", onClick: doSearch, "data-testid": `search-${placeholder}` }, "Buscar"),
      ...options.map((opt) =>
        React.createElement("button", {
          key: opt.value,
          type: "button",
          "data-testid": `option-${opt.value}`,
          onClick: () => { onChange(opt.value); setQuery(opt.label); },
        }, opt.label)
      ),
    );
  },
}));

// ─── Mock modals ─────────────────────────────────────────────────────────
vi.mock("@/features/shared/components/CreateSupplierModal", () => ({
  default: () => null,
}));
vi.mock("@/features/shared/components/CreateCategoryModal", () => ({
  default: () => null,
}));
vi.mock("@/features/shared/components/CreateProductModal", () => ({
  default: () => null,
}));

// ─── Mock Combobox ───────────────────────────────────────────────────────
vi.mock("@/ui-components/Combobox", () => ({
  default: () => null,
}));

// ─── Imports after mocks ──────────────────────────────────────────────────
import { api } from "@/services/api";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";

const mockApi = vi.mocked(api);

// ─── Test Data ────────────────────────────────────────────────────────────
const mockSuppliers: SupplierOut[] = [
  { id: 1, nombre: "Proveedor Test", telefono: null, email: null },
];

const mockProduct: ProductOut = {
  id: 1,
  nombre: "Producto Test",
  codigo_barra: "123456",
  categories: [],
  unidades_por_caja: 36,
  stock_cajas: 10,
  stock_unidades: 360,
  stock_minimo: 5,
  precio_costo_caja_usd: 22,
  precio_costo_usd: 0.61,
  precio_unidad_usd: 1.5,
  precio_caja_usd: 54,
  precio_sugerido_unidad_usd: 2,
  precio_sugerido_caja_usd: 72,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

async function renderPage() {
  const view = render(
    <MemoryRouter initialEntries={["/invoices/new"]}>
      <InvoiceNewPage />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Nueva Factura|Nueva Nota de Entrega/ })).toBeInTheDocument();
    expect(api.getSuppliers).toHaveBeenCalled();
  });
  return view;
}

function fillTasa(value: string) {
  const tasaInput = screen.getByLabelText(/Tasa de Cambio/);
  fireEvent.change(tasaInput, { target: { value } });
}

async function selectProduct(productName: string, productId: number) {
  const productInput = screen.getByPlaceholderText(
    "Buscar producto por nombre o código...",
  );
  fireEvent.change(productInput, { target: { value: productName } });

  const productCombobox = screen.getByTestId(
    "combobox-Buscar producto por nombre o código...",
  );
  const searchBtn = productCombobox.querySelector("button");
  expect(searchBtn).toBeTruthy();
  fireEvent.click(searchBtn!);

  await waitFor(() => {
    expect(screen.getByTestId(`option-${productId}`)).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId(`option-${productId}`));
}

function fillQuantity(value: string) {
  const quantityInput = screen.getByLabelText("Cajas");
  fireEvent.change(quantityInput, { target: { value } });
}

function fillCost(value: string) {
  const costInput = screen.getByLabelText(/Caja.*USD|Unid.*USD|Caja.*Bs|Unid.*Bs/);
  fireEvent.change(costInput, { target: { value } });
}

function clickAdd() {
  const addBtn = screen.getByTestId("agregar-item");
  fireEvent.click(addBtn);
}

describe("InvoiceNewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
    mockApi.getSuppliers.mockResolvedValue(mockSuppliers);
    mockApi.getProducts.mockResolvedValue({
      items: [mockProduct],
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    });
  });

  it("renders the page with header and form", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /Nueva Factura/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Registrar Factura/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(mockApi.getSuppliers).toHaveBeenCalled());
  });

  it("subtotal for CAJA items = quantity × unit cost (not inflated by units_per_box)", async () => {
    renderPage();
    fillTasa("750");
    await selectProduct("Producto Test", 1);
    fillQuantity("4");
    fillCost("22");

    const cajaBtn = screen.getByTestId("empaque-caja");
    expect(cajaBtn).toBeInTheDocument();

    clickAdd();

    await waitFor(() => {
      const elements = screen.getAllByText("$88,00");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.queryByText("$3.168,00")).not.toBeInTheDocument();
  });

  it("subtotal for UNIDAD items = quantity × unit cost", async () => {
    renderPage();
    fillTasa("750");
    await selectProduct("Producto Test", 1);

    const unidadBtn = screen.getByTestId("empaque-unid");
    fireEvent.click(unidadBtn);

    const quantityInput = screen.getByLabelText("Unids");
    fireEvent.change(quantityInput, { target: { value: "3" } });
    fillCost("10");
    clickAdd();

    await waitFor(() => {
      const elements = screen.getAllByText("$30,00");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("currency conversion: secondary cost field shows converted value", async () => {
    await renderPage();
    fillTasa("750");

    const secondaryField = screen.getByLabelText(/USD.*calc|Bs.*calc/);
    expect(secondaryField).toHaveValue("—");

    fillCost("22");
    expect((secondaryField as HTMLInputElement).value).toContain("16");
  });

  it("currency conversion: BS mode shows USD as secondary", async () => {
    await renderPage();
    const bsButton = screen.getByRole("button", { name: /Bs\./ });
    fireEvent.click(bsButton);

    fillTasa("750");
    fillCost("16500");

    const secondaryField = screen.getByLabelText(/USD.*calc|Bs.*calc/);
    expect((secondaryField as HTMLInputElement).value).toContain("22");
  });

  it("IVA breakdown in BS mode shows values in Bs", async () => {
    await renderPage();
    const bsButton = screen.getByRole("button", { name: /Bs\./ });
    fireEvent.click(bsButton);

    fillTasa("750");
    await selectProduct("Producto Test", 1);
    fillQuantity("2");
    fillCost("16500");
    clickAdd();

    await waitFor(() => {
      expect(screen.getByText("1 item")).toBeInTheDocument();
    });

    expect(screen.getByText("Resumen Fiscal y Total")).toBeInTheDocument();
    const bsElements = screen.getAllByText(/Bs\./);
    expect(bsElements.length).toBeGreaterThanOrEqual(1);

    const totalLabel = screen.getByText("Total");
    expect(totalLabel).toBeInTheDocument();
  });

  it("total_usd = sum of subtotals when adding multiple items", async () => {
    await renderPage();
    fillTasa("750");

    await selectProduct("Producto Test", 1);
    fillQuantity("4");
    fillCost("22");
    clickAdd();

    await waitFor(() => {
      const els = screen.getAllByText("$88,00");
      expect(els.length).toBeGreaterThanOrEqual(1);
    });

    await selectProduct("Producto Test", 1);
    fillQuantity("2");
    fillCost("15");
    clickAdd();

    await waitFor(() => {
      const els = screen.getAllByText("$118,00");
      expect(els.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows 'Nueva Factura' header and 'Registrar Factura' submit button by default", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { name: /Nueva Factura/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Registrar Factura/ }),
    ).toBeInTheDocument();
  });

  it("clicking 'Nota de Entrega' changes title and submit text", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Nota de Entrega" }));
    expect(
      screen.getByRole("heading", { name: /Nueva Nota de Entrega/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Registrar Nota de Entrega/ }),
    ).toBeInTheDocument();
  });

  it("validates form requirements on submit and shows toast errors", async () => {
    await renderPage();
    const submitBtn = screen.getByRole("button", { name: /Registrar Factura/ });
    
    mockToast.mockClear();
    await userEvent.click(submitBtn);
    expect(mockToast).toHaveBeenCalledWith("Selecciona un proveedor", "error");

    mockToast.mockClear();
    useInvoiceFormStore.getState().setField("proveedorId", 1);
    await userEvent.click(submitBtn);
    expect(mockToast).toHaveBeenCalledWith("Ingresa el número de factura", "error");

    mockToast.mockClear();
    useInvoiceFormStore.getState().setField("numeroFactura", "FAC-001");
    fillTasa("-1");
    await userEvent.click(submitBtn);
    expect(mockToast).toHaveBeenCalledWith("Ingresa la tasa de cambio", "error");

    mockToast.mockClear();
    fillTasa("750");
    await userEvent.click(submitBtn);
    expect(mockToast).toHaveBeenCalledWith("Agrega al menos un producto a la factura", "error");
  });

  it("submits invoice successfully and navigates to invoice details", async () => {
    mockApi.createInvoice.mockResolvedValue({
      id: 10,
      numero_factura: "FAC-999",
      tipo_documento: "FACTURA",
      total_usd: 88,
      total_bs: 66000,
    } as unknown as FacturaOut);

    await renderPage();
    fillTasa("750");

    useInvoiceFormStore.getState().setField("proveedorId", 1);
    useInvoiceFormStore.getState().setField("numeroFactura", "FAC-999");

    await selectProduct("Producto Test", 1);
    fillQuantity("4");
    fillCost("22");
    clickAdd();

    await waitFor(() => {
      expect(screen.getByText("1 item")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Registrar Factura/ });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApi.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          proveedor_id: 1,
          numero_factura: "FAC-999",
          tipo_documento: "FACTURA",
        }),
        undefined,
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith("/invoices/10");
      expect(mockToast).toHaveBeenCalledWith("Factura #FAC-999 registrada con éxito", "success");
    });
  });

  it("calls api.analyzeInvoice when a file is uploaded and the button is clicked", async () => {
    mockApi.analyzeInvoice.mockResolvedValue({
      proveedor_nombre: "Polar",
      numero_factura: "FAC-123",
      fecha_factura: "2025-01-01",
      fecha_limite_pago: null,
      moneda: "USD",
      tipo_documento: "FACTURA",
      productos: [],
      raw_json_ia: { total: 100 },
    });
    await renderPage();

    const fileListInput = document.querySelector('input[type="file"]');
    expect(fileListInput).toBeDefined();

    const file = new File(["dummy content"], "invoice.png", { type: "image/png" });
    Object.defineProperty(fileListInput!, "files", { value: [file] });

    fireEvent.change(fileListInput!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Leer con IA/i })).toBeInTheDocument();
    });

    const aiBtn = screen.getByRole("button", { name: /Leer con IA/i });
    await userEvent.click(aiBtn);

    await waitFor(() => {
      expect(mockApi.analyzeInvoice).toHaveBeenCalledWith([file]);
      expect(mockToast).toHaveBeenCalledWith("IA: 0 productos extraídos", "success");
    });
  });

  it("navigates back to /invoices when clicking Volver", async () => {
    renderPage();
    const backBtn = screen.getByRole("button", { name: /Volver/i });
    await userEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/invoices");
  });
});
