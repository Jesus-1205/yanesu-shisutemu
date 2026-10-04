import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateProductCompactFields from "@/features/shared/components/CreateProductCompactFields";
import { CreateProductContext } from "@/features/shared/context/CreateProductContext";
import type { UseCreateProductReturn } from "@/features/shared/hooks/useCreateProduct";
import { PRODUCT_FORM_INITIAL } from "@/features/products/types";

describe("CreateProductCompactFields", () => {
  const createMockContext = (
    overrides?: Partial<UseCreateProductReturn>
  ): UseCreateProductReturn => ({
    formData: {
      ...PRODUCT_FORM_INITIAL,
      nombre: "Ron Santa Teresa",
      codigo_barra: "759123456",
      unidades_por_caja: 12,
      categoria_ids: [1],
    },
    updateField: vi.fn(),
    isOperator: false,
    categories: [{ id: 1, nombre: "Licores", descripcion: null }],
    suppliers: [],
    categoryOptions: [{ value: 1, label: "Licores" }],
    supplierOptions: [],
    saving: false,
    error: null,
    costoUnitario: 0,
    precioSugeridoUnidad: 0,
    precioSugeridoCaja: 0,
    margin: { margen: 0, label: "—", color: "neutral" },
    handleSearchSuppliers: vi.fn().mockResolvedValue([]),
    resetForm: vi.fn(),
    handleClose: vi.fn(),
    handleSubmit: vi.fn(),
    ...overrides,
  });

  const renderWithContext = (mockContext: UseCreateProductReturn) => {
    return render(
      <CreateProductContext.Provider value={mockContext}>
        <CreateProductCompactFields />
      </CreateProductContext.Provider>
    );
  };

  it("renders compact fields populated from context", () => {
    const mockContext = createMockContext();
    renderWithContext(mockContext);

    expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue("Ron Santa Teresa");
    expect(screen.getByLabelText(/código de barra/i)).toHaveValue("759123456");
    expect(screen.getByLabelText(/unidades por caja/i)).toHaveValue(12);
    expect(screen.getByText("Licores")).toBeInTheDocument();
  });

  it("calls updateField when changing name", () => {
    const mockContext = createMockContext();
    renderWithContext(mockContext);

    const input = screen.getByLabelText(/nombre del producto/i);
    fireEvent.change(input, { target: { value: "Vodka" } });

    expect(mockContext.updateField).toHaveBeenCalledWith("nombre", "Vodka");
  });

  it("calls updateField when changing units per box", () => {
    const mockContext = createMockContext();
    renderWithContext(mockContext);

    const input = screen.getByLabelText(/unidades por caja/i);
    fireEvent.change(input, { target: { value: "24" } });

    expect(mockContext.updateField).toHaveBeenCalledWith("unidades_por_caja", 24);
  });
});
