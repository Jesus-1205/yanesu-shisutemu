import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { chartColors } from "@/ui-components/charts/theme";
import type { ProductMatrixItem } from "@/types/api";

const UMBRAL_MARGEN = 30;
const UMBRAL_ROTACION = 15;

interface RentabilityScatterChartProps {
  data: ProductMatrixItem[];
}

export default function RentabilityScatterChart({ data }: RentabilityScatterChartProps) {
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
      margen: Number(item.margen_porcentaje),
      stock: item.stock_unidades,
    }));

  if (!chartData.length) {
    return (
      <div className="flex h-75 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos de rentabilidad</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-text-main">Matriz de Rendimiento: Rotación vs. Margen %</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="size-2.5 rounded-full bg-green-500" />
          Estrella (Alta Rotación / Alto Margen)
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="size-2.5 rounded-full bg-blue-500" />
          Nicho (Baja Rotación / Alto Margen)
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="size-2.5 rounded-full bg-orange-500" />
          Caballo de Batalla (Alta Rotación / Bajo Margen)
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="size-2.5 rounded-full bg-slate-400" />
          Producto Hueso (Baja Rotación / Bajo Margen)
        </span>
      </div>

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
            domain={[0, 100]}
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

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const estrella = d.margen >= UMBRAL_MARGEN && d.vendidos >= UMBRAL_ROTACION;
              const nicho = d.margen >= UMBRAL_MARGEN && d.vendidos < UMBRAL_ROTACION;
              const caballo = d.margen < UMBRAL_MARGEN && d.vendidos >= UMBRAL_ROTACION;

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
                  <p className="text-slate-600">Margen: <span className="font-medium text-emerald-600">{d.margen}%</span></p>
                  <p className="text-slate-600">Stock Actual: <span className="font-medium text-slate-900">{d.stock} unidades</span></p>
                </div>
              );
            }}
          />
          <Scatter data={chartData} dataKey="margen">
            {chartData.map((d, index) => {
              const estrella = d.margen >= UMBRAL_MARGEN && d.vendidos >= UMBRAL_ROTACION;
              const nicho = d.margen >= UMBRAL_MARGEN && d.vendidos < UMBRAL_ROTACION;
              const caballo = d.margen < UMBRAL_MARGEN && d.vendidos >= UMBRAL_ROTACION;
              let fill = chartColors.slate;
              if (estrella) fill = "#22c55e";
              else if (nicho) fill = "#3b82f6";
              else if (caballo) fill = "#f97316";
              return <Cell key={index} fill={fill} />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}