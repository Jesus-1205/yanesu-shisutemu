import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { chartColors } from "@/ui-components/charts/theme";
import type { CategoryAnalyticsOut } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

interface CategorySalesChartProps {
  data: CategoryAnalyticsOut[];
  selectedId?: number;
}

export default function CategorySalesChart({ data, selectedId }: CategorySalesChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[250px] items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de ventas</p>
      </div>
    );
  }

  const chartData = data
    .filter((c) => Number(c.ingresos_usd) > 0)
    .sort((a, b) => Number(b.ingresos_usd) - Number(a.ingresos_usd))
    .map((c) => ({
      id: c.id,
      name: c.nombre.length > 18 ? c.nombre.slice(0, 16) + "..." : c.nombre,
      ingresos: Number(c.ingresos_usd),
    }));

  if (!chartData.length) {
    return (
      <div className="flex h-[250px] items-center justify-center">
        <p className="text-sm text-slate-400">Sin ventas registradas</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-main">Ingresos por Categoría</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "0.875rem",
            }}
            formatter={(value) => [formatCurrency(Number(value)), "Ingresos USD"]}
          />
          <Bar dataKey="ingresos" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.id === selectedId ? chartColors.brand : chartColors.slate}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
