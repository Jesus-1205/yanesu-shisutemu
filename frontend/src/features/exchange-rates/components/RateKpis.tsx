import { useMemo } from "react";
import { TrendingUp, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import StatCard from "@/ui-components/StatCard";
import { formatRateFull } from "@/lib/utils";
import type { RateInterval, RateTrendPoint } from "../types";

interface RateKpisProps {
  data: RateTrendPoint[];
  intervalo: RateInterval;
  loading: boolean;
}

interface KpiSummary {
  usdDiff: number | null;
  usdPct: number | null;
  usdMax: number;
  usdMin: number;
}

function computeKpis(data: RateTrendPoint[]): KpiSummary | null {
  if (!data.length) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const diff = first.usd > 0 && last.usd > 0 ? last.usd - first.usd : null;
  const pct =
    first.usd > 0 && last.usd > 0 ? ((last.usd - first.usd) / first.usd) * 100 : null;
  const usdMax = Math.max(...data.map((d) => d.usd));
  const usdMin = Math.min(...data.map((d) => d.usd));
  return {
    usdDiff: diff,
    usdPct: pct,
    usdMax,
    usdMin,
  };
}

export default function RateKpis({ data, intervalo, loading }: RateKpisProps) {
  const kpis = useMemo(() => computeKpis(data), [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <p className="py-4 text-center text-sm text-slate-400">
        Sin suficientes registros para calcular indicadores del período {intervalo}.
      </p>
    );
  }

  const trendFor = (diff: number | null, pct: number | null) =>
    diff === null || pct === null
      ? undefined
      : {
          direction: (diff >= 0 ? "up" : "down") as "up" | "down",
          value: `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`,
        };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label={`Variación USD (${intervalo})`}
        value={
          kpis.usdDiff !== null
            ? `${kpis.usdDiff > 0 ? "+" : ""}${kpis.usdDiff.toFixed(2)} Bs`
            : "—"
        }
        icon={<TrendingUp className="size-5" />}
        trend={trendFor(kpis.usdDiff, kpis.usdPct)}
      />
      <StatCard
        label={`Máximo USD (${intervalo})`}
        value={`Bs ${formatRateFull(kpis.usdMax)}`}
        icon={<ArrowUpCircle className="size-5" />}
        variant="success"
      />
      <StatCard
        label={`Mínimo USD (${intervalo})`}
        value={`Bs ${formatRateFull(kpis.usdMin)}`}
        icon={<ArrowDownCircle className="size-5" />}
        variant="danger"
      />
    </div>
  );
}
