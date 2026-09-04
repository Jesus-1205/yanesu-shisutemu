import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

interface VentasVsCostosChartProps {
  data: SalesSummaryItem[];
}

export default function VentasVsCostosChart({ data }: VentasVsCostosChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-75 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de ventas</p>
      </div>
    );
  }

  const chartData = data.map((s) => ({
    periodo: s.periodo,
    ventas: Number(s.total_usd),
    costos: Number(s.costo_usd),
    margen: Number(s.margen_usd),
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            dataKey="periodo"
            tickFormatter={formatPeriod}
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v)}
            width={65}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "0.875rem",
            }}
            formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
            labelFormatter={(label) => formatPeriod(String(label))}
          />
          <Legend />
          <Bar dataKey="ventas" fill={chartColors.brand} radius={[4, 4, 0, 0]} barSize={20} name="Ventas" />
          <Bar dataKey="costos" fill={chartColors.accent} radius={[4, 4, 0, 0]} barSize={20} name="Costos" />
          <Line type="monotone" dataKey="margen" stroke={chartColors.success} strokeWidth={2} dot={{ r: 3 }} name="Margen" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
