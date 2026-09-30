import { describe, it, expect, vi } from "vitest";
import { render, screen, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateProductForm from "@/features/shared/components/CreateProductForm";
import { useCreateProductContext } from "@/features/shared/context/CreateProductContext";
import type { UseCreateProductReturn } from "@/features/shared/hooks/useCreateProduct";
import { PRODUCT_FORM_INITIAL } from "@/features/products/types";

describe("CreateProductForm & Context", () => {
  const createMockHook = (overrides?: Partial<UseCreateProductReturn>): UseCreateProductReturn => ({
    formData: {
      ...PRODUCT_FORM_INITIAL,
      nombre: "Ron Santa Teresa",
      codigo_barra: "123456",
      categoria_ids: [1],
      proveedor_id: 1,
      precio_costo_caja_usd: 50,
      unidades_por_caja: 12,
      precio_unidad_usd: 6,
      precio_caja_usd: 65,
      stock_unidades: 24,
      stock_minimo: 5,
      tipo_iva: "GRAVADO",
    },
    updateField: vi.fn(),
    isOperator: false,
    categories: [{ id: 1, nombre: "Licores", descripcion: null }],
    suppliers: [{ id: 1, nombre: "Distribuidora A", telefono: null, email: null }],
    categoryOptions: [{ value: 1, label: "Licores" }],
    supplierOptions: [{ value: 1, label: "Distribuidora A" }],
    saving: false,
    error: null,
    costoUnitario: 4.17,
    precioSugeridoUnidad: 5.95,
    precioSugeridoCaja: 71.43,
    margin: { margen: 30.5, label: "Saludable", color: "success" },
    handleSearchSuppliers: vi.fn().mockResolvedValue([]),
    resetForm: vi.fn(),
    handleClose: vi.fn(),
    handleSubmit: vi.fn((e) => e.preventDefault()),
    ...overrides,
  });

  it("throws error if useCreateProductContext is used outside provider", () => {
    expect(() => {
      renderHook(() => useCreateProductContext());
    }).toThrow("useCreateProductContext must be used within a CreateProductContext.Provider");
  });

  it("renders full form fields when compact is false", () => {
    const mockHook = createMockHook();
    render(<CreateProductForm hook={mockHook} compact={false} />);

    expect(screen.getByText("Información General")).toBeInTheDocument();
    expect(screen.getByText("Precios y Finanzas")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Ron Santa Teresa");
    expect(screen.getByLabelText(/código de barra/i)).toHaveValue("123456");
    expect(screen.getByText("Crear producto")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("renders compact mode properly", () => {
    const mockHook = createMockHook();
    render(<CreateProductForm hook={mockHook} compact={true} />);

    expect(screen.queryByText("Precios y Finanzas")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue("Ron Santa Teresa");
    expect(screen.getByText("El costo se establecerá desde la factura.")).toBeInTheDocument();
  });

  it("calls handleSubmit when submitting form", async () => {
    const mockHook = createMockHook();
    render(<CreateProductForm hook={mockHook} />);

    await userEvent.click(screen.getByText("Crear producto"));
    expect(mockHook.handleSubmit).toHaveBeenCalled();
  });

  it("calls handleClose when clicking Cancelar", async () => {
    const mockHook = createMockHook();
    render(<CreateProductForm hook={mockHook} />);

    await userEvent.click(screen.getByText("Cancelar"));
    expect(mockHook.handleClose).toHaveBeenCalled();
  });

  it("displays error message if present", () => {
    const mockHook = createMockHook({ error: "Nombre ya existe" });
    render(<CreateProductForm hook={mockHook} />);

    expect(screen.getByText("Nombre ya existe")).toBeInTheDocument();
  });
});
