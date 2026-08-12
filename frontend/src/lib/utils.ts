import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const rateFmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const rateFullFmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function formatCurrency(n: number | string | null | undefined, symbol = "$"): string {
  const num = typeof n === "string" ? Number(n) : n ?? 0;
  return `${symbol}${currencyFmt.format(num)}`;
}

export function formatRate(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? Number(n) : n ?? 0;
  return rateFmt.format(num);
}

export function formatRateFull(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? Number(n) : n ?? 0;
  return rateFullFmt.format(num);
}

const CARACAS_OFFSET = "-04:00";

const veDateTimeFmt = new Intl.DateTimeFormat("es-VE", {
  timeZone: "America/Caracas",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const veDateFmt = new Intl.DateTimeFormat("es-VE", {
  timeZone: "America/Caracas",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toCaracasDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const hasOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  const normalized = hasOffset ? iso : `${iso}${CARACAS_OFFSET}`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/** Interpreta un timestamp (naive en hora de Caracas) como Date absoluto. */
export function parseVETime(iso: string | null | undefined): Date | null {
  return toCaracasDate(iso);
}

/** Formatea un timestamp (naive en hora de Caracas) como fecha+hora es-VE en America/Caracas. */
export function formatDateTimeVE(iso: string | null | undefined): string {
  const d = toCaracasDate(iso);
  return d ? veDateTimeFmt.format(d) : "—";
}

/** Formatea un timestamp (naive en hora de Caracas) solo como fecha es-VE en America/Caracas. */
export function formatDateVE(iso: string | null | undefined): string {
  const d = toCaracasDate(iso);
  return d ? veDateFmt.format(d) : "—";
}

const caracasDayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Caracas",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Verifica si un timestamp (naive en hora de Caracas) corresponde al día actual en Caracas. */
export function isTodayInCaracas(iso: string | null | undefined): boolean {
  const d = toCaracasDate(iso);
  if (!d) return false;
  return caracasDayKey.format(d) === caracasDayKey.format(new Date());
}

export function formatPaymentMethodName(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
