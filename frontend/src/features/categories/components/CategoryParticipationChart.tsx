import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { chartPalette } from "@/ui-components/charts/theme";
import type { CategoryAnalyticsOut } from "@/types/api";

interface CategoryParticipationChartProps {
  data: CategoryAnalyticsOut[];
  selectedId?: number;
}

export default function CategoryParticipationChart({ data, selectedId }: CategoryParticipationChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <p className="text-sm text-slate-400">Sin datos de participación</p>
      </div>
    );
  }

  const chartData = data
    .filter((c) => Number(c.unidades_vendidas) > 0)
    .sort((a, b) => Number(b.unidades_vendidas) - Number(a.unidades_vendidas))
    .map((c) => ({
      id: c.id,
      name: c.nombre,
      value: Number(c.unidades_vendidas),
    }));

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <p className="text-sm text-slate-400">Sin ventas registradas</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-main mb-2">Participación por Unidades</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={entry.id}
                fill={chartPalette[index % chartPalette.length]}
                opacity={selectedId && entry.id !== selectedId ? 0.35 : 1}
              />
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
            formatter={(value) => [`${value} uds`, "Vendidos"]}
          />
          <Legend
            content={({ payload }) => (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {payload?.map((entry, i) => {
                  const item = chartData[i];
                  const isSelected = item && item.id === selectedId;
                  return (
                    <li key={i} className={`flex items-center gap-1.5 text-xs ${isSelected ? "font-bold text-text-main" : "text-slate-600"}`}>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: chartPalette[i % chartPalette.length] }}
                      />
                      {entry.value}
                    </li>
                  );
                })}
              </ul>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
