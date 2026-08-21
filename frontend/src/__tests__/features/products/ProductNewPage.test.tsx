import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProductNewPage from "../../../features/products/pages/ProductNewPage";

vi.mock("../../../services/api", () => ({
  api: {
    getCategories: vi.fn().mockResolvedValue([]),
    getSuppliers: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { rol_nombre: "ADMINISTRADOR" },
  }),
}));

vi.mock("@/features/shared/components/CreateCategoryModal", () => ({
  default: () => null,
}));

vi.mock("@/features/shared/components/CreateSupplierModal", () => ({
  default: () => null,
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ProductNewPage - Margin inputs", () => {
  it("renders the page with margin inputs", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });
    expect(screen.getByText("Margen unidad")).toBeInTheDocument();
    expect(screen.getByText("Margen caja")).toBeInTheDocument();
  });

  it("margin inputs have type text and inputMode decimal", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter(
      (input) => input.getAttribute("inputmode") === "decimal",
    );
    expect(marginInputs.length).toBe(2);
    marginInputs.forEach((input) => {
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("inputmode", "decimal");
    });
  });

  it("shows empty margin values when no prices are set", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter(
      (input) => input.getAttribute("inputmode") === "decimal",
    );
    // Both margin inputs should be empty initially
    expect(marginInputs[0]).toHaveValue("");
    expect(marginInputs[1]).toHaveValue("");
  });

  it("updates precio_unidad_usd when typing in unit margin input", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });

    // First set costo caja and unidades por caja to establish unit cost
    const costoCajaInput = screen.getByLabelText("Costo por caja USD");
    await userEvent.clear(costoCajaInput);
    await userEvent.type(costoCajaInput, "120");

    const udsPorCajaInput = screen.getByLabelText(/Unidades\/caja/i);
    await userEvent.clear(udsPorCajaInput);
    await userEvent.type(udsPorCajaInput, "10");
    // Unit cost = 120 / 10 = 12

    // Now type a margin percentage
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter(
      (input) => input.getAttribute("inputmode") === "decimal",
    );
    const unitMarginInput = marginInputs[0];

    await userEvent.clear(unitMarginInput);
    await userEvent.type(unitMarginInput, "50");

    // price = 12 / (1 - 50/100) = 12 / 0.5 = 24
    const precioUnidadInput = screen.getByLabelText(/Precio unidad USD/i);
    expect(precioUnidadInput).toHaveValue(24);
  });

  it("updates precio_caja_usd when typing in box margin input", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });

    // Set costo caja
    const costoCajaInput = screen.getByLabelText("Costo por caja USD");
    await userEvent.clear(costoCajaInput);
    await userEvent.type(costoCajaInput, "100");

    // Now type a margin percentage in box margin input
    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter(
      (input) => input.getAttribute("inputmode") === "decimal",
    );
    const cajaMarginInput = marginInputs[1];

    await userEvent.clear(cajaMarginInput);
    await userEvent.type(cajaMarginInput, "25");

    // price = 100 / (1 - 25/100) = 100 / 0.75 = 133.33... → rounded to 133.33
    const precioCajaInput = screen.getByLabelText(/Precio caja USD/i);
    expect(precioCajaInput).toHaveValue(133.33);
  });

  it("does not update price when margin divisor is zero or negative", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });

    const costoCajaInput = screen.getByLabelText("Costo por caja USD");
    await userEvent.clear(costoCajaInput);
    await userEvent.type(costoCajaInput, "100");

    const allInputs = screen.getAllByRole("textbox");
    const marginInputs = allInputs.filter(
      (input) => input.getAttribute("inputmode") === "decimal",
    );
    const cajaMarginInput = marginInputs[1];

    // Use fireEvent to set value directly to "100" (divisor = 1 - 100/100 = 0)
    // This avoids intermediate character-by-character updates from userEvent.type
    fireEvent.change(cajaMarginInput, { target: { value: "100" } });

    // precio_caja_usd should still be "" (initial value) since divisor is 0
    const precioCajaInput = screen.getByLabelText("Precio caja USD");
    expect(precioCajaInput).toHaveValue(null);
  });

  it("computes unit cost from caja cost and units per box", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });

    const costoCajaInput = screen.getByLabelText("Costo por caja USD");
    await userEvent.clear(costoCajaInput);
    await userEvent.type(costoCajaInput, "96");

    const udsPorCajaInput = screen.getByLabelText(/Unidades\/caja/i);
    await userEvent.clear(udsPorCajaInput);
    await userEvent.type(udsPorCajaInput, "12");

    // Unit cost = 96 / 12 = 8.00
    expect(screen.getByText("$8.00")).toBeInTheDocument();
  });

  it("shows suggested unit price based on 30% target margin", async () => {
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });

    const costoCajaInput = screen.getByLabelText("Costo por caja USD");
    await userEvent.clear(costoCajaInput);
    await userEvent.type(costoCajaInput, "96");

    const udsPorCajaInput = screen.getByLabelText(/Unidades\/caja/i);
    await userEvent.clear(udsPorCajaInput);
    await userEvent.type(udsPorCajaInput, "12");

    // Unit cost = 8, suggested = 8 / 0.7 = 11.43
    expect(screen.getByText("$11.43")).toBeInTheDocument();
  });

  it("submits form with correct values", async () => {
    const { api } = await import("../../../services/api");
    renderWithRouter(<ProductNewPage />);
    await waitFor(() => {
      expect(screen.getByText("Nuevo Producto")).toBeInTheDocument();
    });

    // Fill required fields
    await userEvent.type(screen.getByLabelText(/Nombre/i), "Test Product");

    const costoCajaInput = screen.getByLabelText("Costo por caja USD");
    await userEvent.clear(costoCajaInput);
    await userEvent.type(costoCajaInput, "100");

    const precioUnidadInput = screen.getByLabelText(/Precio unidad USD/i);
    await userEvent.clear(precioUnidadInput);
    await userEvent.type(precioUnidadInput, "15");

    const precioCajaInput = screen.getByLabelText(/Precio caja USD/i);
    await userEvent.clear(precioCajaInput);
    await userEvent.type(precioCajaInput, "180");

    // Submit
    await userEvent.click(screen.getByText("Crear Producto"));

    await waitFor(() => {
      expect(api.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: "Test Product",
          precio_costo_caja_usd: 100,
          precio_unidad_usd: 15,
          precio_caja_usd: 180,
        }),
      );
    });
  });
});
