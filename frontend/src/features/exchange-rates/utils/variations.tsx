import type { ReactNode } from "react";
import type { ExchangeRate } from "../types";

export interface HistoryRow extends ExchangeRate {
  previousUsd?: number;
  previousEur?: number;
}

export interface VariationResult {
  pct: number;
  diff: number;
  up: boolean;
}

export function calculateVariation(
  current?: string | number | null,
  previous?: string | number | null,
): VariationResult | null {
  if (current === null || current === undefined || current === "" || previous === null || previous === undefined || previous === "") {
    return null;
  }
  const currNum = Number(current);
  const prevNum = Number(previous);
  if (!Number.isFinite(currNum) || !Number.isFinite(prevNum) || prevNum === 0) {
    return null;
  }
  const diff = currNum - prevNum;
  const pct = (diff / prevNum) * 100;
  return {
    diff,
    pct,
    up: diff >= 0,
  };
}

export function enrichWithVariation(rates: ExchangeRate[]): HistoryRow[] {
  return rates.map((r, i) => ({
    ...r,
    previousUsd: i < rates.length - 1 ? Number(rates[i + 1].tasa_usd) : undefined,
    previousEur: i < rates.length - 1 ? Number(rates[i + 1].tasa_eur) : undefined,
  }));
}

export function variationBadge(current: number, previous: number | undefined): ReactNode {
  const result = calculateVariation(current, previous);
  if (!result) {
    return <span className="text-slate-300">—</span>;
  }
  const { diff, pct, up } = result;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
        up ? "text-success" : "text-danger"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}% ({up ? "+" : "-"}
      {Math.abs(diff).toFixed(2)} Bs)
    </span>
  );
}

export function variationValue(current: number, previous: number | undefined): number | null {
  const result = calculateVariation(current, previous);
  if (!result) return null;
  return Math.round(result.pct * 100) / 100;
}
