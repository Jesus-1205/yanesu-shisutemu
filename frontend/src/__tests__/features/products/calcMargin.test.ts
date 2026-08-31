import { describe, expect, it } from "vitest";
import { calcMargin } from "@/features/products/types";

/**
 * Tests de calcMargin: cálculo de margen de ganancia.
 *
 * Fórmula: ((precio - costo) / precio) * 100
 * Clasificación: >=30% success, >=10% warning, <10% danger
 */

describe("calcMargin", () => {
  it("high margin (>=30%): success color", () => {
    const result = calcMargin(50, 100);
    expect(result.margen).toBe(50);
    expect(result.color).toBe("success");
    expect(result.label).toBe("50.0%");
  });

  it("medium margin (>=10%): warning color", () => {
    const result = calcMargin(80, 100);
    expect(result.margen).toBe(20);
    expect(result.color).toBe("warning");
    expect(result.label).toBe("20.0%");
  });

  it("low margin (<10%): danger color", () => {
    const result = calcMargin(95, 100);
    expect(result.margen).toBe(5);
    expect(result.color).toBe("danger");
    expect(result.label).toBe("5.0%");
  });

  it("zero margin (costo === precio): danger", () => {
    const result = calcMargin(100, 100);
    expect(result.margen).toBe(0);
    expect(result.color).toBe("danger");
    expect(result.label).toBe("0.0%");
  });

  it("precio=0: neutral fallback", () => {
    const result = calcMargin(50, 0);
    expect(result.margen).toBe(0);
    expect(result.label).toBe("—");
    expect(result.color).toBe("neutral");
  });

  it("negative margin (costo > precio): danger", () => {
    const result = calcMargin(120, 100);
    expect(result.margen).toBe(-20);
    expect(result.color).toBe("danger");
    expect(result.label).toBe("-20.0%");
  });

  it("exact 30% boundary: success", () => {
    const result = calcMargin(70, 100);
    expect(result.margen).toBe(30);
    expect(result.color).toBe("success");
  });

  it("exact 10% boundary: warning", () => {
    const result = calcMargin(90, 100);
    expect(result.margen).toBe(10);
    expect(result.color).toBe("warning");
  });
});
