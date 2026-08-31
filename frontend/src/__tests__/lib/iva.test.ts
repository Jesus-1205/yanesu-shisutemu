import { describe, expect, it } from "vitest";
import { calcIva, calcularResumenFiscal, IVA_RATE } from "../../lib/iva";

describe("calcIva", () => {
  it("uses the single IVA rate of the system", () => {
    expect(IVA_RATE).toBe(16);
  });

  it("computes 16% of the subtotal", () => {
    expect(calcIva(100)).toBe(16);
    expect(calcIva(15)).toBe(2.4);
    expect(calcIva(3.33)).toBe(0.53);
  });

  it("returns 0 for zero subtotal", () => {
    expect(calcIva(0)).toBe(0);
  });

  it("rounds to cents per operation", () => {
    // 0.525 → 0.53 (Math.round half away from zero), igual que el POS
    expect(calcIva(3.28125)).toBe(0.53);
  });
});

describe("calcularResumenFiscal", () => {
  const gravado = { subtotal_usd: 100, subtotal_bs: 3650, tipo_iva: "GRAVADO" as const };
  const exento = { subtotal_usd: 50, subtotal_bs: 1825, tipo_iva: "EXENTO" as const };

  it("BS + IVA + GRAVADO: base=3650, iva=584, exento=0", () => {
    const result = calcularResumenFiscal([gravado], "BS", true);
    expect(result.base_imponible).toBe(3650);
    expect(result.iva).toBe(584); // 3650 * 0.16 = 584
    expect(result.exento).toBe(0);
    expect(result.total).toBe(4234); // 3650 + 584
  });

  it("BS + IVA + EXENTO: exento=1825, base=0, iva=0", () => {
    const result = calcularResumenFiscal([exento], "BS", true);
    expect(result.exento).toBe(1825);
    expect(result.base_imponible).toBe(0);
    expect(result.iva).toBe(0);
    expect(result.total).toBe(1825);
  });

  it("BS + IVA mixto: solo GRAVADO genera IVA", () => {
    const result = calcularResumenFiscal([gravado, exento], "BS", true);
    expect(result.base_imponible).toBe(3650);
    expect(result.iva).toBe(584);
    expect(result.exento).toBe(1825);
    expect(result.total).toBe(6059); // 3650 + 584 + 1825
  });

  it("USD mode: todo va a exento sin importar tipo_iva", () => {
    const result = calcularResumenFiscal([gravado], "USD", true);
    expect(result.exento).toBe(100); // usa subtotal_usd
    expect(result.base_imponible).toBe(0);
    expect(result.iva).toBe(0);
    expect(result.total).toBe(100);
  });

  it("aplicaIva=false: todo va a exento", () => {
    const result = calcularResumenFiscal([gravado], "BS", false);
    expect(result.exento).toBe(3650);
    expect(result.base_imponible).toBe(0);
    expect(result.iva).toBe(0);
    expect(result.total).toBe(3650);
  });

  it("empty items: totales en 0", () => {
    const result = calcularResumenFiscal([], "BS", true);
    expect(result.exento).toBe(0);
    expect(result.base_imponible).toBe(0);
    expect(result.iva).toBe(0);
    expect(result.total).toBe(0);
  });

  it("rounding accumulation: 100 items de $0.10", () => {
    // calcIva(0.10) = Math.round(0.10 * 16) / 100 = Math.round(1.6)/100 = 0.02
    // 100 items: base = 100 * 0.10 = 10.00, iva = 100 * 0.02 = 2.00
    const items = Array.from({ length: 100 }, () => ({
      subtotal_usd: 0.10,
      subtotal_bs: 0.10,
      tipo_iva: "GRAVADO" as const,
    }));
    const result = calcularResumenFiscal(items, "BS", true);
    expect(result.base_imponible).toBe(10);
    expect(result.iva).toBe(2);
    expect(result.total).toBe(12);
  });

  it("total = exento + base + iva (consistencia)", () => {
    const items = [
      { subtotal_usd: 100, subtotal_bs: 3650, tipo_iva: "GRAVADO" as const },
      { subtotal_usd: 50, subtotal_bs: 1825, tipo_iva: "EXENTO" as const },
      { subtotal_usd: 25, subtotal_bs: 912.5, tipo_iva: "GRAVADO" as const },
    ];
    const result = calcularResumenFiscal(items, "BS", true);
    const expectedTotal = result.exento + result.base_imponible + result.iva;
    expect(result.total).toBe(Math.round(expectedTotal * 100) / 100);
  });

  it("BS usa subtotal_bs, USD usa subtotal_usd", () => {
    const item = { subtotal_usd: 10, subtotal_bs: 3650, tipo_iva: "GRAVADO" as const };
    const bsResult = calcularResumenFiscal([item], "BS", true);
    const usdResult = calcularResumenFiscal([item], "USD", true);
    // BS: base = 3650, iva = 584
    expect(bsResult.base_imponible).toBe(3650);
    expect(bsResult.iva).toBe(584);
    // USD: exento = 10 (no IVA en USD)
    expect(usdResult.exento).toBe(10);
    expect(usdResult.iva).toBe(0);
  });
});
