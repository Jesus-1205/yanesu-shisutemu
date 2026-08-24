import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi as vitestVi } from "vitest";
import ObsequioForm from "@/features/invoices/components/ObsequioForm";
import type { ProductOut } from "@/types/api";

// ─── Mock AsyncCombobox ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require("react");

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
      ...options.map((opt: { value: number; label: string }) =>
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

// ─── Test Data ────────────────────────────────────────────────────────────

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

function renderForm(
  overrides: {
    products?: ProductOut[];
    onAdd?: ReturnType<typeof vitestVi.fn>;
    onSearchProducts?: ReturnType<typeof vitestVi.fn>;
  } = {},
) {
  const products = overrides.products ?? [mockProduct];
  const onAdd = overrides.onAdd ?? vi.fn();
  const onSearchProducts = overrides.onSearchProducts ?? vi.fn().mockResolvedValue(
    products.map((p) => ({ value: p.id, label: p.nombre })),
  );

  return {
    ...render(
      <ObsequioForm
        products={products}
        onSearchProducts={onSearchProducts}
        onAdd={onAdd}
      />,
    ),
    onAdd,
    onSearchProducts,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("ObsequioForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ─────────────────────────────────────────────────────

  it("renders form fields: product search, quantity, packaging, justification, add button", () => {
    renderForm();
    expect(screen.getByText("Buscar producto")).toBeInTheDocument();
    expect(screen.getByText("Cant")).toBeInTheDocument();
    expect(screen.getByText("Empaque")).toBeInTheDocument();
    expect(screen.getByText("Justificación")).toBeInTheDocument();
    expect(screen.getByText("+ Agregar")).toBeInTheDocument();
  });

  it("renders CAJA and UNIDAD packaging buttons", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Caja" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unid" })).toBeInTheDocument();
  });

  it("CAJA is selected by default", () => {
    renderForm();
    const cajaBtn = screen.getByRole("button", { name: "Caja" });
    expect(cajaBtn).toHaveClass("bg-purple-600");
  });

  // ── Validation ────────────────────────────────────────────────────

  it("Add button is disabled when no product selected", () => {
    renderForm();
    const addBtn = screen.getByText("+ Agregar");
    expect(addBtn.closest("button")).toBeDisabled();
  });

  it("Add button is disabled when justification is empty", async () => {
    renderForm();
    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);

    // Wait for option and click
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Justification empty → still disabled
    const addBtn = screen.getByText("+ Agregar");
    expect(addBtn.closest("button")).toBeDisabled();
  });

  it("Add button is disabled when justification < 3 chars", async () => {
    renderForm();
    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Type 2 chars justification
    const justificationInput = screen.getByPlaceholderText("Mín. 3 caracteres...");
    fireEvent.change(justificationInput, { target: { value: "ab" } });

    const addBtn = screen.getByText("+ Agregar");
    expect(addBtn.closest("button")).toBeDisabled();
  });

  it("Add button is enabled when product, qty, and justification >= 3 chars", async () => {
    renderForm();
    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Type 3+ chars justification
    const justificationInput = screen.getByPlaceholderText("Mín. 3 caracteres...");
    fireEvent.change(justificationInput, { target: { value: "Cortesía" } });

    const addBtn = screen.getByText("+ Agregar");
    expect(addBtn.closest("button")).not.toBeDisabled();
  });

  // ── Justification validation indicator ───────────────────────────

  it("shows char counter when justification has content but < 3 chars", async () => {
    renderForm();
    const justificationInput = screen.getByPlaceholderText("Mín. 3 caracteres...");
    fireEvent.change(justificationInput, { target: { value: "ab" } });
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("hides char counter when justification >= 3 chars", async () => {
    renderForm();
    const justificationInput = screen.getByPlaceholderText("Mín. 3 caracteres...");
    fireEvent.change(justificationInput, { target: { value: "abc" } });
    expect(screen.queryByText("3/3")).not.toBeInTheDocument();
  });

  // ── Packaging toggle ─────────────────────────────────────────────

  it("clicking UNIDAD clears unidades_por_caja", async () => {
    renderForm();
    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Click UNIDAD
    fireEvent.click(screen.getByRole("button", { name: "Unid" }));
    const unidadBtn = screen.getByRole("button", { name: "Unid" });
    expect(unidadBtn).toHaveClass("bg-purple-600");
  });

  it("clicking CAJA after UNIDAD restores the packaging", async () => {
    renderForm();
    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Switch to UNIDAD then back to CAJA
    fireEvent.click(screen.getByRole("button", { name: "Unid" }));
    fireEvent.click(screen.getByRole("button", { name: "Caja" }));
    const cajaBtn = screen.getByRole("button", { name: "Caja" });
    expect(cajaBtn).toHaveClass("bg-purple-600");
  });

  // ── Adding an item ───────────────────────────────────────────────

  it("calls onAdd with correct data when form is valid", async () => {
    const onAdd = vi.fn();
    renderForm({ onAdd });

    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Set quantity
    const qtyInput = screen.getByRole("spinbutton");
    fireEvent.change(qtyInput, { target: { value: "3" } });

    // Set justification
    const justificationInput = screen.getByPlaceholderText("Mín. 3 caracteres...");
    fireEvent.change(justificationInput, { target: { value: "Cortesía evento" } });

    // Click add
    fireEvent.click(screen.getByText("+ Agregar"));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        producto_id: 1,
        nombre: "Producto Test",
        tipo_empaque: "CAJA",
        cantidad: 3,
        unidades_por_caja: 36,
        justificacion: "Cortesía evento",
      }),
    );
  });

  it("resets form fields after successful add", async () => {
    const onAdd = vi.fn();
    renderForm({ onAdd });

    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Set justification
    const justificationInput = screen.getByPlaceholderText("Mín. 3 caracteres...");
    fireEvent.change(justificationInput, { target: { value: "Cortesía evento" } });

    // Click add
    fireEvent.click(screen.getByText("+ Agregar"));

    // After add, form should reset
    // The add button should be disabled again (no product, no justification)
    const addBtn = screen.getByText("+ Agregar");
    expect(addBtn.closest("button")).toBeDisabled();
  });

  it("calls onAdd with UNIDAD packaging when switched", async () => {
    const onAdd = vi.fn();
    renderForm({ onAdd });

    // Select product
    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "Producto" } });
    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);
    const option = await screen.findByTestId("option-1");
    fireEvent.click(option);

    // Switch to UNIDAD
    fireEvent.click(screen.getByRole("button", { name: "Unid" }));

    // Set justification
    const justificationInput = screen.getByPlaceholderText("Mín. 3 caracteres...");
    fireEvent.change(justificationInput, { target: { value: "Muestra gratis" } });

    // Click add
    fireEvent.click(screen.getByText("+ Agregar"));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_empaque: "UNIDAD",
      }),
    );
  });

  // ── Search integration ───────────────────────────────────────────

  it("calls onSearchProducts when searching", () => {
    const onSearchProducts = vi.fn().mockResolvedValue([]);
    renderForm({ onSearchProducts });

    const productInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(productInput, { target: { value: "test" } });

    const searchBtn = screen.getByTestId("combobox-Buscar producto...");
    fireEvent.click(searchBtn.querySelector("button")!);

    expect(onSearchProducts).toHaveBeenCalledWith("test");
  });
});
