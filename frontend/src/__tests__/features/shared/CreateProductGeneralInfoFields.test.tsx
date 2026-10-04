import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateProductGeneralInfoFields from "@/features/shared/components/CreateProductGeneralInfoFields";
import { CreateProductContext } from "@/features/shared/context/CreateProductContext";
import type { UseCreateProductReturn } from "@/features/shared/hooks/useCreateProduct";
import { PRODUCT_FORM_INITIAL } from "@/features/products/types";

describe("CreateProductGeneralInfoFields", () => {
  const createMockContext = (
    overrides?: Partial<UseCreateProductReturn>
  ): UseCreateProductReturn => ({
    formData: {
      ...PRODUCT_FORM_INITIAL,
      nombre: "Ron Cacique",
      codigo_barra: "123456",
      categoria_ids: [1],
      proveedor_id: 10,
      stock_unidades: 20,
      stock_minimo: 5,
      unidades_por_caja: 12,
      tipo_iva: "GRAVADO",
    },
    updateField: vi.fn(),
    isOperator: false,
    categories: [{ id: 1, nombre: "Licores", descripcion: null }],
    suppliers: [{ id: 10, nombre: "Distribuidora Polar", telefono: null, email: null }],
    categoryOptions: [{ value: 1, label: "Licores" }],
    supplierOptions: [{ value: 10, label: "Distribuidora Polar" }],
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
        <CreateProductGeneralInfoFields />
      </CreateProductContext.Provider>
    );
  };

  it("renders all general info fields for administrator", () => {
    const mockContext = createMockContext({ isOperator: false });
    renderWithContext(mockContext);

    expect(screen.getByText("Información General")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Ron Cacique");
    expect(screen.getByLabelText(/código de barra/i)).toHaveValue("123456");
    expect(screen.getByLabelText(/stock \(uds\)/i)).toHaveValue(20);
    expect(screen.getByLabelText(/stock mínimo/i)).toHaveValue(5);
    expect(screen.getByLabelText(/unds\/caja/i)).toHaveValue(12);
  });

  it("hides stock and stock minimo for operator", () => {
    const mockContext = createMockContext({ isOperator: true });
    renderWithContext(mockContext);

    expect(screen.queryByLabelText(/stock \(uds\)/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/stock mínimo/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/unds\/caja/i)).toBeInTheDocument();
  });

  it("updates stock fields when admin types in them", () => {
    const mockContext = createMockContext({ isOperator: false });
    renderWithContext(mockContext);

    const stockInput = screen.getByLabelText(/stock \(uds\)/i);
    fireEvent.change(stockInput, { target: { value: "50" } });

    expect(mockContext.updateField).toHaveBeenCalledWith("stock_unidades", 50);
  });

  it("updates IVA selection when changed", () => {
    const mockContext = createMockContext();
    renderWithContext(mockContext);

    const select = screen.getByDisplayValue("Gravado");
    fireEvent.change(select, { target: { value: "EXENTO" } });

    expect(mockContext.updateField).toHaveBeenCalledWith("tipo_iva", "EXENTO");
  });
});
