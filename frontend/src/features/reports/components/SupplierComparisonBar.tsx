import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartColors } from "@/ui-components/charts/theme";
import type { SupplierAnalyticsOut } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SupplierComparisonBarProps {
  data: SupplierAnalyticsOut[];
}

export default function SupplierComparisonBar({ data }: SupplierComparisonBarProps) {
  const [metric, setMetric] = useState<"ingresos" | "unidades">("ingresos");

  if (!data.length) {
    return (
      <div className="flex h-75 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de proveedores</p>
      </div>
    );
  }

  const chartData = data
    .map((s) => ({
      id: s.id,
      name: toTitleCase(s.nombre),
      ingresos: Number(s.ingresos_usd),
      unidades: Number(s.unidades_vendidas),
    }))
    .sort((a, b) => (metric === "ingresos" ? b.ingresos - a.ingresos : b.unidades - a.unidades))
    .slice(0, 5);

  const barKey = metric === "ingresos" ? "ingresos" : "unidades";
  const barColor = metric === "ingresos" ? chartColors.brand : chartColors.success;
  const barLabel = metric === "ingresos" ? "Ingresos" : "Unidades";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-main">Comparación de Proveedores</h2>
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setMetric("ingresos")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              metric === "ingresos"
                ? "bg-white font-semibold text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Ingresos ($)
          </button>
          <button
            onClick={() => setMetric("unidades")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              metric === "unidades"
                ? "bg-white font-semibold text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Unidades Vendidas
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            tickFormatter={(v) =>
              metric === "ingresos" ? formatCurrency(v) : `${v} uds`
            }
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
            formatter={(value, name) => {
              const label = String(name);
              if (label === "Ingresos") return [formatCurrency(Number(value)), "Ingresos"];
              if (label === "Unidades Vendidas") return [`${Number(value).toLocaleString("es-VE")}`, "Unidades"];
              return [String(value), label];
            }}
          />
          <Bar dataKey={barKey} fill={barColor} radius={[0, 4, 4, 0]} barSize={20} name={barLabel} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
