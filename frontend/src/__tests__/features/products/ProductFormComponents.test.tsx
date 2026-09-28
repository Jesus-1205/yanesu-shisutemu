import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProductFormGeneralInfo } from "@/features/products/components/ProductFormGeneralInfo";
import { ProductFormPricing } from "@/features/products/components/ProductFormPricing";
import type { UseProductFormReturn } from "@/features/products/hooks/useProductForm";
import { PRODUCT_FORM_INITIAL } from "@/features/products/types";

function createMockFormAPI(overrides?: Partial<UseProductFormReturn>): UseProductFormReturn {
  return {
    form: { ...PRODUCT_FORM_INITIAL, ...overrides?.form },
    setForm: vi.fn(),
    setField: vi.fn(),
    numChange: vi.fn(() => vi.fn()),
    categories: [
      { id: 1, nombre: "Licores", descripcion: null },
      { id: 2, nombre: "Vinos", descripcion: null },
    ],
    suppliers: [
      { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null },
    ],
    loadingMeta: false,
    precioCostoUnitario: 5.0,
    unitMargin: {
      input: "30",
      margin: { margen: 30, label: "30%", color: "success" },
      onFocus: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
    },
    boxMargin: {
      input: "25",
      margin: { margen: 25, label: "25%", color: "warning" },
      onFocus: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
    },
    precioSugerido: 7.14,
    precioSugeridoCaja: 71.43,
    onCategoryCreated: vi.fn(),
    onSupplierCreated: vi.fn(),
    buildPayload: vi.fn(),
    ...overrides,
  };
}

describe("ProductFormGeneralInfo", () => {
  it("renderiza los campos generales y llama a setField al cambiar", () => {
    const mockAPI = createMockFormAPI();
    const handleOpenCat = vi.fn();
    const handleOpenSup = vi.fn();

    render(
      <ProductFormGeneralInfo
        formAPI={mockAPI}
        isOperator={false}
        onOpenCreateCategory={handleOpenCat}
        onOpenCreateSupplier={handleOpenSup}
        fieldId={(name) => `test-${name}`}
      />
    );

    expect(screen.getByText("Información General")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ej: Ron Santa Teresa Añejo")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("ej: Ron Santa Teresa Añejo");
    fireEvent.change(nameInput, { target: { value: "Ron Roble" } });
    expect(mockAPI.setField).toHaveBeenCalledWith("nombre", "Ron Roble");

    const catBtn = screen.getByLabelText("Crear categoría");
    fireEvent.click(catBtn);
    expect(handleOpenCat).toHaveBeenCalled();

    const supBtn = screen.getByLabelText("Crear proveedor");
    fireEvent.click(supBtn);
    expect(handleOpenSup).toHaveBeenCalled();
  });

  it("oculta campos de stock para operadores excepto unidades por caja", () => {
    const mockAPI = createMockFormAPI();
    render(
      <ProductFormGeneralInfo
        formAPI={mockAPI}
        isOperator={true}
        onOpenCreateCategory={vi.fn()}
        onOpenCreateSupplier={vi.fn()}
        fieldId={(name) => `test-${name}`}
      />
    );

    expect(screen.queryByLabelText("Stock cajas")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Stock unidades")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Unidades/caja")).toBeInTheDocument();
  });
});

describe("ProductFormPricing", () => {
  it("renderiza precios, costo sugerido y permite copiar sugeridos", () => {
    const mockAPI = createMockFormAPI();

    render(
      <ProductFormPricing
        formAPI={mockAPI}
        isOperator={false}
        fieldId={(name) => `test-${name}`}
      />
    );

    expect(screen.getByText("Precios y Finanzas")).toBeInTheDocument();
    expect(screen.getByText("$5.00")).toBeInTheDocument(); // Costo unitario
    expect(screen.getByText("$7.14")).toBeInTheDocument(); // Sugerido unitario
    expect(screen.getByText("$71.43")).toBeInTheDocument(); // Sugerido caja

    const copyButtons = screen.getAllByRole("button", { name: "Copiar" });
    expect(copyButtons).toHaveLength(2);

    fireEvent.click(copyButtons[0]);
    expect(mockAPI.setField).toHaveBeenCalledWith("precio_unidad_usd", 7.14);
  });

  it("oculta información financiera confidencial para operadores", () => {
    const mockAPI = createMockFormAPI();

    render(
      <ProductFormPricing
        formAPI={mockAPI}
        isOperator={true}
        fieldId={(name) => `test-${name}`}
      />
    );

    expect(screen.getByText("Precios")).toBeInTheDocument();
    expect(screen.queryByText("30% margen obj.")).not.toBeInTheDocument();
    expect(screen.queryByText("Margen unidad")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar" })).not.toBeInTheDocument();
  });
});
