import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  Download,
  BarChart2,
  Table as TableIcon,
} from "lucide-react";
import { api } from "@/services/api";
import type { SalesSummaryItem } from "@/types/api";
import { formatCurrency, formatPeriod } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import { Skeleton } from "@/ui-components/Skeleton";
import Button from "@/ui-components/Button";
import ErrorBanner from "@/ui-components/ErrorBanner";
import type { Column } from "@/ui-components/Table";

type Grouping = "diario" | "semanal" | "mensual";

export default function ReportsSalesPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const [grouping, setGrouping] = useState<Grouping>("diario");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [data, setData] = useState<SalesSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Series visibility toggles for chart
  const [visibleSeries, setVisibleSeries] = useState({
    ingresos: true,
    costos: true,
    margen: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSalesSummary({
        rango: grouping,
        fecha_desde: from,
        fecha_hasta: to,
      });
      setData(res || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar resumen de ventas");
    } finally {
      setLoading(false);
    }
  }, [grouping, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate KPIs
  const totals = useMemo(() => {
    let totalVentas = 0;
    let totalIngresosUSD = 0;
    let totalIngresosVES = 0;
    let totalCostosUSD = 0;

    data.forEach((item) => {
      totalVentas += Number(item.total_ventas || 0);
      totalIngresosUSD += Number(item.total_usd || 0);
      totalIngresosVES += Number(item.total_ves || 0);
      totalCostosUSD += Number(item.costo_usd || 0);
    });

    const isUsd = currency === "USD";
    const ingresos = isUsd ? totalIngresosUSD : totalIngresosVES;

    // Estimate costs in VES proportionally if needed
    const ratioVES = totalIngresosUSD > 0 ? totalIngresosVES / totalIngresosUSD : 0;
    const costos = isUsd ? totalCostosUSD : totalCostosUSD * ratioVES;
    const margen = ingresos - costos;
    const margenPct = ingresos > 0 ? (margen / ingresos) * 100 : 0;

    return {
      totalVentas,
      ingresos,
      costos,
      margen,
      margenPct,
    };
  }, [data, currency]);

  // Chart data formatted for active currency
  const chartData = useMemo(() => {
    const isUsd = currency === "USD";
    return data.map((item) => {
      const ingresos = isUsd ? Number(item.total_usd) : Number(item.total_ves);
      const ratio = Number(item.total_usd) > 0 ? Number(item.total_ves) / Number(item.total_usd) : 0;
      const costos = isUsd ? Number(item.costo_usd) : Number(item.costo_usd) * ratio;
      const margen = ingresos - costos;

      return {
        periodoRaw: item.periodo,
        periodoFormatted: formatPeriod(item.periodo),
        ventas: Number(item.total_ventas),
        ingresos: Math.round(ingresos * 100) / 100,
        costos: Math.round(costos * 100) / 100,
        margen: Math.round(margen * 100) / 100,
      };
    });
  }, [data, currency]);

  const handleLegendClick = (dataKey: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey as keyof typeof prev],
    }));
  };

  const currSymbol = currency === "USD" ? "$" : "Bs ";

  // Excel export
  const handleExport = () => {
    const columns: Column<(typeof chartData)[0]>[] = [
      { key: "periodoFormatted", header: "Período" },
      { key: "ventas", header: "N° de Ventas" },
      {
        key: "ingresos",
        header: `Ingresos (${currency})`,
        exportValue: (r) => r.ingresos,
      },
      {
        key: "costos",
        header: `Costos (${currency})`,
        exportValue: (r) => r.costos,
      },
      {
        key: "margen",
        header: `Margen (${currency})`,
        exportValue: (r) => r.margen,
      },
    ];

    exportToExcel({
      data: chartData,
      columns,
      filename: `reporte_ventas_${grouping}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={fetchData}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      {/* ── Micro-KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Ingresos */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ingresos Brutos</span>
            <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(totals.ingresos, currSymbol)}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Total facturado en el período</p>
          </div>
        </div>

        {/* Costo de Mercancía */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Costo Mercancía</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Package className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(totals.costos, currSymbol)}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Costo total de productos vendidos</p>
          </div>
        </div>

        {/* Margen de Ganancia */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Margen de Ganancia</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-emerald-600">
                  {formatCurrency(totals.margen, currSymbol)}
                </span>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                  {totals.margenPct.toFixed(1)}%
                </span>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Ganancia neta libre calculada</p>
          </div>
        </div>

        {/* Total Transacciones */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">N° de Ventas</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <ShoppingCart className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {totals.totalVentas.toLocaleString()}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Transacciones completadas</p>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Container ── */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs">
        {/* Controls Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {viewMode === "chart" ? "Evolución de Ventas vs. Costos" : "Tabla de Desglose de Ventas"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en la leyenda para ocultar/mostrar métricas en la gráfica
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Grouping Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              {(["diario", "semanal", "mensual"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrouping(g)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                    grouping === g
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === "chart"
                    ? "bg-white text-brand-blue shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart2 className="size-3.5" />
                Gráfico
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-brand-blue shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="size-3.5" />
                Tabla
              </button>
            </div>

            {/* Export Button if table mode */}
            {viewMode === "table" && (
              <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
                <Download className="size-3.5 mr-1" />
                Exportar Excel
              </Button>
            )}
          </div>
        </div>

        {/* ── Content: Chart or Table ── */}
        {loading ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            Cargando analíticas...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <BarChart2 className="size-10 stroke-1 mb-2" />
            <p className="text-sm">No hay registros de ventas para el rango seleccionado</p>
          </div>
        ) : viewMode === "chart" ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1.5">
                        <p className="font-semibold text-slate-800 border-b border-slate-100 pb-1">
                          {label}
                        </p>
                        {payload.map((entry) => (
                          <div
                            key={entry.name}
                            className="flex items-center justify-between gap-4"
                          >
                            <span className="flex items-center gap-1.5 text-slate-600">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.name}:
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatCurrency(entry.value as number, currSymbol)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3 text-center">N° de Ventas</th>
                  <th className="px-4 py-3 text-right">Ingresos ({currency})</th>
                  <th className="px-4 py-3 text-right">Costos ({currency})</th>
                  <th className="px-4 py-3 text-right">Margen ({currency})</th>
                  <th className="px-4 py-3 text-right">Rentabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map((row) => {
                  const pct = row.ingresos > 0 ? ((row.margen / row.ingresos) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={row.periodoRaw} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.periodoFormatted}</td>
                      <td className="px-4 py-3 text-center font-mono text-xs">{row.ventas}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">
                        {formatCurrency(row.ingresos, currSymbol)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(row.costos, currSymbol)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {formatCurrency(row.margen, currSymbol)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
