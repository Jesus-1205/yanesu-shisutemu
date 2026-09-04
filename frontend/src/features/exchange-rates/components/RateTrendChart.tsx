import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { chartColors, axisStyle, tooltipStyle } from "@/ui-components/charts/theme";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";
import { parseVETime } from "@/lib/utils";
import type { RateInterval, RateTrendPoint } from "../types";
import { RATE_INTERVALS } from "../types";

interface RateTrendChartProps {
  data: RateTrendPoint[];
  interval: RateInterval;
  onIntervalChange: (iv: RateInterval) => void;
  loading: boolean;
}

const shortFmt = new Intl.DateTimeFormat("es-VE", {
  timeZone: "America/Caracas",
  day: "2-digit",
  month: "short",
});

const longFmt = new Intl.DateTimeFormat("es-VE", {
  timeZone: "America/Caracas",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTick(iso: string): string {
  const d = parseVETime(iso);
  return d ? shortFmt.format(d) : iso;
}

function formatLabel(iso: string): string {
  const d = parseVETime(iso);
  return d ? longFmt.format(d) : iso;
}

export default function RateTrendChart({
  data,
  interval,
  onIntervalChange,
  loading,
}: RateTrendChartProps) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Evolución de tasas</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Tasas de cambio registradas en los últimos {interval}.
          </p>
        </div>
        <div
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
          role="tablist"
          aria-label="Intervalo del gráfico"
        >
          {RATE_INTERVALS.map((iv) => (
            <button
              key={iv}
              role="tab"
              aria-selected={interval === iv}
              onClick={() => onIntervalChange(iv)}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                interval === iv
                  ? "bg-brand-blue text-white shadow-sm"
                  : "text-slate-500 hover:bg-surface hover:text-brand-blue"
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <div className="flex h-75 items-center justify-center">
          <p className="text-sm text-slate-400">Sin registros de tasas en este período</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradUsd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.brand} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartColors.brand} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEur" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.accent} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartColors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="fecha"
              tickFormatter={formatTick}
              tick={axisStyle.tick}
              axisLine={axisStyle.axisLine}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => v.toFixed(2)}
              tick={axisStyle.tick}
              axisLine={axisStyle.axisLine}
              tickLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={tooltipStyle.contentStyle}
              itemStyle={tooltipStyle.itemStyle}
              labelStyle={tooltipStyle.labelStyle}
              labelFormatter={(label) => formatLabel(String(label))}
              formatter={(value, name) => [`Bs ${Number(value).toFixed(4)}`, String(name)]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="usd"
              name="USD / VES"
              stroke={chartColors.brand}
              strokeWidth={2.5}
              fill="url(#gradUsd)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="eur"
              name="EUR / VES"
              stroke={chartColors.accent}
              strokeWidth={2.5}
              fill="url(#gradEur)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
