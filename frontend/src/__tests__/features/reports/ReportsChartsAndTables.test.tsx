import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RentabilityScatterChart from "@/features/reports/components/RentabilityScatterChart";
import type { ProductMatrixItem } from "@/types/api";
import type { ReactNode } from "react";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ScatterChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="scatter-chart">{children}</div>
  ),
  Scatter: ({ children }: { children: ReactNode }) => (
    <div data-testid="scatter">{children}</div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  Tooltip: () => null,
  Legend: ({ content }: { content?: (props: unknown) => ReactNode }) => {
    if (typeof content === "function") {
      return <div data-testid="chart-legend">{content({})}</div>;
    }
    return null;
  },
}));

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

  it("muestra tarjeta explicativa al hacer clic o tap en un cuadrante y la cierra", async () => {
    const data = [
      {
        id: 1,
        nombre: "Vino",
        precio_costo_usd: 8.0,
        precio_unidad_usd: 10.0,
        margen_porcentaje: 20.0,
        stock_unidades: 2,
        total_vendido: 1,
      },
    ];

    render(<RentabilityScatterChart data={data} />);

    // Initially, explanation only appears inside the tooltip span
    expect(screen.getAllByText(/Alta Rotación \+ Alto Margen/).length).toBe(1);

    // Click on Estrella legend button
    const estrellaBtn = screen.getByRole("button", { name: /ver información de cuadrante estrella/i });
    await userEvent.click(estrellaBtn);

    // Card appears: now it appears in both tooltip and the open explanation card
    expect(screen.getAllByText(/Alta Rotación \+ Alto Margen/).length).toBe(2);

    // Close button dismisses the card
    const closeBtn = screen.getByRole("button", { name: /cerrar explicación/i });
    await userEvent.click(closeBtn);

    expect(screen.getAllByText(/Alta Rotación \+ Alto Margen/).length).toBe(1);
  });
});
