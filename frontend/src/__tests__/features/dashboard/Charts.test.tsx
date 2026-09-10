import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TopProductsBarChart from "@/features/dashboard/components/TopProductsBarChart";
import SalesTrendChart from "@/features/dashboard/components/SalesTrendChart";
import type { ProductOut, SalesSummaryItem } from "@/types/api";

const mockProduct: ProductOut = {
  id: 1,
  codigo_barra: "12345",
  nombre: "Ron Añejo Extra Viejo Edición Limitada",
  categories: [],
  unidades_por_caja: 12,
  stock_cajas: 10,
  stock_unidades: 120,
  stock_minimo: 5,
  precio_costo_caja_usd: 100,
  precio_costo_usd: 8.33,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_sugerido_unidad_usd: 15,
  precio_sugerido_caja_usd: 150,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

describe("TopProductsBarChart", () => {
  it("muestra mensaje 'Sin datos de ventas' cuando el array está vacío", () => {
    render(<TopProductsBarChart data={[]} />);
    expect(screen.getByText("Sin datos de ventas")).toBeInTheDocument();
  });

  it("renderiza el gráfico cuando hay datos", () => {
    const data = [
      { producto: mockProduct, total_vendido: 150 },
      { producto: { ...mockProduct, id: 2, nombre: "Cerveza Polar" }, total_vendido: 300 },
    ];

    const { container } = render(<TopProductsBarChart data={data} />);
    expect(screen.queryByText("Sin datos de ventas")).not.toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });
});

describe("SalesTrendChart", () => {
  it("muestra mensaje 'Sin datos de ventas' cuando el array está vacío", () => {
    render(<SalesTrendChart data={[]} />);
    expect(screen.getByText("Sin datos de ventas")).toBeInTheDocument();
  });

  it("renderiza el gráfico de área cuando hay datos diarios", () => {
    const data: SalesSummaryItem[] = [
      { periodo: "2025-01-15", total_usd: 150.5, total_ves: 6772.5, total_ventas: 5, costo_usd: 100, margen_usd: 50.5 },
      { periodo: "2025-01-16", total_usd: 320.0, total_ves: 14400.0, total_ventas: 12, costo_usd: 200, margen_usd: 120 },
    ];

    const { container } = render(<SalesTrendChart data={data} />);
    expect(screen.queryByText("Sin datos de ventas")).not.toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("renderiza con formato mensual (YYYY-MM)", () => {
    const data: SalesSummaryItem[] = [
      { periodo: "2025-01", total_usd: 5000, total_ves: 225000, total_ventas: 120, costo_usd: 3000, margen_usd: 2000 },
      { periodo: "2025-02", total_usd: 6200, total_ves: 279000, total_ventas: 150, costo_usd: 3800, margen_usd: 2400 },
    ];

    const { container } = render(<SalesTrendChart data={data} />);
    expect(screen.queryByText("Sin datos de ventas")).not.toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });
});
