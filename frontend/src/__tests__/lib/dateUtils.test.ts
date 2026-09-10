import { describe, it, expect } from "vitest";
import { formatPeriodRange } from "../../utils/dateUtils";

// ── Agrupación DIARIA ─────────────────────────────────────────────────────────

describe("formatPeriodRange - diario", () => {
  it("formatea una fecha simple en DD/MM/YYYY", () => {
    expect(formatPeriodRange("2025-01-15", "diario")).toBe("15/01/2025");
  });

  it("rellena con cero dígitos de día y mes menores a 10", () => {
    expect(formatPeriodRange("2025-03-05", "diario")).toBe("05/03/2025");
  });

  it("formatea el primer día del año", () => {
    expect(formatPeriodRange("2025-01-01", "diario")).toBe("01/01/2025");
  });

  it("formatea el último día del año", () => {
    expect(formatPeriodRange("2025-12-31", "diario")).toBe("31/12/2025");
  });
});

// ── Agrupación SEMANAL ────────────────────────────────────────────────────────

describe("formatPeriodRange - semanal", () => {
  it("semana dentro del mismo mes: muestra DD/MM - DD/MM", () => {
    // Lunes 06/01, domingo 12/01 → mismo mes
    const result = formatPeriodRange("2025-01-06", "semanal");
    expect(result).toBe("06/01 - 12/01");
  });

  it("semana que cruza de mes: muestra DD/MM - DD/MM/YYYY (formato largo al final)", () => {
    // Lunes 27/01, domingo 02/02 → meses distintos
    const result = formatPeriodRange("2025-01-27", "semanal");
    expect(result).toBe("27/01 - 02/02/2025");
  });

  it("semana que cruza fin de año", () => {
    // Lunes 29/12/2025, domingo 04/01/2026
    const result = formatPeriodRange("2025-12-29", "semanal");
    expect(result).toBe("29/12 - 04/01/2026");
  });

  it("semana completa en febrero (sin cruce de mes)", () => {
    // Lunes 03/02, domingo 09/02
    const result = formatPeriodRange("2025-02-03", "semanal");
    expect(result).toBe("03/02 - 09/02");
  });
});

// ── Agrupación QUINCENAL ──────────────────────────────────────────────────────

describe("formatPeriodRange - quincenal", () => {
  it("día 1 → 1ra quincena", () => {
    const result = formatPeriodRange("2025-03-01", "quincenal");
    expect(result).toContain("1ra quincena");
    expect(result).toContain("2025");
  });

  it("día 16 → 2da quincena", () => {
    const result = formatPeriodRange("2025-03-16", "quincenal");
    expect(result).toContain("2da quincena");
    expect(result).toContain("2025");
  });

  it("el nombre del mes está en español", () => {
    const result = formatPeriodRange("2025-06-01", "quincenal");
    // junio en es-VE
    expect(result.toLowerCase()).toContain("junio");
  });

  it("diciembre 2da quincena contiene el año correcto", () => {
    const result = formatPeriodRange("2025-12-16", "quincenal");
    expect(result).toContain("2da quincena");
    expect(result).toContain("2025");
  });
});

// ── Agrupación MENSUAL ────────────────────────────────────────────────────────

describe("formatPeriodRange - mensual", () => {
  it("enero 2025 en español", () => {
    const result = formatPeriodRange("2025-01", "mensual");
    expect(result.toLowerCase()).toContain("enero");
    expect(result).toContain("2025");
  });

  it("diciembre 2024 en español", () => {
    const result = formatPeriodRange("2024-12", "mensual");
    expect(result.toLowerCase()).toContain("diciembre");
    expect(result).toContain("2024");
  });

  it("julio (mes central) en español", () => {
    const result = formatPeriodRange("2025-07", "mensual");
    expect(result.toLowerCase()).toContain("julio");
  });
});

// ── Agrupación TRIMESTRAL ─────────────────────────────────────────────────────

describe("formatPeriodRange - trimestral", () => {
  it("reemplaza Q→T en el período", () => {
    expect(formatPeriodRange("2025-Q1", "trimestral")).toBe("2025-T1");
  });

  it("Q4 → T4", () => {
    expect(formatPeriodRange("2024-Q4", "trimestral")).toBe("2024-T4");
  });

  it("período sin Q queda tal cual", () => {
    expect(formatPeriodRange("2025-3", "trimestral")).toBe("2025-3");
  });
});

// ── Agrupación SEMESTRAL ──────────────────────────────────────────────────────

describe("formatPeriodRange - semestral", () => {
  it("reemplaza H→S en el período", () => {
    expect(formatPeriodRange("2025-H1", "semestral")).toBe("2025-S1");
  });

  it("H2 → S2", () => {
    expect(formatPeriodRange("2025-H2", "semestral")).toBe("2025-S2");
  });

  it("período sin H queda tal cual", () => {
    expect(formatPeriodRange("2025-2", "semestral")).toBe("2025-2");
  });
});

// ── Casos de borde globales ───────────────────────────────────────────────────

describe("formatPeriodRange - casos de borde", () => {
  it("período vacío retorna '—' en cualquier agrupación", () => {
    expect(formatPeriodRange("", "diario")).toBe("—");
    expect(formatPeriodRange("", "semanal")).toBe("—");
    expect(formatPeriodRange("", "mensual")).toBe("—");
    expect(formatPeriodRange("", "trimestral")).toBe("—");
    expect(formatPeriodRange("", "semestral")).toBe("—");
    expect(formatPeriodRange("", "quincenal")).toBe("—");
  });
});
