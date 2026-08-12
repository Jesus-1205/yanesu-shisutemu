import { describe, expect, it } from "vitest";
import { calcIva, IVA_RATE } from "../../lib/iva";

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
