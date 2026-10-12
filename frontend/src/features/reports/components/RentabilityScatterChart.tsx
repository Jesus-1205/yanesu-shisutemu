import { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import { HelpCircle, X } from "lucide-react";
import Tooltip from "@/ui-components/Tooltip";
import type { ProductMatrixItem } from "@/types/api";

const UMBRAL_MARGEN = 30;
const UMBRAL_ROTACION = 15;

// Clamp margen a [-20, 100] para evitar ejes distorsionados por anomalías
function sanitizeMargen(raw: number | string): number {
  const n = Number(raw);
  if (isNaN(n)) return 0;
  return Math.min(100, Math.max(-20, n));
}

interface LegendItemProps {
  color: string;
  label: string;
  tooltip: string;
}

function LegendItem({
  color,
  label,
  tooltip,
  isSelected,
  onToggle,
}: LegendItemProps & { isSelected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors border select-none ${
        isSelected
          ? "border-slate-300 bg-slate-100 text-slate-900 font-semibold shadow-xs"
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
      aria-label={`Ver información de cuadrante ${label}`}
    >
      <span className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span>{label}</span>
      <Tooltip content={tooltip} side="top">
        <span className="p-0.5 text-slate-400 hover:text-slate-600">
          <HelpCircle className="size-3 flex-shrink-0" />
        </span>
      </Tooltip>
    </button>
  );
}

interface RentabilityScatterChartProps {
  data: ProductMatrixItem[];
}

export default function RentabilityScatterChart({ data }: RentabilityScatterChartProps) {
  const [selectedLegend, setSelectedLegend] = useState<LegendItemProps | null>(null);

  if (!data.length) {
    return (
      <div className="flex h-75 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de rentabilidad</p>
      </div>
    );
  }

  const chartData = data
    .filter((item) => Number(item.precio_costo_usd) > 0)
    .map((item) => ({
      nombre: item.nombre,
      vendidos: item.total_vendido,
      margen: sanitizeMargen(item.margen_porcentaje),
      stock: item.stock_unidades,
      margenRaw: Number(item.margen_porcentaje),
    }));

  if (!chartData.length) {
    return (
      <div className="flex h-75 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de rentabilidad</p>
      </div>
    );
  }

  const LEGEND_ITEMS: LegendItemProps[] = [
    {
      color: "#22c55e",
      label: "Estrella",
      tooltip: "Alta Rotación + Alto Margen. El tesoro del catálogo: genera volumen Y ganancia. Prioridad máxima de reposición.",
    },
    {
      color: "#3b82f6",
      label: "Nicho",
      tooltip: "Baja Rotación + Alto Margen. Se vende poco, pero cada unidad deja gran ganancia. Cuida el stock disponible.",
    },
    {
      color: "#f97316",
      label: "Caballo de Batalla",
      tooltip: "Alta Rotación + Bajo Margen. Mueve flujo de caja pero deja poco por unidad. Considera revisar precio o costo.",
    },
    {
      color: "#94a3b8",
      label: "Hueso",
      tooltip: "Baja Rotación + Bajo Margen. Inmoviliza capital sin generar ganancias. Evalúa liquidar o discontinuar.",
    },
  ];

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-text-main">
        Matriz de Rendimiento: Rotación vs. Margen %
      </h2>

      <div className="mb-2 flex flex-wrap gap-1.5 sm:gap-3">
        {LEGEND_ITEMS.map((item) => (
          <LegendItem
            key={item.label}
            {...item}
            isSelected={selectedLegend?.label === item.label}
            onToggle={() =>
              setSelectedLegend((prev) => (prev?.label === item.label ? null : item))
            }
          />
        ))}
      </div>

      {/* Tarjeta explicativa contextual al hacer clic o tap */}
      {selectedLegend && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs shadow-xs animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <span
              className="size-3 rounded-full mt-0.5 flex-shrink-0"
              style={{ backgroundColor: selectedLegend.color }}
            />
            <div>
              <p className="font-semibold text-slate-900">
                {selectedLegend.label}
              </p>
              <p className="mt-0.5 text-slate-600 leading-relaxed">
                {selectedLegend.tooltip}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedLegend(null)}
            aria-label="Cerrar explicación"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer flex-shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            type="number"
            dataKey="vendidos"
            name="Vendidos"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            domain={[0, "dataMax + 5"]}
            label={{ value: "Unidades Vendidas (Volumen)", position: "bottom", offset: -5, fontSize: 11, fill: "#64748B" }}
          />
          <YAxis
            type="number"
            dataKey="margen"
            name="Margen %"
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            domain={[-20, 100]}
            tickFormatter={(v) => `${v}%`}
            width={50}
            label={{ value: "Margen %", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#64748B" }}
          />
          <ReferenceLine x={UMBRAL_ROTACION} stroke="#94a3b8" strokeDasharray="3 3" />
          <ReferenceLine y={UMBRAL_MARGEN} stroke="#94a3b8" strokeDasharray="3 3" />

          <text x="15%" y="10%" textAnchor="middle" fill="#94a3b8" opacity={0.35} fontSize={10} fontWeight={500}>Nicho</text>
          <text x="85%" y="10%" textAnchor="middle" fill="#94a3b8" opacity={0.35} fontSize={10} fontWeight={500}>Estrellas</text>
          <text x="15%" y="85%" textAnchor="middle" fill="#94a3b8" opacity={0.35} fontSize={10} fontWeight={500}>Huesos</text>
          <text x="75%" y="85%" textAnchor="middle" fill="#94a3b8" opacity={0.35} fontSize={10} fontWeight={500}>Caballos de Batalla</text>

          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { nombre: string; margen: number; vendidos: number; stock: number; margenRaw: number };
              const estrella = d.margenRaw >= UMBRAL_MARGEN && d.vendidos >= UMBRAL_ROTACION;
              const nicho = d.margenRaw >= UMBRAL_MARGEN && d.vendidos < UMBRAL_ROTACION;
              const caballo = d.margenRaw < UMBRAL_MARGEN && d.vendidos >= UMBRAL_ROTACION;

              let badge: { label: string; cls: string };
              if (estrella) badge = { label: "Producto Estrella", cls: "bg-green-100 text-green-700" };
              else if (nicho) badge = { label: "Producto de Nicho", cls: "bg-blue-100 text-blue-700" };
              else if (caballo) badge = { label: "Caballo de Batalla", cls: "bg-orange-100 text-orange-700" };
              else badge = { label: "Producto Hueso", cls: "bg-slate-100 text-slate-600" };

              return (
                <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
                  <p className="font-semibold text-slate-800">{d.nombre}</p>
                  <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <p className="text-slate-600">Vendidos: <span className="font-medium text-slate-900">{d.vendidos} unidades</span></p>
                  <p className="text-slate-600">Margen: <span className="font-medium text-emerald-600">{d.margenRaw.toFixed(1)}%</span></p>
                  <p className="text-slate-600">Stock Actual: <span className="font-medium text-slate-900">{d.stock} unidades</span></p>
                </div>
              );
            }}
          />

          <Scatter data={chartData} r={6}>
            {chartData.map((entry, index) => {
              const estrella = entry.margenRaw >= UMBRAL_MARGEN && entry.vendidos >= UMBRAL_ROTACION;
              const nicho = entry.margenRaw >= UMBRAL_MARGEN && entry.vendidos < UMBRAL_ROTACION;
              const caballo = entry.margenRaw < UMBRAL_MARGEN && entry.vendidos >= UMBRAL_ROTACION;
              const color = estrella ? "#22c55e" : nicho ? "#3b82f6" : caballo ? "#f97316" : "#94a3b8";
              return <Cell key={index} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={1} />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
