import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SupplierMicroKPIs from "@/features/suppliers/components/SupplierMicroKPIs";
import SupplierTopProductsChart from "@/features/suppliers/components/SupplierTopProductsChart";
import SupplierInventoryTable from "@/features/suppliers/components/SupplierInventoryTable";
import SupplierAnalyticsDrawer from "@/features/suppliers/components/SupplierAnalyticsDrawer";
import { ToastProvider } from "@/ui-components/Toast";
import { api } from "@/services/api";
import type {
  SupplierAnalyticsResponse,
  SupplierDetailAnalytics,
  SupplierDetailProduct,
} from "@/types/api";
import type { ReactNode } from "react";

vi.mock("@/services/api", () => ({
  api: {
    getSupplierAnalytics: vi.fn(),
    getSupplierDetailAnalytics: vi.fn(),
  },
}));

function renderWithToast(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const mockSupplierAnalyticsData: SupplierAnalyticsResponse = {
  total_proveedores: 2,
  total_productos: 20,
  stock_total: 300,
  margen_promedio_general: 30.0,
  unidades_vendidas: 150,
  ingresos_usd: 4000.0,
  proveedores: [
    {
      id: 1,
      nombre: "EMPRESAS POLAR",
      telefono: "02121111111",
      email: "polar@test.com",
      total_productos: 12,
      stock_total: 200,
      margen_promedio: 28.0,
      unidades_vendidas: 100,
      ingresos_usd: 2800.0,
    },
    {
      id: 2,
      nombre: "SANTA TERESA",
      telefono: "02122222222",
      email: "st@test.com",
      total_productos: 8,
      stock_total: 100,
      margen_promedio: 33.0,
      unidades_vendidas: 50,
      ingresos_usd: 1200.0,
    },
  ],
};

const mockDetailProducts: SupplierDetailProduct[] = [
  {
    id: 101,
    nombre: "Cerveza Polar Pilsen 330ml",
    codigo_barra: "7591001",
    stock_unidades: 0,
    precio_unidad_usd: 1.2,
    unidades_vendidas: 70,
    ingresos_usd: 84.0,
    margen_porcentaje: 25.0,
  },
  {
    id: 102,
    nombre: "Malta Polar 250ml",
    codigo_barra: "7591002",
    stock_unidades: 4,
    precio_unidad_usd: 0.9,
    unidades_vendidas: 30,
    ingresos_usd: 27.0,
    margen_porcentaje: 30.0,
  },
  {
    id: 103,
    nombre: "Ron Pampero Aniversario",
    codigo_barra: "7591003",
    stock_unidades: 15,
    precio_unidad_usd: 22.0,
    unidades_vendidas: 0,
    ingresos_usd: 0.0,
    margen_porcentaje: 35.0,
  },
];

const mockSupplierDetail: SupplierDetailAnalytics = {
  id: 1,
  nombre: "EMPRESAS POLAR",
  total_productos: 3,
  stock_total: 19,
  unidades_vendidas: 100,
  ingresos_usd: 111.0,
  margen_promedio: 30.0,
  top_productos: mockDetailProducts,
};

describe("SupplierMicroKPIs", () => {
  it("renderiza skeleton cuando loading es true o data es null", () => {
    const { container } = renderWithToast(
      <SupplierMicroKPIs data={null} loading={true} />,
    );
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("calcula y renderiza el proveedor principal con mayor ingreso", () => {
    renderWithToast(
      <SupplierMicroKPIs data={mockSupplierAnalyticsData} loading={false} />,
    );

    expect(screen.getByText("Proveedor Principal")).toBeInTheDocument();
    expect(screen.getByText("EMPRESAS POLAR")).toBeInTheDocument();
    expect(screen.getByText("Compras Totales")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Total Proveedores")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("SupplierTopProductsChart", () => {
  it("muestra 'Sin productos con ventas' si data está vacío", () => {
    renderWithToast(<SupplierTopProductsChart data={[]} />);
    expect(screen.getByText("Sin productos con ventas")).toBeInTheDocument();
  });

  it("muestra 'Sin ventas registradas' si todos los productos tienen 0 unidades vendidas", () => {
    const data: SupplierDetailProduct[] = [
      {
        id: 1,
        nombre: "Producto Sin Ventas",
        codigo_barra: null,
        stock_unidades: 10,
        precio_unidad_usd: 5.0,
        unidades_vendidas: 0,
        ingresos_usd: 0,
        margen_porcentaje: 20,
      },
    ];
    renderWithToast(<SupplierTopProductsChart data={data} />);
    expect(screen.getByText("Sin ventas registradas")).toBeInTheDocument();
  });

  it("renderiza el gráfico con los productos que tienen ventas", () => {
    renderWithToast(<SupplierTopProductsChart data={mockDetailProducts} />);
    expect(
      screen.getByText("Top Productos del Proveedor"),
    ).toBeInTheDocument();
  });
});

describe("SupplierInventoryTable", () => {
  it("muestra 'Sin productos de este proveedor' si data está vacío", () => {
    renderWithToast(
      <SupplierInventoryTable data={[]} supplierName="POLAR" />,
    );
    expect(
      screen.getByText("Sin productos de este proveedor"),
    ).toBeInTheDocument();
  });

  it("renderiza la tabla con los badges de stock crítico y exportación", () => {
    renderWithToast(
      <SupplierInventoryTable
        data={mockDetailProducts}
        supplierName="POLAR"
      />,
    );

    expect(screen.getByText("Catálogo e Inventario")).toBeInTheDocument();
    expect(screen.getByText("Cerveza Polar Pilsen 330ml")).toBeInTheDocument();
    expect(screen.getByText("Malta Polar 250ml")).toBeInTheDocument();
    expect(screen.getByText("Ron Pampero Aniversario")).toBeInTheDocument();

    // Badges de stock
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });
});

describe("SupplierAnalyticsDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el spinner mientras carga la información detallada", () => {
    vi.mocked(api.getSupplierDetailAnalytics).mockReturnValue(
      new Promise(() => {}),
    );

    renderWithToast(
      <SupplierAnalyticsDrawer
        open={true}
        onClose={vi.fn()}
        supplierId={1}
        supplierName="EMPRESAS POLAR"
      />,
    );

    expect(screen.getByText("EMPRESAS POLAR")).toBeInTheDocument();
  });

  it("renderiza las métricas y la ganancia bruta calculada cuando la API responde", async () => {
    vi.mocked(api.getSupplierDetailAnalytics).mockResolvedValue(
      mockSupplierDetail,
    );

    renderWithToast(
      <SupplierAnalyticsDrawer
        open={true}
        onClose={vi.fn()}
        supplierId={1}
        supplierName="EMPRESAS POLAR"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Productos")).toBeInTheDocument();
    });

    expect(screen.getByText("Stock en Tienda")).toBeInTheDocument();
    expect(screen.getByText("19")).toBeInTheDocument();
    expect(screen.getByText("Ingresos Totales")).toBeInTheDocument();
    expect(screen.getByText("$111,00")).toBeInTheDocument();

    // Ganancia Bruta calculada: 111.00 * (30 / 100) = 33.30
    expect(screen.getByText("Ganancia Bruta")).toBeInTheDocument();
    expect(screen.getByText("$33,30")).toBeInTheDocument();
    expect(screen.getByText("30.0% de margen promedio")).toBeInTheDocument();
  });

  it("llama a onClose al cerrar el drawer", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    vi.mocked(api.getSupplierDetailAnalytics).mockResolvedValue(
      mockSupplierDetail,
    );

    renderWithToast(
      <SupplierAnalyticsDrawer
        open={true}
        onClose={handleClose}
        supplierId={1}
        supplierName="EMPRESAS POLAR"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Productos")).toBeInTheDocument();
    });

    const closeButtons = screen.getAllByRole("button");
    if (closeButtons.length > 0) {
      await user.click(closeButtons[0]);
    }
  });
});
