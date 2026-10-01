import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  calculateVariation,
  enrichWithVariation,
  variationBadge,
  variationValue,
} from "@/features/exchange-rates/utils/variations";
import type { ExchangeRate } from "@/features/exchange-rates/types";

describe("variations utils", () => {
  const mockRates: ExchangeRate[] = [
    {
      id: 1,
      tasa_usd: 46.5,
      tasa_eur: 50.0,
      fecha_registro: "2026-08-11T10:00:00",
      registrado_por: 1,
      registrado_por_nombre: "admin",
    },
    {
      id: 2,
      tasa_usd: 45.0,
      tasa_eur: 49.0,
      fecha_registro: "2026-08-10T10:00:00",
      registrado_por: 1,
      registrado_por_nombre: "admin",
    },
  ];

  it("calculates variation correctly", () => {
    const res = calculateVariation(46.5, 45.0);
    expect(res).not.toBeNull();
    expect(res?.diff).toBe(1.5);
    expect(res?.pct).toBeCloseTo(3.333, 2);
    expect(res?.up).toBe(true);

    const downRes = calculateVariation(44.0, 45.0);
    expect(downRes?.up).toBe(false);
    expect(downRes?.diff).toBe(-1.0);

    expect(calculateVariation(null, 45.0)).toBeNull();
    expect(calculateVariation(45.0, null)).toBeNull();
    expect(calculateVariation(45.0, 0)).toBeNull();
  });

  it("enriches rates with previous rates", () => {
    const enriched = enrichWithVariation(mockRates);
    expect(enriched[0].previousUsd).toBe(45.0);
    expect(enriched[0].previousEur).toBe(49.0);
    expect(enriched[1].previousUsd).toBeUndefined();
    expect(enriched[1].previousEur).toBeUndefined();
  });

  it("renders variation badge correctly with 2 decimals difference", () => {
    const { rerender } = render(<div>{variationBadge(46.5, 45.0)}</div>);
    expect(screen.getByText(/▲/)).toBeInTheDocument();
    expect(screen.getByText(/3.33%/)).toBeInTheDocument();
    expect(screen.getByText(/\+1.50 Bs/)).toBeInTheDocument();

    rerender(<div>{variationBadge(44.0, 45.0)}</div>);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
    expect(screen.getByText(/-1.00 Bs/)).toBeInTheDocument();

    rerender(<div>{variationBadge(45.0, undefined)}</div>);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calculates variation percentage value correctly", () => {
    expect(variationValue(46.5, 45.0)).toBe(3.33);
    expect(variationValue(44.0, 45.0)).toBe(-2.22);
    expect(variationValue(45.0, undefined)).toBeNull();
    expect(variationValue(45.0, 0)).toBeNull();
  });
});
