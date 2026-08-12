import { describe, expect, it } from "vitest";
import { isDecimalKey, normalizeDecimals } from "../../lib/normalizeDecimals";

describe("isDecimalKey", () => {
  it("matches money suffixes", () => {
    expect(isDecimalKey("total_usd")).toBe(true);
    expect(isDecimalKey("total_ves")).toBe(true);
    expect(isDecimalKey("total_bs")).toBe(true);
    expect(isDecimalKey("base_imponible_usd")).toBe(true);
  });

  it("matches exact decimal keys", () => {
    expect(isDecimalKey("tasa_bcv_aplicada")).toBe(true);
    expect(isDecimalKey("tasa_usd")).toBe(true);
    expect(isDecimalKey("margen_porcentaje")).toBe(true);
    expect(isDecimalKey("iva_porcentaje")).toBe(true);
    expect(isDecimalKey("precio_divisas_unidad")).toBe(true);
    expect(isDecimalKey("precio_divisas_caja")).toBe(true);
  });

  it("does not match non-decimal keys", () => {
    expect(isDecimalKey("codigo_barra")).toBe(false);
    expect(isDecimalKey("nombre")).toBe(false);
    expect(isDecimalKey("total_vendido")).toBe(false);
    expect(isDecimalKey("cantidad")).toBe(false);
    expect(isDecimalKey("id")).toBe(false);
  });
});

describe("normalizeDecimals", () => {
  it("converts _usd/_ves/_bs string fields to numbers", () => {
    const out = normalizeDecimals({
      precio_unitario_usd: "10.50",
      total_bs: "45.00",
      total_ves: "1250.00",
    });
    expect(out).toEqual({
      precio_unitario_usd: 10.5,
      total_bs: 45,
      total_ves: 1250,
    });
  });

  it("converts exact decimal keys (tasa, margen, iva, divisas)", () => {
    const out = normalizeDecimals({
      tasa_bcv_aplicada: "50.0000",
      iva_porcentaje: "16.00",
      margen_promedio: "12.5",
      precio_divisas_unidad: "22.10",
    });
    expect(out).toEqual({
      tasa_bcv_aplicada: 50,
      iva_porcentaje: 16,
      margen_promedio: 12.5,
      precio_divisas_unidad: 22.1,
    });
  });

  it("recurses into nested objects and arrays", () => {
    const out = normalizeDecimals({
      items: [
        { precio_unitario_usd: "3.25", cantidad: 2 },
        { precio_unitario_usd: "1.75" },
      ],
      total: { total_usd: "5.00" },
    });
    expect(out).toEqual({
      items: [
        { precio_unitario_usd: 3.25, cantidad: 2 },
        { precio_unitario_usd: 1.75 },
      ],
      total: { total_usd: 5 },
    });
  });

  it("does not touch non-decimal string fields", () => {
    const out = normalizeDecimals({
      codigo_barra: "123456",
      nombre: "Whisky",
      observaciones: "pago en efectivo",
      total_vendido: 5,
    });
    expect(out).toEqual({
      codigo_barra: "123456",
      nombre: "Whisky",
      observaciones: "pago en efectivo",
      total_vendido: 5,
    });
  });

  it("keeps unparseable or empty strings untouched", () => {
    const out = normalizeDecimals({ monto_iva_usd: "abc", total_usd: "" });
    expect(out).toEqual({ monto_iva_usd: "abc", total_usd: "" });
  });

  it("keeps numbers as numbers", () => {
    const out = normalizeDecimals({ total_usd: 5.5, tasa_bs: 45 });
    expect(out).toEqual({ total_usd: 5.5, tasa_bs: 45 });
  });

  it("handles null and arrays of objects", () => {
    const out = normalizeDecimals({ precio_divisas_caja: null });
    expect(out).toEqual({ precio_divisas_caja: null });
  });
});
