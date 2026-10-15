import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SalesKpiCards from "@/features/sales/components/SalesKpiCards";

describe("SalesKpiCards", () => {
  const sampleTotals = {
    totalVentas: 68,
    totalUsd: 298.17,
    totalVes: 256500.5,
    ticketPromedioUsd: 4.38,
  };

  it("renders metrics when loaded", () => {
    render(<SalesKpiCards totals={sampleTotals} loading={false} />);
    expect(screen.getByText("Ingresos (USD)")).toBeInTheDocument();
    expect(screen.getByText("$298,17")).toBeInTheDocument();
    expect(screen.getByText("Total Bolívares")).toBeInTheDocument();
    expect(screen.getByText("Bs 256.500,50")).toBeInTheDocument();
    expect(screen.getByText("N° de Ventas")).toBeInTheDocument();
    expect(screen.getByText("68")).toBeInTheDocument();
    expect(screen.getByText("Venta Promedio")).toBeInTheDocument();
    expect(screen.getByText("$4,38")).toBeInTheDocument();
  });

  it("renders skeletons when loading", () => {
    const { container } = render(<SalesKpiCards totals={sampleTotals} loading={true} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
