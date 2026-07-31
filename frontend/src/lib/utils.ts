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

export function formatPaymentMethodName(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
