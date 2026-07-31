import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartColors } from "@/ui-components/charts/theme";
import type { CategoryDetailProduct } from "@/types/api";

interface CategoryTopProductsChartProps {
  data: CategoryDetailProduct[];
}

export default function CategoryTopProductsChart({ data }: CategoryTopProductsChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <p className="text-sm text-slate-400">Sin productos con ventas</p>
      </div>
    );
  }

  const totalUnidades = data.reduce((acc, p) => acc + p.unidades_vendidas, 0);

  const chartData = data
    .filter((p) => p.unidades_vendidas > 0)
    .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      fullName: p.nombre,
      name: p.nombre.length > 20 ? p.nombre.slice(0, 18) + "..." : p.nombre,
      unidades: p.unidades_vendidas,
      porcentaje: totalUnidades > 0 ? ((p.unidades_vendidas / totalUnidades) * 100).toFixed(1) : "0.0",
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
      <h3 className="text-sm font-semibold text-text-main mb-2">Top Productos</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            width={150}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "11px",
              padding: "6px 8px",
            }}
            labelFormatter={(_label, payload) => {
              if (payload?.[0]) return payload[0].payload.fullName;
              return "";
            }}
            formatter={(value, _name, props) => [
              `${value} uds (${props.payload.porcentaje}%)`,
              "Unidades Vendidas",
            ]}
          />
          <Bar dataKey="unidades" fill={chartColors.brand} radius={[0, 4, 4, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
