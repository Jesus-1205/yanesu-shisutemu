import { describe, expect, it } from "vitest";
import { toCents, convertirCostos, calcularSubtotal } from "@/lib/money";

describe("toCents", () => {
  it("redondea a 2 decimales", () => {
    expect(toCents(0.004)).toBe(0.0);
    expect(toCents(0.01)).toBe(0.01);
    expect(toCents(22)).toBe(22);
    expect(toCents(14991.776)).toBe(14991.78);
    expect(toCents(0.1 + 0.2)).toBe(0.3);
  });

  it("maneja negativos", () => {
    expect(toCents(-0.01)).toBe(-0.01);
    expect(toCents(-14991.776)).toBe(-14991.78);
  });

  it("maneja cero", () => {
    expect(toCents(0)).toBe(0);
  });
});

describe("convertirCostos", () => {
  it("USD → ambos con tasa", () => {
    const result = convertirCostos(22, "USD", 750);
    expect(result.usd).toBe(22);
    expect(result.bs).toBe(16500);
  });

  it("BS → ambos con tasa", () => {
    const result = convertirCostos(16500, "BS", 750);
    expect(result.usd).toBe(22);
    expect(result.bs).toBe(16500);
  });

  it("tasa 0 o negativa → convertida queda en 0", () => {
    const result = convertirCostos(22, "USD", 0);
    expect(result.usd).toBe(22);
    expect(result.bs).toBe(0);

    const resultNeg = convertirCostos(22, "USD", -5);
    expect(resultNeg.usd).toBe(22);
    expect(resultNeg.bs).toBe(0);
  });

  it("redondea a céntimos en ambas monedas", () => {
    const result = convertirCostos(33.333, "USD", 750);
    expect(result.usd).toBe(33.33);
    expect(result.bs).toBe(24999.75);
  });
});

describe("calcularSubtotal", () => {
  it("4 cajas × $22 = $88 (el bug histórico)", () => {
    expect(calcularSubtotal(4, 22)).toBe(88);
  });

  it("1 unidad × $25 = $25", () => {
    expect(calcularSubtotal(1, 25)).toBe(25);
  });

  it("redondea a céntimos", () => {
    expect(calcularSubtotal(3, 10.005)).toBe(30.02);
  });

  it("cantidad 0 → subtotal 0", () => {
    expect(calcularSubtotal(0, 50)).toBe(0);
  });

  it("costo 0 → subtotal 0", () => {
    expect(calcularSubtotal(10, 0)).toBe(0);
  });
});
