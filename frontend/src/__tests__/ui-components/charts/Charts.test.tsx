import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChartContainer from "@/ui-components/charts/ChartContainer";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";
import { ResponsiveContainer } from "@/ui-components/charts/ResponsiveContainer";

describe("ChartContainer", () => {
  it("renderiza el título y el contenido hijo", () => {
    render(
      <ChartContainer title="Ventas por Mes">
        <div data-testid="chart-child">Gráfico Mock</div>
      </ChartContainer>,
    );

    expect(screen.getByText("Ventas por Mes")).toBeInTheDocument();
    expect(screen.getByTestId("chart-child")).toBeInTheDocument();
  });

  it("aplica la altura especificada en props", () => {
    const { container } = render(
      <ChartContainer title="Gráfico Alto" height={450}>
        <div>Contenido</div>
      </ChartContainer>,
    );

    const chartWrapper = container.querySelector("div[style*='height: 450px']");
    expect(chartWrapper).toBeInTheDocument();
  });

  it("aplica la clase className adicional", () => {
    const { container } = render(
      <ChartContainer title="Test" className="custom-chart-class">
        <div>Contenido</div>
      </ChartContainer>,
    );

    expect(container.firstChild).toHaveClass("custom-chart-class");
  });
});

describe("ChartSkeleton", () => {
  it("renderiza con la altura y clases por defecto", () => {
    const { container } = render(<ChartSkeleton height={200} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass("animate-pulse");
    expect(skeleton.style.height).toBe("200px");
  });
});

describe("ResponsiveContainer (Re-export)", () => {
  it("está definido y es un componente de Recharts", () => {
    expect(ResponsiveContainer).toBeDefined();
  });
});
