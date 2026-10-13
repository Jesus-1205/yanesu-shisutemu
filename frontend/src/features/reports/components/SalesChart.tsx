import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SalesChartRow } from "../types";
import SalesChartTooltip, { type TooltipPayloadItem } from "./SalesChartTooltip";

export interface SalesChartProps {
  data: SalesChartRow[];
  currSymbol: string;
}

export default function SalesChart({ data, currSymbol }: SalesChartProps) {
  const [visibleSeries, setVisibleSeries] = useState({
    ingresos: true,
    costos: true,
    margen: true,
  });

  const handleLegendClick = (dataKey: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey as keyof typeof prev],
    }));
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="periodoFormatted"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) =>
              val >= 1000 ? `${currSymbol}${(val / 1000).toFixed(0)}k` : `${currSymbol}${val}`
            }
          />
          <Tooltip
            content={(props) => (
              <SalesChartTooltip
                active={props.active}
                payload={props.payload as unknown as TooltipPayloadItem[]}
                label={props.label}
                currSymbol={currSymbol}
              />
            )}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "12px", fontSize: "12px", cursor: "pointer", userSelect: "none" }}
            formatter={(value, entry) => {
              const dataKey = entry.dataKey as keyof typeof visibleSeries;
              const isVisible = visibleSeries[dataKey];
              return (
                <span
                  className={`transition-opacity ${
                    isVisible ? "text-slate-700 font-medium opacity-100" : "text-slate-400 opacity-40 line-through"
                  }`}
                >
                  {value}
                </span>
              );
            }}
            onClick={(e) => {
              if (e && e.dataKey) {
                handleLegendClick(e.dataKey as string);
              }
            }}
          />

          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill="#3b82f6"
            hide={!visibleSeries.ingresos}
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
          />
          <Bar
            dataKey="costos"
            name="Costos"
            fill="#64748b"
            hide={!visibleSeries.costos}
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
          />
          <Line
            type="monotone"
            dataKey="margen"
            name="Margen"
            stroke="#10b981"
            strokeWidth={2.5}
            hide={!visibleSeries.margen}
            dot={{ r: 3, fill: "#10b981" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
