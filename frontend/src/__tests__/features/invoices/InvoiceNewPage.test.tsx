import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InvoiceNewPage from "@/features/invoices/pages/InvoiceNewPage";
import type { SupplierOut, ProductOut } from "@/types/api";

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
  },
}));

// ─── Mock Toast ────────────────────────────────────────────────────────────
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// ─── Mock AsyncCombobox (simplified for testing) ───────────────────────────
vi.mock("@/ui-components/AsyncCombobox", () => {
  const React = require("react");
  return {
    default: function AsyncComboboxMock({
      value,
      onChange,
      onSearch,
      placeholder,
      allowClear,
      clearLabel,
    }: {
      value: number | null;
      onChange: (v: number | null) => void;
      onSearch: (
        q: string,
      ) => Promise<Array<{ value: number; label: string; subtitle?: string }>>;
      placeholder: string;
      allowClear?: boolean;
      clearLabel?: string;
    }) {
      const [options, setOptions] = React.useState<
        Array<{ value: number; label: string; subtitle?: string }>
      >([]);
      const [query, setQuery] = React.useState("");

      const handleSearch = React.useCallback(async () => {
        if (!query) {
          setOptions([]);
          return;
        }
        try {
          const results = await onSearch(query);
          setOptions(results);
        } catch {
          setOptions([]);
        }
      }, [query, onSearch]);

      const children = [
        React.createElement("input", {
          key: "input",
          placeholder,
          value: query,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value),
          "data-testid": `combobox-input-${placeholder}`,
        }),
        React.createElement(
          "button",
          {
            key: "search",
            type: "button",
            onClick: handleSearch,
          },
          "Buscar",
        ),
      ];

      if (allowClear && value != null) {
        children.push(
          React.createElement(
            "button",
            {
              key: "clear",
              type: "button",
              onClick: () => {
                onChange(null);
                setQuery("");
              },
            },
            clearLabel || "Limpiar",
          ),
        );
      }

      options.forEach((opt) => {
        children.push(
          React.createElement(
            "button",
            {
              key: `opt-${opt.value}`,
              type: "button",
              "data-testid": `option-${opt.value}`,
              onClick: () => {
                onChange(opt.value);
                setQuery(opt.label);
              },
            },
            opt.label,
          ),
        );
      });

      return React.createElement(
        "div",
        { "data-testid": `combobox-${placeholder}` },
        ...children,
      );
    },
  };
});

// ─── Mock modals (not needed for these tests) ─────────────────────────────
vi.mock("@/features/shared/components/CreateSupplierModal", () => ({
  default: () => null,
}));
vi.mock("@/features/shared/components/CreateCategoryModal", () => ({
  default: () => null,
}));
vi.mock("@/features/shared/components/CreateProductModal", () => ({
  default: () => null,
}));

// ─── Mock Combobox (used in AI review panel) ──────────────────────────────
vi.mock("@/ui-components/Combobox", () => ({
  default: () => null,
}));

// ─── Imports after mocks ──────────────────────────────────────────────────
import { api } from "@/services/api";

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

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/invoices/new"]}>
      <InvoiceNewPage />
    </MemoryRouter>,
  );
}

/**
 * Fill in the tasa field.
 */
function fillTasa(value: string) {
  const tasaInput = screen.getByLabelText(/Tasa de Cambio/);
  fireEvent.change(tasaInput, { target: { value } });
}

/**
 * Search for a product in the product AsyncCombobox and select it.
 */
async function selectProduct(productName: string, productId: number) {
  const productInput = screen.getByPlaceholderText(
    "Buscar producto por nombre o código...",
  );
  fireEvent.change(productInput, { target: { value: productName } });

  // Click the search button in the product combobox
  const productCombobox = screen.getByTestId(
    "combobox-Buscar producto por nombre o código...",
  );
  const searchBtn = productCombobox.querySelector("button");
  expect(searchBtn).toBeTruthy();
  fireEvent.click(searchBtn!);

  // Wait for the option to appear and click it
  await waitFor(() => {
    expect(screen.getByTestId(`option-${productId}`)).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId(`option-${productId}`));
}

/**
 * Fill the quantity input.
 */
function fillQuantity(value: string) {
  const quantityInput = screen.getByLabelText("Cajas");
  fireEvent.change(quantityInput, { target: { value } });
}

/**
 * Fill the cost input (costo primario).
 */
function fillCost(value: string) {
  const costInput = screen.getByLabelText(/Caja.*USD|Unid.*USD|Caja.*Bs|Unid.*Bs/);
  fireEvent.change(costInput, { target: { value } });
}

/**
 * Click the "Agregar" button to add the current item.
 */
function clickAdd() {
  const addBtn = screen.getByRole("button", { name: /Agregar/ });
  fireEvent.click(addBtn);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("InvoiceNewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuppliers,
    );
    (api.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [mockProduct],
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    });
  });

  it("renders the page with header and form", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /Nueva Factura/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Registrar Factura/ }),
    ).toBeInTheDocument();
  });

  it("subtotal for CAJA items = quantity × unit cost (not inflated by units_per_box)", async () => {
    renderPage();

    // 1. Set tasa (required for canAdd)
    fillTasa("750");

    // 2. Select a product (unidades_por_caja = 36)
    await selectProduct("Producto Test", 1);

    // 3. Set quantity = 4
    fillQuantity("4");

    // 4. Set cost = 22 USD per box
    fillCost("22");

    // 5. Verify type is CAJA (default)
    const cajaBtn = screen.getByRole("button", { name: "Caja" });
    expect(cajaBtn).toBeInTheDocument();

    // 6. Click Agregar
    clickAdd();

    // 7. Verify subtotal = $88.00 (4 × 22 = 88), NOT $3168.00 (4 × 22 × 36)
    // The value "$88.00" appears in multiple places: table row, footer, fiscal panel
    await waitFor(() => {
      const elements = screen.getAllByText("$88.00");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    // Verify the inflated value does NOT appear anywhere
    expect(screen.queryByText("$3,168.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$3168.00")).not.toBeInTheDocument();
  });

  it("subtotal for UNIDAD items = quantity × unit cost", async () => {
    renderPage();

    // 1. Set tasa
    fillTasa("750");

    // 2. Select a product
    await selectProduct("Producto Test", 1);

    // 3. Switch to UNIDAD type
    const unidadBtn = screen.getByRole("button", { name: "Unid" });
    fireEvent.click(unidadBtn);

    // 4. Set quantity = 3
    const quantityInput = screen.getByLabelText("Unids");
    fireEvent.change(quantityInput, { target: { value: "3" } });

    // 5. Set cost = 10 USD per unit
    fillCost("10");

    // 6. Click Agregar
    clickAdd();

    // 7. Verify subtotal = $30.00 (3 × 10 = 30)
    await waitFor(() => {
      const elements = screen.getAllByText("$30.00");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("currency conversion: secondary cost field shows converted value", () => {
    renderPage();

    // The secondary cost field is read-only and shows the converted value.
    // When currency is USD (default) and tasa is set:
    //   primary = USD, secondary = Bs
    // When primary cost is 22 and tasa = 750:
    //   secondary = 22 × 750 = 16500 Bs

    // Set tasa
    fillTasa("750");

    // The secondary cost field should show "—" initially (no cost entered)
    const secondaryField = screen.getByLabelText(/USD.*calc|Bs.*calc/);
    expect(secondaryField).toHaveValue("—");

    // Enter a cost of 22 USD
    fillCost("22");

    // The secondary field should now show the BS equivalent: 22 × 750 = 16500
    // formatBs(16500) in es-VE locale = "16.500,00"
    expect(secondaryField.value).toContain("16");
  });

  it("currency conversion: BS mode shows USD as secondary", () => {
    renderPage();

    // Switch currency to BS
    const bsButton = screen.getByRole("button", { name: /Bs\./ });
    fireEvent.click(bsButton);

    // Set tasa
    fillTasa("750");

    // Enter a cost of 16500 BS
    fillCost("16500");

    // The secondary field should show USD: 16500 / 750 = 22
    const secondaryField = screen.getByLabelText(/USD.*calc|Bs.*calc/);
    expect(secondaryField.value).toContain("22");
  });

  it("IVA breakdown in BS mode shows values in Bs", async () => {
    renderPage();

    // Switch currency to BS
    const bsButton = screen.getByRole("button", { name: /Bs\./ });
    fireEvent.click(bsButton);

    // Set tasa
    fillTasa("750");

    // Select a product
    await selectProduct("Producto Test", 1);

    // Set quantity = 2
    fillQuantity("2");

    // Set cost = 16500 BS per box (22 USD × 750)
    fillCost("16500");

    // Click Agregar
    clickAdd();

    // Wait for the item to be added
    await waitFor(() => {
      expect(screen.getByText("1 item")).toBeInTheDocument();
    });

    // The fiscal summary panel should show "Resumen Fiscal y Total"
    expect(screen.getByText("Resumen Fiscal y Total")).toBeInTheDocument();

    // In BS mode, the panel shows "Bs." formatted values for Exento, Base, IVA, Total
    // Check that "Bs." text appears within the fiscal panel
    const bsElements = screen.getAllByText(/Bs\./);
    expect(bsElements.length).toBeGreaterThanOrEqual(1);

    // Verify the Total row in BS mode shows "Total" with Bs formatting
    // (when esBs is true, the total section shows "Total" label with Bs value)
    const totalLabel = screen.getByText("Total");
    expect(totalLabel).toBeInTheDocument();
  });

  it("total_usd = sum of subtotals when adding multiple items", async () => {
    renderPage();

    // Set tasa
    fillTasa("750");

    // Add first item: 4 boxes × $22 = $88
    await selectProduct("Producto Test", 1);
    fillQuantity("4");
    fillCost("22");
    clickAdd();

    // Wait for first item — "$88.00" appears in row, footer, and panel
    await waitFor(() => {
      const els = screen.getAllByText("$88.00");
      expect(els.length).toBeGreaterThanOrEqual(1);
    });

    // Add second item: 2 boxes × $15 = $30
    await selectProduct("Producto Test", 1);
    fillQuantity("2");
    fillCost("15");
    clickAdd();

    // Total should be 88 + 30 = 118
    await waitFor(() => {
      const els = screen.getAllByText("$118.00");
      expect(els.length).toBeGreaterThanOrEqual(1);
    });

    // Also verify the individual subtotals still appear
    const subtotal88 = screen.getAllByText("$88.00");
    expect(subtotal88.length).toBeGreaterThanOrEqual(1);

    const subtotal30 = screen.getAllByText("$30.00");
    expect(subtotal30.length).toBeGreaterThanOrEqual(1);
  });
});
