import { Suspense, lazy, useMemo, useState } from "react";
import { BarChart3, DollarSign, TrendingUp } from "lucide-react";
import { useCallback } from "react";
import { api } from "@/services/api";
import type { ProductOut } from "@/types/api";
import type { SalesSummaryItem } from "@/features/sales/types";
import { formatPeriodRange } from "@/utils/dateUtils";
import StatCard from "@/ui-components/StatCard";
import Table from "@/ui-components/Table";
import Select from "@/ui-components/Select";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency } from "@/lib/utils";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";
import SortableSalesTable from "./SortableSalesTable";

const VentasVsCostosChart = lazy(() => import("./VentasVsCostosChart"));

const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

const RANGO_OPTIONS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
];

interface ResumenTabProps {
  salesSummary: SalesSummaryItem[];
  topWeek: { periodo: string; total_ventas: number; total_usd: number; total_ves: number } | null;
  topSelling: { producto: ProductOut; total_vendido: number }[];
  categoriesTotal: number;
  categoriesCount: number;
  rango: string;
  onRangoChange: (r: string) => void;
}

export default function ResumenTab({
  salesSummary,
  topWeek,
  topSelling,
  categoriesTotal,
  categoriesCount,
  rango,
  onRangoChange,
}: ResumenTabProps) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [limitTopSelling, setLimitTopSelling] = useState(5);
  const visibleTopSelling = useMemo(() => topSelling.slice(0, limitTopSelling), [topSelling, limitTopSelling]);

  const periodLabel: Record<string, string> = {
    semanal: "Mejor Semana",
    quincenal: "Mejor Quincena",
    mensual: "Mejor Mes",
  };
  const bestPeriodLabel = periodLabel[rango] ?? "Mejor Período";

  const getTrend = useCallback(() => {
    if (!salesSummary || salesSummary.length < 2) return undefined;
    const anterior = salesSummary[salesSummary.length - 2]?.total_usd || 0;
    const actual = salesSummary[salesSummary.length - 1]?.total_usd || 0;
    if (anterior === 0) return undefined;
    const delta = ((actual - anterior) / anterior) * 100;
    return {
      direction: delta >= 0 ? ("up" as const) : ("down" as const),
      value: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs período anterior`,
    };
  }, [salesSummary]);

  return (
    <div className="space-y-6">
      {topWeek && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total USD" value={formatCurrency(categoriesTotal)} icon={<DollarSign className="size-5" />} variant="info" trend={getTrend()} />
          <StatCard label="Períodos" value={String(categoriesCount)} icon={<BarChart3 className="size-5" />} />
          <StatCard label={bestPeriodLabel} value={`${formatPeriodRange(topWeek.periodo, rango as "semanal")} · ${formatCurrency(topWeek.total_usd)}`} icon={<TrendingUp className="size-5" />} variant="success" />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">Ventas vs. Costos vs. Margen</h2>
          <Select
            value={rango}
            onChange={(e) => onRangoChange(e.target.value)}
            options={RANGO_OPTIONS}
            label="Periodo"
          />
        </div>
        <Suspense fallback={<ChartSkeleton />}>
          <VentasVsCostosChart data={salesSummary} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-4 text-lg font-semibold text-text-main">Resumen de Ventas</h2>
          {salesSummary.length > 0 ? (
            <SortableSalesTable data={salesSummary} rango={rango} />
          ) : (
            <p className="text-sm text-slate-400">Sin datos de ventas</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Top Vendidos</h2>
          {topSelling.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitTopSelling)} onChange={(e) => setLimitTopSelling(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Producto", render: (r: { producto: ProductOut }) => <span className="block max-w-[150px] truncate" title={r.producto.nombre}>{r.producto.nombre}</span> },
                { key: "total", header: "Vendidos", render: (r: { total_vendido: number }) => String(r.total_vendido), exportValue: (r: { total_vendido: number }) => r.total_vendido },
                { key: "ingresos", header: "Ingresos ($)", render: (r: { producto: ProductOut; total_vendido: number }) => formatCurrency(Math.round((r.total_vendido * r.producto.precio_unidad_usd) * 100) / 100), exportValue: (r: { producto: ProductOut; total_vendido: number }) => Math.round((r.total_vendido * r.producto.precio_unidad_usd) * 100) / 100 },
              ]}
              data={visibleTopSelling}
              keyExtractor={(_, i) => i}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Top_vendidos"
              onExported={notifyExport}
              allData={topSelling}
              fetchAllData={() => api.getTopSellingProducts(9999)}
            />
          ) : (
            <p className="text-sm text-slate-400">Sin datos de ventas</p>
          )}
        </div>
      </div>
    </div>
  );
}
