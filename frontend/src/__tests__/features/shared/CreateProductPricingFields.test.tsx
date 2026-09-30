import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateProductPricingFields from "@/features/shared/components/CreateProductPricingFields";
import { CreateProductContext } from "@/features/shared/context/CreateProductContext";
import type { UseCreateProductReturn } from "@/features/shared/hooks/useCreateProduct";
import { PRODUCT_FORM_INITIAL } from "@/features/products/types";

describe("CreateProductPricingFields", () => {
  const createMockContext = (
    overrides?: Partial<UseCreateProductReturn>
  ): UseCreateProductReturn => ({
    formData: {
      ...PRODUCT_FORM_INITIAL,
      precio_costo_caja_usd: 120,
      unidades_por_caja: 12,
      precio_unidad_usd: 15,
      precio_caja_usd: 160,
    },
    updateField: vi.fn(),
    isOperator: false,
    categories: [],
    suppliers: [],
    categoryOptions: [],
    supplierOptions: [],
    saving: false,
    error: null,
    costoUnitario: 10,
    precioSugeridoUnidad: 14.29,
    precioSugeridoCaja: 171.43,
    margin: { margen: 33.3, label: "33.3%", color: "success" },
    handleSearchSuppliers: vi.fn().mockResolvedValue([]),
    resetForm: vi.fn(),
    handleClose: vi.fn(),
    handleSubmit: vi.fn(),
    ...overrides,
  });

  const renderWithContext = (mockContext: UseCreateProductReturn) => {
    return render(
      <CreateProductContext.Provider value={mockContext}>
        <CreateProductPricingFields />
      </CreateProductContext.Provider>
    );
  };

  it("renders financial calculations and margin badge for administrator", () => {
    const mockContext = createMockContext({ isOperator: false });
    renderWithContext(mockContext);

    expect(screen.getByText("Precios y Finanzas")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("$14.29")).toBeInTheDocument();
    expect(screen.getByText("$171.43")).toBeInTheDocument();
    expect(screen.getAllByText("33.3%").length).toBeGreaterThanOrEqual(1);
  });

  it("renders simplified pricing headers for operator", () => {
    const mockContext = createMockContext({ isOperator: true });
    renderWithContext(mockContext);

    expect(screen.getByText("Precios")).toBeInTheDocument();
    expect(screen.queryByText(/30% margen obj/i)).not.toBeInTheDocument();
  });

  it("copies suggested unit price on click", async () => {
    const mockContext = createMockContext({ isOperator: false, precioSugeridoUnidad: 14.29 });
    renderWithContext(mockContext);

    const copyButtons = screen.getAllByRole("button", { name: /copiar/i });
    await userEvent.click(copyButtons[0]);

    expect(mockContext.updateField).toHaveBeenCalledWith("precio_unidad_usd", 14.29);
  });

  it("copies suggested box price on click", async () => {
    const mockContext = createMockContext({ isOperator: false, precioSugeridoCaja: 171.43 });
    renderWithContext(mockContext);

    const copyButtons = screen.getAllByRole("button", { name: /copiar/i });
    await userEvent.click(copyButtons[1]);

    expect(mockContext.updateField).toHaveBeenCalledWith("precio_caja_usd", 171.43);
  });
});
