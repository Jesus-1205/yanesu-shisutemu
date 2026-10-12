import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from "recharts";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";

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

interface PaymentMethodsBarChartProps {
  data: PaymentMethodSummaryItem[];
  currency: "USD" | "VES";
  currSymbol: string;
  conversionRate: number;
}

export default function PaymentMethodsBarChart({
  data,
  currency,
  currSymbol,
  conversionRate,
}: PaymentMethodsBarChartProps) {
  const chartData = [...data]
    .filter((m) => (m.cantidad_pagos || 0) > 0)
    .sort((a, b) => (Number(b.total_equivalente_usd) || 0) - (Number(a.total_equivalente_usd) || 0))
    .map((m, index) => {
      const equiv = Number(m.total_equivalente_usd) || 0;
      const monto = currency === "USD" ? equiv : equiv * conversionRate;
      const formattedName = formatPaymentMethodName(m.metodo_pago_nombre);
      return {
        id: m.metodo_pago_id,
        nombre: formattedName.length > 20 ? formattedName.slice(0, 20) + "…" : formattedName,
        nombreCompleto: formattedName,
        monedaDefault: m.moneda_default,
        pagos: m.cantidad_pagos,
        monto: Math.round(monto * 100) / 100,
        montoUsd: Number(m.total_usd) || 0,
        montoVes: Number(m.total_ves) || 0,
        color: PALETTE[index % PALETTE.length],
      };
    });

  if (!chartData.length) {
    return (
      <div className="flex h-72 items-center justify-center">
        <p className="text-sm text-slate-400">Sin pagos registrados en el período</p>
      </div>
    );
  }

  const maxMonto = Math.max(...chartData.map((d) => d.monto), 1);

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-text-main">Comparativa de Recaudación</h2>
      <p className="mb-4 text-xs text-slate-500">
        Monto total equivalente recibido por cada método de pago ({currency})
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#E2E8F0" }}
            tickFormatter={(v) => `${currSymbol}${v.toLocaleString("es-VE")}`}
            domain={[0, maxMonto + Math.ceil(maxMonto * 0.15)]}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={130}
            tick={{ fill: "#334155", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <RechartsTooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof chartData)[0];
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg space-y-1.5">
                  <p className="font-semibold text-slate-900">{d.nombreCompleto}</p>
                  <div className="space-y-0.5 text-slate-600">
                    <p>
                      Monto equiv.:{" "}
                      <span className="font-semibold text-brand-blue">
                        {formatCurrency(d.monto, currSymbol)}
                      </span>
                    </p>
                    <p>
                      Transacciones: <span className="font-medium text-slate-800">{d.pagos}</span>
                    </p>
                    {d.montoUsd > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Cobrado en USD: {formatCurrency(d.montoUsd, "$")}
                      </p>
                    )}
                    {d.montoVes > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Cobrado en VES: {formatCurrency(d.montoVes, "Bs ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="monto" name="Monto" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {chartData.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
