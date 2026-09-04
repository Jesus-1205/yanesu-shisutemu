import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartColors } from "@/ui-components/charts/theme";
import type { SalesSummaryItem } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatPeriod(periodo: string): string {
  if (periodo.length === 7) {
    const [y, m] = periodo.split("-").map(Number);
    return `${MONTHS_ES[m - 1]} ${y}`;
  }
  const parts = periodo.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return periodo;
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

interface SalesTrendChartProps {
  data: SalesSummaryItem[];
}

export default function SalesTrendChart({ data }: SalesTrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-75 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de ventas</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="gradientBrand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.brand} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="periodo"
          tickFormatter={formatPeriod}
          tick={{ fill: "#64748B", fontSize: 11 }}
          axisLine={{ stroke: "#E2E8F0" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#64748B", fontSize: 12 }}
          axisLine={{ stroke: "#E2E8F0" }}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={75}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: "0.875rem",
          }}
          itemStyle={{ color: "#0F172A" }}
          labelStyle={{ color: "#64748B", fontWeight: 500 }}
          labelFormatter={(label) => formatPeriod(String(label))}
          formatter={(value) => [formatCurrency(Number(value)), "USD"]}
        />
        <Area
          type="monotone"
          dataKey="total_usd"
          stroke={chartColors.brand}
          strokeWidth={2.5}
          fill="url(#gradientBrand)"
          dot={{ r: 3, fill: chartColors.brand, strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: chartColors.brand, strokeWidth: 2, fill: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
