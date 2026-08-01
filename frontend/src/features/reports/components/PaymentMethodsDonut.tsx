import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { chartColors } from "@/ui-components/charts/theme";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { formatPaymentMethodName } from "@/lib/utils";

const METHOD_COLORS: Record<string, string> = {
  DIVISAS: chartColors.success,
  EFECTIVO: chartColors.brand,
  PUNTO_DE_VENTA: chartColors.accent,
  PAGO_MOVIL: chartColors.info,
  TRANSFERENCIA: chartColors.danger,
  ZELLE: "#8B5CF6",
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

interface ChartDatum {
  name: string;
  value: number;
  amount: string;
  percentage: string;
  color: string;
}

interface PaymentMethodsDonutProps {
  data: PaymentMethodSummaryItem[];
}

export default function PaymentMethodsDonut({ data }: PaymentMethodsDonutProps) {
  const withValue = data.filter((m) => (m.cantidad_pagos || 0) > 0);

  if (!withValue.length) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-sm text-slate-400">Sin pagos registrados en el período</p>
      </div>
    );
  }

  const sorted = [...withValue].sort(
    (a, b) => (Number(b.total_equivalente_usd) || 0) - (Number(a.total_equivalente_usd) || 0),
  );
  const total = sorted.reduce((sum, m) => sum + (Number(m.total_equivalente_usd) || 0), 0);

  const chartData: ChartDatum[] = sorted.map((m, index) => {
    const value = Number(m.total_equivalente_usd) || 0;
    return {
      name: formatPaymentMethodName(m.metodo_pago_nombre),
      value,
      amount: `$${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0.0",
      color:
        METHOD_COLORS[m.metodo_pago_nombre.toUpperCase()] ||
        DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
    };
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-main mb-4">
        Monto recibido por Método de Pago (equiv. USD)
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
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-2 text-sm">
                  <p className="font-medium text-text-main">{d.name}</p>
                  <p className="text-slate-500">{d.amount} · {d.percentage}%</p>
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
