import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { chartColors } from "@/ui-components/charts/theme";
import type { CategoryAnalyticsOut } from "@/types/api";

const CATEGORY_COLORS: Record<string, string> = {
  LICORES: chartColors.brand,
  VINOS: chartColors.accent,
  CERVEZAS: chartColors.success,
  REFRESCOS: chartColors.info,
  SNACKS: chartColors.danger,
  CIGARRILLOS: chartColors.slate,
  ESPECIAS: "#8B5CF6",
  LACTEOS: "#F59E0B",
  EMBUTIDOS: "#10B981",
  PANADERIA: "#EC4899",
};

const DEFAULT_PALETTE = [
  chartColors.brand,
  chartColors.accent,
  chartColors.success,
  chartColors.info,
  chartColors.danger,
  chartColors.slate,
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#EC4899",
];

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ChartDatum {
  name: string;
  value: number;
  percentage: string;
  color: string;
}

interface CategorySalesDonutProps {
  data: CategoryAnalyticsOut[];
}

export default function CategorySalesDonut({ data }: CategorySalesDonutProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-sm text-slate-400">Sin datos de categorías</p>
      </div>
    );
  }

  const sorted = [...data]
    .filter((c) => Number(c.ingresos_usd) > 0)
    .sort((a, b) => Number(b.ingresos_usd) - Number(a.ingresos_usd));

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-sm text-slate-400">Sin ingresos registrados</p>
      </div>
    );
  }

  const totalIngresos = Math.round(sorted.reduce((sum, c) => sum + Number(c.ingresos_usd), 0) * 100) / 100;

  const chartData: ChartDatum[] = sorted.map((cat, index) => ({
    name: toTitleCase(cat.nombre),
    value: Number(cat.ingresos_usd),
    percentage: totalIngresos > 0
      ? ((Number(cat.ingresos_usd) / totalIngresos) * 100).toFixed(1)
      : "0.0",
    color:
      CATEGORY_COLORS[cat.nombre.toUpperCase()] ||
      DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
  }));

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-main mb-4">Cuota de Ventas por Categoría</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "0.875rem",
            }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChartDatum;
              return (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-2 text-sm">
                  <p className="font-medium text-text-main">
                    {d.name}
                  </p>
                  <p className="text-slate-500">
                    ${d.value.toLocaleString("es-VE")} · {d.percentage}%
                  </p>
                </div>
              );
            }}
          />
          <Legend
            content={() => (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {chartData.map((entry) => (
                  <li key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name} ({entry.percentage}%)
                  </li>
                ))}
              </ul>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
