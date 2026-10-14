import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { chartColors } from "@/ui-components/charts/theme";
import type { CategoryReportItemOut } from "@/types/api";
import type { CategoryChartMode } from "../types";

export interface CategoriesChartSectionProps {
  chartMode: CategoryChartMode;
  data: CategoryReportItemOut[];
  currency: "USD" | "VES";
  currSymbol: string;
  conversionRate: number;
}

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

interface DonutDatum {
  name: string;
  value: number;
  amount: string;
  unidades: number;
  percentage: string;
  color: string;
}

export default function CategoriesChartSection({
  chartMode,
  data,
  currency,
  currSymbol,
  conversionRate,
}: CategoriesChartSectionProps) {
  const activeItems = data.filter(
    (c) => (Number(c.ingresos_usd) || 0) > 0 || (Number(c.unidades_vendidas) || 0) > 0,
  );

  if (!activeItems.length) {
    return (
      <div className="flex h-72 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de categorías en el período</p>
      </div>
    );
  }

  if (chartMode === "donut") {
    const sorted = [...activeItems].sort(
      (a, b) => (Number(b.ingresos_usd) || 0) - (Number(a.ingresos_usd) || 0),
    );

    const rawChartData = sorted.map((c, index) => {
      const rawIncome = Number(c.ingresos_usd) || 0;
      const value =
        currency === "USD"
          ? Math.round(rawIncome * 100) / 100
          : Math.round(rawIncome * conversionRate * 100) / 100;
      return {
        name: c.nombre,
        value,
        unidades: Number(c.unidades_vendidas) || 0,
        color: PALETTE[index % PALETTE.length],
      };
    });

    const total = Math.round(rawChartData.reduce((sum, d) => sum + d.value, 0) * 100) / 100;

    const donutData: DonutDatum[] = rawChartData.map((d) => ({
      ...d,
      amount: formatCurrency(d.value, currSymbol),
      percentage: total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0",
    }));

    return (
      <div>
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Distribución de Ingresos por Categoría ({currency})
        </h2>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
            >
              {donutData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DonutDatum;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs shadow-lg space-y-0.5">
                    <p className="font-semibold text-slate-900">{d.name}</p>
                    <p className="text-slate-600">
                      Ingresos: <span className="font-medium text-brand-blue">{d.amount}</span> ({d.percentage}%)
                    </p>
                    <p className="text-slate-500">Unidades vendidas: {d.unidades}</p>
                  </div>
                );
              }}
            />
            <Legend
              content={() => (
                <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                  {donutData.map((entry) => (
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

  // Bar Chart mode ("bars")
  const barChartData = [...activeItems]
    .sort((a, b) => (Number(b.ingresos_usd) || 0) - (Number(a.ingresos_usd) || 0))
    .map((c) => {
      const rawIncome = Number(c.ingresos_usd) || 0;
      const rawCost = Number(c.costos_usd) || 0;
      const ingresos =
        currency === "USD"
          ? Math.round(rawIncome * 100) / 100
          : Math.round(rawIncome * conversionRate * 100) / 100;
      const costos =
        currency === "USD"
          ? Math.round(rawCost * 100) / 100
          : Math.round(rawCost * conversionRate * 100) / 100;
      const margen = Math.round((ingresos - costos) * 100) / 100;

      return {
        id: c.id,
        nombre: c.nombre.length > 20 ? `${c.nombre.slice(0, 20)}…` : c.nombre,
        nombreCompleto: c.nombre,
        ingresos,
        costos,
        margen,
        unidades: Number(c.unidades_vendidas) || 0,
        rentabilidadPct: Number(c.margen_porcentaje) || 0,
      };
    });

  const maxVal = Math.max(...barChartData.map((d) => Math.max(d.ingresos, d.costos)), 1);
  const chartHeight = Math.max(320, barChartData.length * 48);

  return (
    <div>
      <h2 className="mb-1 text-base font-semibold text-slate-800">
        Comparativa de Ingresos y Costos por Categoría ({currency})
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Comparación directa de facturación bruta y costo de mercancía
      </p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={barChartData}
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
            domain={[0, maxVal + Math.ceil(maxVal * 0.15)]}
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
              const d = payload[0].payload as (typeof barChartData)[0];
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg space-y-1.5">
                  <p className="font-semibold text-slate-900">{d.nombreCompleto}</p>
                  <div className="space-y-0.5 text-slate-600">
                    <p>
                      Ingresos:{" "}
                      <span className="font-semibold text-brand-blue">
                        {formatCurrency(d.ingresos, currSymbol)}
                      </span>
                    </p>
                    <p>
                      Costos:{" "}
                      <span className="font-semibold text-amber-600">
                        {formatCurrency(d.costos, currSymbol)}
                      </span>
                    </p>
                    <p>
                      Margen:{" "}
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(d.margen, currSymbol)}
                      </span>
                    </p>
                    <p>
                      Rentabilidad:{" "}
                      <span className="font-medium text-slate-800">
                        {d.rentabilidadPct.toFixed(1)}%
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Unidades vendidas: {d.unidades}
                    </p>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
          />
          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill={chartColors.brand}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="costos"
            name="Costos"
            fill={chartColors.accent}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
