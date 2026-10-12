import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RentabilityScatterChart from "@/features/reports/components/RentabilityScatterChart";
import VentasVsCostosChart from "@/features/reports/components/VentasVsCostosChart";
import CategorySalesDonut from "@/features/reports/components/CategorySalesDonut";
import SortableSalesTable from "@/features/reports/components/SortableSalesTable";
import SupplierComparisonBar from "@/features/reports/components/SupplierComparisonBar";
import { ToastProvider } from "@/ui-components/Toast";
import type {
  CategoryAnalyticsOut,
  ProductMatrixItem,
  SalesSummaryItem,
  SupplierAnalyticsOut,
} from "@/types/api";
import type { ReactNode } from "react";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="pie" data-item-count={data?.length}>
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  Tooltip: () => null,
  Legend: ({ content }: { content?: (props: unknown) => ReactNode }) => {
    if (typeof content === "function") {
      return <div data-testid="chart-legend">{content({})}</div>;
    }
    return null;
  },
  ScatterChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="scatter-chart">{children}</div>
  ),
  Scatter: ({ children }: { children: ReactNode }) => (
    <div data-testid="scatter">{children}</div>
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  Line: () => null,
}));

function renderWithToast(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("RentabilityScatterChart", () => {
  it("muestra mensaje 'Sin datos de rentabilidad' si el array está vacío", () => {
    render(<RentabilityScatterChart data={[]} />);
    expect(screen.getByText("Sin datos de rentabilidad")).toBeInTheDocument();
  });

  it("filtra productos con precio_costo_usd <= 0", () => {
    const data: ProductMatrixItem[] = [
      {
        id: 1,
        nombre: "Regalo Promocional",
        precio_costo_usd: 0,
        precio_unidad_usd: 10,
        margen_porcentaje: 100,
        stock_unidades: 20,
        total_vendido: 5,
      },
    ];
    render(<RentabilityScatterChart data={data} />);
    expect(screen.getByText("Sin datos de rentabilidad")).toBeInTheDocument();
  });

  it("renderiza la matriz de rendimiento con cuadrantes cuando hay datos válidos", () => {
    const data: ProductMatrixItem[] = [
      {
        id: 1,
        nombre: "Ron Cacique (Estrella)",
        precio_costo_usd: 5.0,
        precio_unidad_usd: 10.0,
        margen_porcentaje: 50.0,
        stock_unidades: 30,
        total_vendido: 25,
      },
      {
        id: 2,
        nombre: "Whisky 18 Años (Nicho)",
        precio_costo_usd: 50.0,
        precio_unidad_usd: 100.0,
        margen_porcentaje: 50.0,
        stock_unidades: 5,
        total_vendido: 4,
      },
      {
        id: 3,
        nombre: "Cerveza Polar (Caballo de batalla)",
        precio_costo_usd: 1.0,
        precio_unidad_usd: 1.2,
        margen_porcentaje: 16.67,
        stock_unidades: 100,
        total_vendido: 80,
      },
      {
        id: 4,
        nombre: "Vino Poco Vendido (Hueso)",
        precio_costo_usd: 8.0,
        precio_unidad_usd: 10.0,
        margen_porcentaje: 20.0,
        stock_unidades: 2,
        total_vendido: 1,
      },
    ];

    render(<RentabilityScatterChart data={data} />);
    expect(
      screen.getByText("Matriz de Rendimiento: Rotación vs. Margen %"),
    ).toBeInTheDocument();
    // Legend now shows short labels + tooltip icon (HelpCircle)
    // Note: "Nicho" also appears as an SVG quadrant label; use getAllByText
    expect(screen.getAllByText("Estrella").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Nicho").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Caballo de Batalla").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Hueso").length).toBeGreaterThanOrEqual(1);
  });
});

describe("VentasVsCostosChart", () => {
  it("muestra 'Sin datos de ventas' cuando el array está vacío", () => {
    render(<VentasVsCostosChart data={[]} />);
    expect(screen.getByText("Sin datos de ventas")).toBeInTheDocument();
  });

  it("renderiza el gráfico compuesto con ventas, costos y margen", () => {
    const data: SalesSummaryItem[] = [
      {
        periodo: "2025-01",
        total_usd: 1200.0,
        total_ves: 54000.0,
        total_ventas: 45,
        costo_usd: 800.0,
        margen_usd: 400.0,
      },
      {
        periodo: "2025-02",
        total_usd: 1500.0,
        total_ves: 67500.0,
        total_ventas: 60,
        costo_usd: 950.0,
        margen_usd: 550.0,
      },
    ];

    render(<VentasVsCostosChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });
});

describe("CategorySalesDonut", () => {
  it("muestra 'Sin datos de categorías' cuando el array está vacío", () => {
    render(<CategorySalesDonut data={[]} />);
    expect(screen.getByText("Sin datos de categorías")).toBeInTheDocument();
  });

  it("muestra 'Sin ingresos registrados' cuando todas las categorías tienen 0 ingresos", () => {
    const data: CategoryAnalyticsOut[] = [
      {
        id: 1,
        nombre: "LICORES",
        descripcion: null,
        total_productos: 5,
        stock_total: 10,
        margen_promedio: 20,
        unidades_vendidas: 0,
        ingresos_usd: 0,
      },
    ];
    render(<CategorySalesDonut data={data} />);
    expect(screen.getByText("Sin ingresos registrados")).toBeInTheDocument();
  });

  it("renderiza el gráfico de dona y leyenda con cuotas porcentuales", () => {
    const data: CategoryAnalyticsOut[] = [
      {
        id: 1,
        nombre: "LICORES",
        descripcion: null,
        total_productos: 10,
        stock_total: 50,
        margen_promedio: 30,
        unidades_vendidas: 100,
        ingresos_usd: 3000.0,
      },
      {
        id: 2,
        nombre: "SNACKS",
        descripcion: null,
        total_productos: 5,
        stock_total: 20,
        margen_promedio: 20,
        unidades_vendidas: 50,
        ingresos_usd: 1000.0,
      },
    ];

    render(<CategorySalesDonut data={data} />);
    expect(screen.getByText("Cuota de Ventas por Categoría")).toBeInTheDocument();
    expect(screen.getByText(/Licores \(75\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Snacks \(25\.0%\)/)).toBeInTheDocument();
  });
});

describe("SortableSalesTable", () => {
  const data: SalesSummaryItem[] = [
    {
      periodo: "2025-W01",
      total_usd: 500.0,
      total_ves: 22500.0,
      total_ventas: 20,
      costo_usd: 300.0,
      margen_usd: 200.0,
    },
    {
      periodo: "2025-W02",
      total_usd: 750.0,
      total_ves: 33750.0,
      total_ventas: 30,
      costo_usd: 450.0,
      margen_usd: 300.0,
    },
  ];

  it("renderiza los registros de ventas y cambia el límite con el selector", async () => {
    const user = userEvent.setup();
    renderWithToast(<SortableSalesTable data={data} rango="semanal" />);

    expect(screen.getByText("$500,00")).toBeInTheDocument();
    expect(screen.getByText("$750,00")).toBeInTheDocument();

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "10");
    expect(select).toHaveValue("10");
  });
});

describe("SupplierComparisonBar", () => {
  it("muestra 'Sin datos de proveedores' si data está vacío", () => {
    render(<SupplierComparisonBar data={[]} />);
    expect(screen.getByText("Sin datos de proveedores")).toBeInTheDocument();
  });

  it("permite alternar entre métrica de Ingresos y Unidades Vendidas", async () => {
    const user = userEvent.setup();
    const data: SupplierAnalyticsOut[] = [
      {
        id: 1,
        nombre: "POLAR",
        telefono: null,
        email: null,
        total_productos: 10,
        stock_total: 100,
        margen_promedio: 25,
        unidades_vendidas: 150,
        ingresos_usd: 3000.0,
      },
      {
        id: 2,
        nombre: "SANTA TERESA",
        telefono: null,
        email: null,
        total_productos: 5,
        stock_total: 50,
        margen_promedio: 35,
        unidades_vendidas: 80,
        ingresos_usd: 2500.0,
      },
    ];

    render(<SupplierComparisonBar data={data} />);
    expect(screen.getByText("Comparación de Proveedores")).toBeInTheDocument();

    const unidadesBtn = screen.getByRole("button", { name: "Unidades Vendidas" });
    await user.click(unidadesBtn);

    const ingresosBtn = screen.getByRole("button", { name: "Ingresos ($)" });
    await user.click(ingresosBtn);
  });
});
