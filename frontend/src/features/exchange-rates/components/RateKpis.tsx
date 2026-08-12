import { useMemo } from "react";
import { TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import StatCard from "@/ui-components/StatCard";
import { formatRateFull } from "@/lib/utils";
import type { RateInterval, RateTrendPoint } from "../types";

interface RateKpisProps {
  data: RateTrendPoint[];
  intervalo: RateInterval;
  loading: boolean;
}

interface KpiSummary {
  usdVar: number | null;
  eurVar: number | null;
  usdMax: number;
  usdMin: number;
}

function computeKpis(data: RateTrendPoint[]): KpiSummary | null {
  if (!data.length) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const pct = (a: number, b: number): number | null =>
    a > 0 && b > 0 ? ((b - a) / a) * 100 : null;
  const usdMax = Math.max(...data.map((d) => d.usd));
  const usdMin = Math.min(...data.map((d) => d.usd));
  return {
    usdVar: pct(first.usd, last.usd),
    eurVar: pct(first.eur, last.eur),
    usdMax,
    usdMin,
  };
}

export default function RateKpis({ data, intervalo, loading }: RateKpisProps) {
  const kpis = useMemo(() => computeKpis(data), [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        Sin suficientes registros para calcular indicadores del período {intervalo}.
      </p>
    );
  }

  const trendFor = (value: number | null) =>
    value === null
      ? undefined
      : {
          direction: (value >= 0 ? "up" : "down") as "up" | "down",
          value: `${value > 0 ? "+" : ""}${value.toFixed(2)}%`,
        };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={`Variación USD (${intervalo})`}
        value={kpis.usdVar !== null ? `${kpis.usdVar > 0 ? "+" : ""}${kpis.usdVar.toFixed(2)}%` : "—"}
        icon={<TrendingUp className="w-5 h-5" />}
        trend={trendFor(kpis.usdVar)}
      />
      <StatCard
        label={`Variación EUR (${intervalo})`}
        value={kpis.eurVar !== null ? `${kpis.eurVar > 0 ? "+" : ""}${kpis.eurVar.toFixed(2)}%` : "—"}
        icon={<TrendingDown className="w-5 h-5" />}
        trend={trendFor(kpis.eurVar)}
      />
      <StatCard
        label={`Máximo USD (${intervalo})`}
        value={`Bs ${formatRateFull(kpis.usdMax)}`}
        icon={<ArrowUpCircle className="w-5 h-5" />}
        variant="success"
      />
      <StatCard
        label={`Mínimo USD (${intervalo})`}
        value={`Bs ${formatRateFull(kpis.usdMin)}`}
        icon={<ArrowDownCircle className="w-5 h-5" />}
        variant="danger"
      />
    </div>
  );
}
