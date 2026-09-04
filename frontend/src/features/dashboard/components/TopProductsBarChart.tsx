import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { chartPalette } from "@/ui-components/charts/theme";
import type { ProductOut } from "@/types/api";

interface TopProductsBarChartProps {
  data: { producto: ProductOut; total_vendido: number }[];
}

export default function TopProductsBarChart({ data }: TopProductsBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-75 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de ventas</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.producto.nombre.length > 25
      ? d.producto.nombre.slice(0, 23) + "..."
      : d.producto.nombre,
    vendidos: d.total_vendido,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#64748B", fontSize: 12 }}
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
            fontSize: "0.875rem",
          }}
          itemStyle={{ color: "#0F172A" }}
          labelStyle={{ color: "#64748B", fontWeight: 500 }}
          formatter={(value) => [Number(value), "Unidades"]}
        />
        <Bar dataKey="vendidos" radius={[0, 6, 6, 0]} barSize={28}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
