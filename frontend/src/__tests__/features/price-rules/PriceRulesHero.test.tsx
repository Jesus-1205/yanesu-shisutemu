import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PriceRulesHero } from "@/features/price-rules/components/PriceRulesHero";

describe("PriceRulesHero", () => {
  it("muestra la información con 1 regla activa", () => {
    render(<PriceRulesHero activeRulesCount={1} />);

    expect(screen.getByText("Precios dinámicos por divisa")).toBeInTheDocument();
    expect(screen.getByText("1 regla activa")).toBeInTheDocument();
  });

  it("muestra la información con múltiples reglas activas", () => {
    render(<PriceRulesHero activeRulesCount={3} />);

    expect(screen.getByText("3 reglas activas")).toBeInTheDocument();
  });
});
