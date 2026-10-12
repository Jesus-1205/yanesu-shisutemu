import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Package, Trophy, TrendingUp, AlertTriangle,
  BarChart2, Table as TableIcon, Download,
} from "lucide-react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { ProductMatrixItem } from "@/types/api";
import { formatCurrency, getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import { Skeleton } from "@/ui-components/Skeleton";
import Button from "@/ui-components/Button";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Pagination from "@/ui-components/Pagination";
import ProductsTop10Chart from "../components/ProductsTop10Chart";

const RentabilityScatterChart = lazy(() => import("../components/RentabilityScatterChart"));

type ViewMode = "chart" | "table";
type ChartMode = "matrix" | "top10";
type TableTab = "todos" | "mas_vendidos" | "mayor_margen" | "menor_margen" | "sin_rotacion";

const TABLE_TABS: { id: TableTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "mas_vendidos", label: "Más Vendidos" },
  { id: "mayor_margen", label: "Mayor Margen" },
  { id: "menor_margen", label: "Menor Margen" },
  { id: "sin_rotacion", label: "Sin Rotación" },
];

export default function ReportsProductsPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const tasaBCV = useExchangeRateStore((s) => s.tasa);
  const conversionRate = currency === "VES" && tasaBCV > 0 ? tasaBCV : 1;
  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const [matrixData, setMatrixData] = useState<ProductMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [chartMode, setChartMode] = useState<ChartMode>("matrix");
  const [tableTab, setTableTab] = useState<TableTab>("todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [tableTab, from, to]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getProductsMatrix({ fecha_desde: from, fecha_hasta: to, limit: 200 });
        if (!cancelled) setMatrixData(res || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar datos de productos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [from, to, retryCount]);

  // ────────────────────── KPIs ──────────────────────
  const kpis = useMemo(() => {
    const conVentas = matrixData.filter((p) => p.total_vendido > 0);
    const totalUnidades = conVentas.reduce((acc, p) => acc + p.total_vendido, 0);

    const lider = conVentas.length > 0
      ? conVentas.reduce((best, p) => (p.total_vendido > best.total_vendido ? p : best), conVentas[0])
      : null;

    const margenPromedio = conVentas.length > 0
      ? conVentas.reduce((acc, p) => acc + Number(p.margen_porcentaje), 0) / conVentas.length
      : 0;

    const sinRotacion = matrixData.filter((p) => p.total_vendido === 0).length;

    return { totalUnidades, lider, margenPromedio, sinRotacion };
  }, [matrixData]);

  // ────────────────────── Table data per tab ──────────────────────
  const filteredTableData = useMemo(() => {
    const sorted = [...matrixData].sort((a, b) => b.total_vendido - a.total_vendido);
    switch (tableTab) {
      case "mas_vendidos": return sorted.filter((p) => p.total_vendido > 0).slice(0, 50);
      case "mayor_margen": return [...matrixData].sort((a, b) => Number(b.margen_porcentaje) - Number(a.margen_porcentaje));
      case "menor_margen": return [...matrixData].sort((a, b) => Number(a.margen_porcentaje) - Number(b.margen_porcentaje));
      case "sin_rotacion": return matrixData.filter((p) => p.total_vendido === 0);
      default: return sorted;
    }
  }, [matrixData, tableTab]);

  const totalPages = Math.ceil(filteredTableData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTableData.slice(start, start + pageSize);
  }, [filteredTableData, page]);

  // ────────────────────── Currency helpers ──────────────────────
  const incomeForProduct = (p: ProductMatrixItem): number => {
    const raw = Number(p.precio_unidad_usd) * p.total_vendido;
    return Math.round(raw * conversionRate * 100) / 100;
  };

  const costForProduct = (p: ProductMatrixItem): number => {
    const raw = Number(p.precio_costo_usd) * p.total_vendido;
    return Math.round(raw * conversionRate * 100) / 100;
  };

  const marginForProduct = (p: ProductMatrixItem): number => {
    return Math.round((incomeForProduct(p) - costForProduct(p)) * 100) / 100;
  };

  // ────────────────────── Export ──────────────────────
  const handleExport = () => {
    const currKey = currency.toLowerCase();
    exportToExcel({
      data: filteredTableData.map((p) => ({
        producto: p.nombre,
        vendidos: p.total_vendido,
        [`ingresos_${currKey}`]: incomeForProduct(p),
        [`costos_${currKey}`]: costForProduct(p),
        [`margen_${currKey}`]: marginForProduct(p),
        rentabilidad_pct: Number(p.margen_porcentaje),
        stock: p.stock_unidades,
      })),
      columns: [
        { key: "producto", header: "Producto" },
        { key: "vendidos", header: "Vendidos" },
        { key: `ingresos_${currKey}`, header: `Ingresos (${currency})` },
        { key: `costos_${currKey}`, header: `Costos (${currency})` },
        { key: `margen_${currKey}`, header: `Margen (${currency})` },
        { key: "rentabilidad_pct", header: "Rentabilidad %" },
        { key: "stock", header: "Stock" },
      ],
      filename: `reporte_productos_${tableTab}_${currKey}`,
    });
  };

  // ────────────────────── Dynamic labels ──────────────────────
  const chartTitle = chartMode === "matrix"
    ? "Matriz de Rendimiento: Rotación vs. Margen %"
    : "Top 10 Productos Más Vendidos";

  const viewModeTitle = viewMode === "chart" ? chartTitle : "Tabla de Desglose de Productos";

  if (error) {
    return <ErrorBanner onRetry={() => setRetryCount((c) => c + 1)}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      {/* ── Micro-KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Unidades Vendidas */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Unidades Vendidas</span>
            <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
              <Package className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {kpis.totalUnidades.toLocaleString("es-VE")}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Total rotado en el período</p>
          </div>
        </div>

        {/* Producto Líder */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Producto Líder</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
              <Trophy className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : kpis.lider ? (
              <>
                <div className="truncate text-xl font-bold tracking-tight text-slate-900" title={kpis.lider.nombre}>
                  {kpis.lider.nombre}
                </div>
                <p className="mt-1 text-xs text-amber-600 font-medium">{kpis.lider.total_vendido} unidades vendidas</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Sin ventas en el período</p>
            )}
          </div>
        </div>

        {/* Margen Promedio */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Margen Promedio</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-emerald-600">
                  {kpis.margenPromedio.toFixed(1)}%
                </span>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Rentabilidad del catálogo</p>
          </div>
        </div>

        {/* Sin Rotación */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Sin Rotación</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-500">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {kpis.sinRotacion}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Productos sin mov. en el período</p>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Container ── */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs">
        {/* Controls Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{viewModeTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === "chart"
                ? chartMode === "matrix"
                  ? "Cada punto representa un producto; cuadrantes según rotación y margen"
                  : "Productos con mayor número de unidades despachadas en el período"
                : "Haz clic en las pestañas para filtrar el catálogo"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart mode toggle (only when chart view) */}
            {viewMode === "chart" && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMode("matrix")}
                  className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
                    chartMode === "matrix" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Matriz
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("top10")}
                  className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
                    chartMode === "top10" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Top 10
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === "chart" ? "bg-white text-brand-blue shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart2 className="size-3.5" />
                Gráfico
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === "table" ? "bg-white text-brand-blue shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="size-3.5" />
                Tabla
              </button>
            </div>

            {/* Export (only table mode) */}
            {viewMode === "table" && (
              <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
                <Download className="size-3.5 mr-1" />
                Exportar Excel
              </Button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            Cargando analíticas...
          </div>
        ) : matrixData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Package className="size-10 stroke-1 mb-2" />
            <p className="text-sm">No hay datos de productos para el rango seleccionado</p>
          </div>
        ) : viewMode === "chart" ? (
          <div className="min-h-80 w-full">
            {chartMode === "matrix" ? (
              <Suspense fallback={<div className="flex h-80 items-center justify-center"><span className="text-sm text-slate-400">Cargando gráfico...</span></div>}>
                <RentabilityScatterChart data={matrixData} />
              </Suspense>
            ) : (
              <ProductsTop10Chart
                data={matrixData}
                currency={currency}
                currSymbol={currSymbol}
                vesRate={tasaBCV > 0 ? tasaBCV : 1}
              />
            )}
          </div>
        ) : (
          /* ── TABLE MODE ── */
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-3">
              {TABLE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setTableTab(tab.id); setPage(1); }}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tableTab === tab.id
                      ? "bg-brand-blue text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                  {tab.id === "sin_rotacion" && kpis.sinRotacion > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tableTab === tab.id ? "bg-white/20" : "bg-purple-100 text-purple-700"}`}>
                      {kpis.sinRotacion}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-center">Vendidos</th>
                    <th className="px-4 py-3 text-right">Ingresos ({currency})</th>
                    <th className="px-4 py-3 text-right">Costos ({currency})</th>
                    <th className="px-4 py-3 text-right">Margen ({currency})</th>
                    <th className="px-4 py-3 text-right">Rentabilidad</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                        No hay productos en esta categoría para el período seleccionado
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((p) => {
                      const ingresos = incomeForProduct(p);
                      const costos = costForProduct(p);
                      const margen = marginForProduct(p);
                      const rentPct = (Number(p.margen_porcentaje) || 0).toFixed(1);
                      const stockBadge = p.stock_unidades === 0
                        ? "bg-red-50 text-red-600"
                        : p.stock_unidades <= 5
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-50 text-slate-600";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px]">
                            <span className="block truncate" title={p.nombre}>{p.nombre}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs">{p.total_vendido}</td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600">
                            {formatCurrency(ingresos, currSymbol)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatCurrency(costos, currSymbol)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                            {formatCurrency(margen, currSymbol)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              Number(rentPct) >= 30
                                ? "bg-emerald-50 text-emerald-700"
                                : Number(rentPct) >= 15
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-600"
                            }`}>
                              {rentPct}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stockBadge}`}>
                              {p.stock_unidades} u
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination + count */}
            {filteredTableData.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">
                  Mostrando{" "}
                  <span className="font-medium text-slate-700">
                    {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filteredTableData.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-slate-700">{filteredTableData.length}</span> productos
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
