import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoriasTab from "@/features/reports/components/CategoriasTab";
import ProveedoresTab from "@/features/reports/components/ProveedoresTab";
import { ToastProvider } from "@/ui-components/Toast";
import type {
  CategoryAnalyticsResponse,
  CategoryOut,
  SupplierAnalyticsResponse,
} from "@/types/api";
import type { ReactNode } from "react";

vi.mock("@/services/api", () => ({
  api: {
    getTopSellingCategories: vi.fn().mockResolvedValue([
      { categoria: { id: 1, nombre: "LICORES", descripcion: null }, total_vendido: 120 },
    ]),
    getLowRotationCategories: vi.fn().mockResolvedValue([
      { categoria: { id: 2, nombre: "SNACKS", descripcion: null }, total_vendido: 5 },
    ]),
  },
}));

vi.mock("@/features/reports/components/CategorySalesDonut", () => ({
  default: () => <div data-testid="category-sales-donut">CategorySalesDonut</div>,
}));

vi.mock("@/features/reports/components/SupplierComparisonBar", () => ({
  default: () => <div data-testid="supplier-comparison-bar">SupplierComparisonBar</div>,
}));

function renderWithToast(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const mockCategoryData: CategoryAnalyticsResponse = {
  total_categorias: 2,
  total_productos: 15,
  stock_total: 250,
  margen_promedio_general: 28.5,
  unidades_vendidas: 180,
  ingresos_usd: 4500.0,
  categorias: [
    {
      id: 1,
      nombre: "LICORES",
      descripcion: "Bebidas alcohólicas",
      total_productos: 10,
      stock_total: 180,
      margen_promedio: 35.0,
      unidades_vendidas: 140,
      ingresos_usd: 3500.0,
    },
    {
      id: 2,
      nombre: "SNACKS",
      descripcion: "Comida rápida y pasapalos",
      total_productos: 5,
      stock_total: 70,
      margen_promedio: 22.0,
      unidades_vendidas: 40,
      ingresos_usd: 1000.0,
    },
  ],
};

const mockTopSellingCats: { categoria: CategoryOut; total_vendido: number }[] = [
  { categoria: { id: 1, nombre: "LICORES", descripcion: null }, total_vendido: 140 },
];

const mockLowRotCats: { categoria: CategoryOut; total_vendido: number }[] = [
  { categoria: { id: 2, nombre: "SNACKS", descripcion: null }, total_vendido: 40 },
];

const mockSupplierData: SupplierAnalyticsResponse = {
  total_proveedores: 3,
  total_productos: 25,
  stock_total: 400,
  margen_promedio_general: 30.0,
  unidades_vendidas: 320,
  ingresos_usd: 8200.0,
  proveedores: [
    {
      id: 1,
      nombre: "EMPRESAS POLAR",
      telefono: "02121234567",
      email: "ventas@polar.com",
      total_productos: 15,
      stock_total: 250,
      margen_promedio: 32.5,
      unidades_vendidas: 220,
      ingresos_usd: 5500.0,
    },
    {
      id: 2,
      nombre: "SANTA TERESA",
      telefono: "02127654321",
      email: "contacto@santateresa.com",
      total_productos: 10,
      stock_total: 150,
      margen_promedio: 38.0,
      unidades_vendidas: 100,
      ingresos_usd: 2700.0,
    },
    {
      id: 3,
      nombre: "DISTRIBUIDORA INACTIVA",
      telefono: null,
      email: null,
      total_productos: 0,
      stock_total: 0,
      margen_promedio: 0,
      unidades_vendidas: 0,
      ingresos_usd: 0,
    },
  ],
};

describe("CategoriasTab", () => {
  it("muestra mensaje 'Sin datos de categorías' cuando data es null", () => {
    renderWithToast(<CategoriasTab data={null} topSelling={[]} lowRotation={[]} />);
    expect(screen.getByText("Sin datos de categorías")).toBeInTheDocument();
  });

  it("renderiza correctamente las métricas y tablas con datos", async () => {
    renderWithToast(
      <CategoriasTab
        data={mockCategoryData}
        topSelling={mockTopSellingCats}
        lowRotation={mockLowRotCats}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("category-sales-donut")).toBeInTheDocument();
    });

    expect(screen.getByText("Categorías")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("Productos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("15").length).toBeGreaterThan(0);
    expect(screen.getByText("Stock Total")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("Uds. Vendidas")).toBeInTheDocument();
    expect(screen.getAllByText("180").length).toBeGreaterThan(0);
    expect(screen.getByText("Ingresos USD")).toBeInTheDocument();
    expect(screen.getByText("$4.500,00")).toBeInTheDocument();

    expect(screen.getByText("Top Ventas")).toBeInTheDocument();
    expect(screen.getByText("Bajas Ventas")).toBeInTheDocument();
    expect(screen.getByText("Mayor Margen Prom.")).toBeInTheDocument();
    expect(screen.getByText("Menor Margen Prom.")).toBeInTheDocument();
    expect(screen.getByText("Detalle por Categoría")).toBeInTheDocument();
  });

  it("cambia el límite de visualización en los selects", async () => {
    const user = userEvent.setup();
    renderWithToast(
      <CategoriasTab
        data={mockCategoryData}
        topSelling={mockTopSellingCats}
        lowRotation={mockLowRotCats}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("category-sales-donut")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(1);

    await user.selectOptions(selects[0], "10");
    expect(selects[0]).toHaveValue("10");
  });
});

describe("ProveedoresTab", () => {
  it("muestra mensaje 'Sin datos de proveedores' cuando data es null", () => {
    renderWithToast(<ProveedoresTab data={null} />);
    expect(screen.getByText("Sin datos de proveedores")).toBeInTheDocument();
  });

  it("renderiza métricas principales y oculta proveedores inactivos por defecto", async () => {
    renderWithToast(<ProveedoresTab data={mockSupplierData} />);

    await waitFor(() => {
      expect(screen.getByTestId("supplier-comparison-bar")).toBeInTheDocument();
    });

    expect(screen.getByText("Proveedores")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("Productos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
    expect(screen.getByText("Stock Total")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
    expect(screen.getByText("Uds. Vendidas")).toBeInTheDocument();
    expect(screen.getByText("320")).toBeInTheDocument();
    expect(screen.getByText("Ingresos USD")).toBeInTheDocument();
    expect(screen.getByText("$8.200,00")).toBeInTheDocument();

    expect(screen.getByText("(1 inactivos)")).toBeInTheDocument();
    expect(screen.queryByText("Distribuidora Inactiva")).not.toBeInTheDocument();
  });

  it("muestra proveedores inactivos al marcar el checkbox 'Mostrar inactivos'", async () => {
    const user = userEvent.setup();
    renderWithToast(<ProveedoresTab data={mockSupplierData} />);

    await waitFor(() => {
      expect(screen.getByTestId("supplier-comparison-bar")).toBeInTheDocument();
    });

    const checkbox = screen.getByRole("checkbox", { name: /mostrar inactivos/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getAllByText("Distribuidora Inactiva").length).toBeGreaterThan(0);
  });
});
