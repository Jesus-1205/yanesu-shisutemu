import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cn,
  formatCurrency,
  formatRate,
  formatPaymentMethodName,
  formatDateTimeVE,
  formatDateVE,
  parseVETime,
  isTodayInCaracas,
  getTodayInCaracas,
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

describe("parseVETime", () => {
  it("interpreta un timestamp naive como hora de Caracas (UTC-4)", () => {
    const d = parseVETime("2026-08-11T23:44:17");
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe("2026-08-12T03:44:17.000Z");
  });

  it("respeta offsets explícitos", () => {
    const d = parseVETime("2026-08-12T03:44:17Z");
    expect(d!.toISOString()).toBe("2026-08-12T03:44:17.000Z");
  });

  it("devuelve null para valores inválidos", () => {
    expect(parseVETime(null)).toBeNull();
    expect(parseVETime("no-una-fecha")).toBeNull();
  });
});

describe("formatDateTimeVE", () => {
  it("formatea en es-VE con la fecha del timestamp naive", () => {
    const result = formatDateTimeVE("2026-08-11T23:44:17");
    expect(result).toContain("2026");
    expect(result).toContain("ago");
  });

  it("devuelve guion para valores vacíos", () => {
    expect(formatDateTimeVE(null)).toBe("—");
    expect(formatDateTimeVE(undefined)).toBe("—");
  });
});

describe("formatDateVE", () => {
  it("formatea solo la fecha en es-VE", () => {
    const result = formatDateVE("2026-08-11T23:44:17");
    expect(result).toContain("2026");
    expect(result).toContain("ago");
  });

  it("devuelve guion para valores vacíos", () => {
    expect(formatDateVE("")).toBe("—");
  });
});

describe("isTodayInCaracas", () => {
  it("detecta un timestamp del día actual en Caracas", () => {
    const nowKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    expect(isTodayInCaracas(`${nowKey}T10:00:00`)).toBe(true);
  });

  it("rechaza timestamps de otro día", () => {
    expect(isTodayInCaracas("2000-01-01T10:00:00")).toBe(false);
  });

  it("rechaza valores vacíos", () => {
    expect(isTodayInCaracas(null)).toBe(false);
    expect(isTodayInCaracas(undefined)).toBe(false);
  });
});

describe("getTodayInCaracas", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a string in YYYY-MM-DD format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00Z"));

    const result = getTodayInCaracas();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns the correct date for a normal daytime UTC hour", () => {
    // 2026-08-22T12:00:00Z → Caracas (UTC-4) = 2026-08-22T08:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00Z"));

    expect(getTodayInCaracas()).toBe("2026-08-22");
  });

  it("returns the previous day when UTC is before 04:00 (Caracas still previous day)", () => {
    // 2026-08-22T02:00:00Z → Caracas (UTC-4) = 2026-08-21T22:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T02:00:00Z"));

    expect(getTodayInCaracas()).toBe("2026-08-21");
  });

  it("returns the new day exactly at Caracas midnight (04:00 UTC)", () => {
    // 2026-08-22T04:00:00Z → Caracas (UTC-4) = 2026-08-22T00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T04:00:00Z"));

    expect(getTodayInCaracas()).toBe("2026-08-22");
  });

  it("returns the previous day one second before Caracas midnight", () => {
    // 2026-08-22T03:59:59Z → Caracas (UTC-4) = 2026-08-21T23:59:59
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T03:59:59Z"));

    expect(getTodayInCaracas()).toBe("2026-08-21");
  });

  it("returns the new day one second after Caracas midnight", () => {
    // 2026-08-22T04:00:01Z → Caracas (UTC-4) = 2026-08-22T00:00:01
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T04:00:01Z"));

    expect(getTodayInCaracas()).toBe("2026-08-22");
  });

  it("handles end-of-day in Caracas (23:59 UTC-4)", () => {
    // 2026-12-31T23:59:00-04:00 → 2027-01-01T03:59:00Z, Caracas still 2026-12-31
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T03:59:00Z"));

    expect(getTodayInCaracas()).toBe("2026-12-31");
  });

  it("handles year boundary crossing into new year in Caracas", () => {
    // 2027-01-01T04:00:00Z → Caracas (UTC-4) = 2027-01-01T00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T04:00:00Z"));

    expect(getTodayInCaracas()).toBe("2027-01-01");
  });
});