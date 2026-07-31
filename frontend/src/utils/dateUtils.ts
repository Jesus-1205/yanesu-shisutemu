type Grouping = "diario" | "semanal" | "quincenal" | "mensual" | "trimestral" | "semestral";

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function fmt(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatPeriodRange(periodo: string, grouping: Grouping): string {
  if (!periodo) return "—";

  if (grouping === "diario") {
    return fmt(parseDate(periodo));
  }

  if (grouping === "semanal") {
    const monday = parseDate(periodo);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    if (monday.getMonth() === sunday.getMonth()) {
      return `${fmtShort(monday)} - ${fmtShort(sunday)}`;
    }
    return `${fmtShort(monday)} - ${fmt(sunday)}`;
  }

  if (grouping === "quincenal") {
    const d = parseDate(periodo);
    const isSecond = d.getDate() === 16;
    const monthName = d.toLocaleDateString("es-VE", { month: "long" });
    const year = d.getFullYear();
    return isSecond ? `2da quincena ${monthName} ${year}` : `1ra quincena ${monthName} ${year}`;
  }

  if (grouping === "mensual") {
    const [y, m] = periodo.split("-").map(Number);
    const d = new Date(y, (m ?? 1) - 1);
    return d.toLocaleDateString("es-VE", { month: "long", year: "numeric" });
  }

  if (grouping === "trimestral") {
    return periodo.replace("Q", "T");
  }

  if (grouping === "semestral") {
    return periodo.replace("H", "S");
  }

  return periodo;
}
