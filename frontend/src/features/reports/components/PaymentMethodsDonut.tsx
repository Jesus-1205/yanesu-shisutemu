import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { formatPaymentMethodName } from "@/lib/utils";

const PALETTE = [
  "#1E40AF",
  "#EA580C",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#CA8A04",
  "#DB2777",
  "#64748B",
  "#059669",
];

interface ChartDatum {
  name: string;
  value: number;
  amount: string;
  percentage: string;
  color: string;
}

interface PaymentMethodsDonutProps {
  data: PaymentMethodSummaryItem[];
  currency?: "USD" | "VES";
  currSymbol?: string;
  conversionRate?: number;
}

export default function PaymentMethodsDonut({
  data,
  currency = "USD",
  currSymbol = "$",
  conversionRate = 1,
}: PaymentMethodsDonutProps) {
  const withValue = data.filter((m) => (m.cantidad_pagos || 0) > 0);

  if (!withValue.length) {
    return (
      <div className="flex h-80 items-center justify-center">
        <p className="text-sm text-slate-400">Sin pagos registrados en el período</p>
      </div>
    );
  }

  const sorted = [...withValue].sort(
    (a, b) => (Number(b.total_equivalente_usd) || 0) - (Number(a.total_equivalente_usd) || 0),
  );

  const rawChartData = sorted.map((m, index) => {
    const rawEquiv = Number(m.total_equivalente_usd) || 0;
    const value = currency === "USD" ? rawEquiv : Math.round(rawEquiv * conversionRate * 100) / 100;
    return {
      name: formatPaymentMethodName(m.metodo_pago_nombre),
      value,
      color: PALETTE[index % PALETTE.length],
    };
  });

  const total = Math.round(rawChartData.reduce((sum, d) => sum + d.value, 0) * 100) / 100;

  const chartData: ChartDatum[] = rawChartData.map((d) => ({
    ...d,
    amount: `${currSymbol}${d.value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    percentage: total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0",
  }));

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-main">
        Monto recibido por Método de Pago (equiv. {currency})
      </h2>
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
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-lg">
                  <p className="font-medium text-text-main">{d.name}</p>
                  <p className="text-slate-500">{d.amount} · {d.percentage}%</p>
                </div>
              );
            }}
          />
          <Legend
            content={() => (
              <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {chartData.map((entry) => (
                  <li key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
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
