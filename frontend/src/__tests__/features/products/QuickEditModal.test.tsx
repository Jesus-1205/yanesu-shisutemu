import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import QuickEditModal from "../../../features/products/components/QuickEditModal";
import type { Product } from "../../../types/api";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

vi.mock("../../../services/api", () => ({
  api: { updateProduct: vi.fn().mockResolvedValue({}) },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const product: Product = {
  id: 1,
  codigo_barra: "ABC123",
  nombre: "Whisky Premium",
  categories: [{ id: 1, nombre: "Licores", descripcion: null }],
  unidades_por_caja: 12,
  stock_cajas: 0,
  stock_unidades: 50,
  stock_minimo: 5,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: null,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

describe("QuickEditModal", () => {
  it("renders nothing when closed", () => {
    renderWithRouter(<QuickEditModal open={false} onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.queryByText("Editar Producto")).not.toBeInTheDocument();
  });

  it("renders product name and code when open", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Whisky Premium")).toBeInTheDocument();
    expect(screen.getByText(/Código: ABC123/)).toBeInTheDocument();
  });

  it("renders form inputs", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Costo caja USD")).toBeInTheDocument();
    expect(screen.getByText("Precio unidad USD")).toBeInTheDocument();
    expect(screen.getByText("Precio caja USD")).toBeInTheDocument();
  });

  it("renders margin inputs for unit and box", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Margen unidad")).toBeInTheDocument();
    expect(screen.getByText("Margen caja")).toBeInTheDocument();
  });

  it("shows Cancelar and Guardar Cambios buttons", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(screen.getByText("Guardar Cambios")).toBeInTheDocument();
  });

  it("shows link to full edit page", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Edición completa →")).toBeInTheDocument();
  });

  it("calls onClose when Cancelar clicked", async () => {
    const onClose = vi.fn();
    renderWithRouter(<QuickEditModal open onClose={onClose} onSaved={vi.fn()} product={product} />);
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when form submitted with no changes", async () => {
    const onClose = vi.fn();
    const { api } = await import("../../../services/api");
    renderWithRouter(<QuickEditModal open onClose={onClose} onSaved={vi.fn()} product={product} />);
    await userEvent.click(screen.getByText("Guardar Cambios"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.updateProduct).not.toHaveBeenCalled();
  });

  it("submits changed precio caja value", async () => {
    const onSaved = vi.fn();
    const { api } = await import("../../../services/api");
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={onSaved} product={product} />);

    const precioCajaInput = screen.getByLabelText("Precio caja USD");
    await userEvent.clear(precioCajaInput);
    await userEvent.type(precioCajaInput, "200");

    await userEvent.click(screen.getByText("Guardar Cambios"));

    await waitFor(() => {
      expect(api.updateProduct).toHaveBeenCalledWith(1, { precio_caja_usd: 200 });
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("renders Margen caja input with type text and inputMode decimal", () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    // Find the input inside the Margen caja section
    const allInputs = screen.getAllByRole("textbox");
    // The margin inputs are the ones inside the margin sections
    // Look for inputs with inputMode="decimal"
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    expect(marginInputs.length).toBe(2); // one for unit margin, one for box margin
    marginInputs.forEach((input) => {
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("inputmode", "decimal");
    });
  });

  it("shows calculated box margin value", () => {
    // precio_costo_caja_usd: 96, precio_caja_usd: 150
    // margin = ((150 - 96) / 150) * 100 = 36%
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    expect(screen.getByText("Margen caja")).toBeInTheDocument();
    // The margin caja input should display the calculated margin
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    // Second margin input is box margin — should show ~36.0
    expect(marginInputs[1]).toHaveValue("36.0");
  });

  it("shows calculated unit margin value", () => {
    // precio_costo_caja_usd: 96, unidades_por_caja: 12 → costo unitario = 8
    // precio_unidad_usd: 15
    // margin = ((15 - 8) / 15) * 100 = 46.666...%
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    // First margin input is unit margin — should show ~46.7
    expect(marginInputs[0]).toHaveValue("46.7");
  });

  it("updates precio_unidad_usd when typing in margin unit input", async () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    const unitMarginInput = marginInputs[0];

    // Clear and type a new margin percentage
    await userEvent.clear(unitMarginInput);
    await userEvent.type(unitMarginInput, "50");

    // precio_costo_unitario = 96/12 = 8
    // price = 8 / (1 - 50/100) = 8 / 0.5 = 16
    const precioUnidadInput = screen.getByLabelText("Precio unidad USD");
    expect(precioUnidadInput).toHaveValue(16);
  });

  it("updates precio_caja_usd when typing in margin caja input", async () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    const cajaMarginInput = marginInputs[1];

    // Clear and type a new margin percentage
    await userEvent.clear(cajaMarginInput);
    await userEvent.type(cajaMarginInput, "40");

    // precio_costo_caja = 96
    // price = 96 / (1 - 40/100) = 96 / 0.6 = 160
    const precioCajaInput = screen.getByLabelText("Precio caja USD");
    expect(precioCajaInput).toHaveValue(160);
  });

  it("resets margin caja input to calculated value on blur", async () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    const cajaMarginInput = marginInputs[1];

    // Type a value then blur
    await userEvent.clear(cajaMarginInput);
    await userEvent.type(cajaMarginInput, "25");
    await userEvent.tab();

    // After blur, it should reset to the calculated margin from the new price
    // price = 96 / (1 - 25/100) = 96 / 0.75 = 128
    // margin = ((128 - 96) / 128) * 100 = 25.0
    expect(cajaMarginInput).toHaveValue("25.0");
  });

  it("resets margin unit input to calculated value on blur", async () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    const unitMarginInput = marginInputs[0];

    // Type a value then blur
    await userEvent.clear(unitMarginInput);
    await userEvent.type(unitMarginInput, "20");
    await userEvent.tab();

    // costo_unitario = 96/12 = 8
    // price = 8 / (1 - 20/100) = 8 / 0.8 = 10
    // margin = ((10 - 8) / 10) * 100 = 20.0
    expect(unitMarginInput).toHaveValue("20.0");
  });

  it("does not update price when margin divisor is zero or negative", async () => {
    renderWithRouter(<QuickEditModal open onClose={vi.fn()} onSaved={vi.fn()} product={product} />);
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter((input) => input.getAttribute("inputmode") === "decimal");
    const unitMarginInput = marginInputs[0];

    // Use fireEvent to set value directly to "100" (divisor = 1 - 100/100 = 0)
    // This avoids intermediate character-by-character updates from userEvent.type
    fireEvent.change(unitMarginInput, { target: { value: "100" } });

    const precioUnidadInput = screen.getByLabelText("Precio unidad USD");
    // Price should remain unchanged (15) since divisor is 0
    expect(precioUnidadInput).toHaveValue(15);
  });
});