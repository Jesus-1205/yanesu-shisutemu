import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from "recharts";
import type { ProductMatrixItem } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

interface ProductsTop10ChartProps {
  data: ProductMatrixItem[];
  currency: "USD" | "VES";
  currSymbol: string;
  vesRate: number;
}

export default function ProductsTop10Chart({ data, currency, currSymbol, vesRate }: ProductsTop10ChartProps) {
  const top10 = [...data]
    .filter((p) => p.total_vendido > 0)
    .sort((a, b) => b.total_vendido - a.total_vendido)
    .slice(0, 10)
    .map((p) => {
      const ingresos = currency === "USD"
        ? Number(p.precio_unidad_usd) * p.total_vendido
        : Number(p.precio_unidad_usd) * p.total_vendido * vesRate;
      return {
        nombre: p.nombre.length > 22 ? p.nombre.slice(0, 22) + "…" : p.nombre,
        nombreCompleto: p.nombre,
        vendidos: p.total_vendido,
        ingresos: Math.round(ingresos * 100) / 100,
      };
    });

  if (!top10.length) {
    return (
      <div className="flex h-72 items-center justify-center">
        <p className="text-sm text-slate-400">Sin ventas registradas para el período</p>
      </div>
    );
  }

  const maxVendidos = Math.max(...top10.map((d) => d.vendidos));

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-text-main">Top 10 Más Vendidos</h2>
      <p className="mb-4 text-xs text-slate-500">Productos con mayor volumen de unidades despachadas en el período</p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={top10}
          layout="vertical"
          margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#E2E8F0" }}
            tickFormatter={(v) => `${v} u`}
            domain={[0, maxVendidos + Math.ceil(maxVendidos * 0.15)]}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={140}
            tick={{ fill: "#334155", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <RechartsTooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { nombreCompleto: string; vendidos: number; ingresos: number };
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md space-y-1">
                  <p className="font-semibold text-slate-800">{d.nombreCompleto}</p>
                  <p className="text-slate-600">Unidades: <span className="font-medium text-slate-900">{d.vendidos} u</span></p>
                  <p className="text-slate-600">Ingresos est.: <span className="font-medium text-blue-600">{formatCurrency(d.ingresos, currSymbol)}</span></p>
                </div>
              );
            }}
          />
          <Bar dataKey="vendidos" name="Unidades" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {top10.map((_, i) => (
              <Cell
                key={i}
                fill={i === 0 ? "#3b82f6" : i === 1 ? "#60a5fa" : i === 2 ? "#93c5fd" : "#bfdbfe"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
