import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatRate,
  formatPaymentMethodName,
} from "../../lib/utils";

describe("cn", () => {
  it("merges class names with twMerge", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes via clsx", () => {
    const cond = true;
    expect(cn("base", cond && "extra")).toBe("base extra");
    expect(cn("base", !cond && "extra")).toBe("base");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("resolves Tailwind conflicts via twMerge", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("accepts arrays and objects", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});

describe("formatCurrency", () => {
  it("formats a number with default $ symbol", () => {
    const result = formatCurrency(1234.5);
    expect(result).toMatch(/^\$1\.234,50$/);
  });

  it("formats with custom symbol", () => {
    const result = formatCurrency(50, "Bs ");
    expect(result).toMatch(/^Bs 50,00$/);
  });

  it("accepts string input", () => {
    const result = formatCurrency("99.99");
    expect(result).toMatch(/^\$99,99$/);
  });

  it("handles null and undefined as 0", () => {
    expect(formatCurrency(null)).toMatch(/^\$0,00$/);
    expect(formatCurrency(undefined)).toMatch(/^\$0,00$/);
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(10.999)).toMatch(/,00$/);
  });
});

describe("formatRate", () => {
  it("formats with 2 decimal places", () => {
    const result = formatRate(45.6789);
    expect(result).toBe("45,68");
  });

  it("accepts string input", () => {
    expect(formatRate("12.3456")).toBe("12,35");
  });

  it("handles null and undefined as 0", () => {
    expect(formatRate(null)).toBe("0,00");
    expect(formatRate(undefined)).toBe("0,00");
  });

  it("pads with trailing zeros", () => {
    expect(formatRate(5)).toBe("5,00");
  });
});

describe("formatPaymentMethodName", () => {
  it("converts snake_case to Title Case", () => {
    expect(formatPaymentMethodName("PAGO_MOVIL")).toBe("Pago Movil");
  });

  it("handles single word", () => {
    expect(formatPaymentMethodName("EFECTIVO")).toBe("Efectivo");
  });

  it("handles already formatted names gracefully", () => {
    const result = formatPaymentMethodName("TRANSFERENCIA");
    expect(result).toBe("Transferencia");
  });
});