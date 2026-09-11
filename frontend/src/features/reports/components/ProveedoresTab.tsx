import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { Building2, DollarSign, Package } from "lucide-react";
import type { SupplierAnalyticsResponse, SupplierAnalyticsOut } from "@/types/api";
import { useSortableData } from "@/hooks/useSortableData";
import StatCard from "@/ui-components/StatCard";
import Table from "@/ui-components/Table";
import Select from "@/ui-components/Select";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency } from "@/lib/utils";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";

const SupplierComparisonBar = lazy(() => import("./SupplierComparisonBar"));

const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ProveedoresTabProps {
  data: SupplierAnalyticsResponse | null;
}

export default function ProveedoresTab({ data }: ProveedoresTabProps) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [showInactives, setShowInactives] = useState(false);
  const [limitTopSales, setLimitTopSales] = useState(5);
  const [limitLowSales, setLimitLowSales] = useState(5);
  const [limitTopMargin, setLimitTopMargin] = useState(5);
  const [limitLowMargin, setLimitLowMargin] = useState(5);
  const [limitDetalle, setLimitDetalle] = useState(10);

  if (!data) return <p className="py-10 text-center text-sm text-slate-400">Sin datos de proveedores</p>;

  const isActive = useCallback(
    (s: SupplierAnalyticsOut) => s.total_productos > 0 || s.stock_total > 0 || s.ingresos_usd > 0,
    [],
  );

  const activeSuppliers = useMemo(() => data.proveedores.filter(isActive), [data, isActive]);
  const visibleSuppliers = useMemo(
    () => (showInactives ? data.proveedores : activeSuppliers),
    [showInactives, data, activeSuppliers],
  );

  const withSales = useMemo(
    () =>
      [...visibleSuppliers]
        .filter((s) => s.unidades_vendidas > 0)
        .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas),
    [visibleSuppliers],
  );
  const sortedBySales = useMemo(() => withSales.slice(0, limitTopSales), [withSales, limitTopSales]);
  const lowSales = useMemo(() => [...withSales].reverse().slice(0, limitLowSales), [withSales, limitLowSales]);
  const lowSalesAll = useMemo(() => [...withSales].reverse(), [withSales]);

  const sortedByMargin = useMemo(
    () => [...visibleSuppliers].sort((a, b) => b.margen_promedio - a.margen_promedio),
    [visibleSuppliers],
  );
  const topByMargin = useMemo(() => sortedByMargin.slice(0, limitTopMargin), [sortedByMargin, limitTopMargin]);
  const lowestByMargin = useMemo(() => sortedByMargin.slice(-limitLowMargin).reverse(), [sortedByMargin, limitLowMargin]);
  const lowestByMarginAll = useMemo(() => [...sortedByMargin].reverse(), [sortedByMargin]);

  const visibleDetalle = useMemo(() => visibleSuppliers.slice(0, limitDetalle), [visibleSuppliers, limitDetalle]);
  const { sorted: sortedDetalle, sortConfig: sortDetalle, requestSort: reqSortDetalle } =
    useSortableData(visibleDetalle as (SupplierAnalyticsOut & Record<string, unknown>)[], "ingresos_usd", "desc");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Proveedores" value={String(data.total_proveedores)} icon={<Building2 className="size-5" />} />
        <StatCard label="Productos" value={String(data.total_productos)} icon={<Package className="size-5" />} />
        <StatCard label="Stock Total" value={String(data.stock_total)} />
        <StatCard label="Uds. Vendidas" value={String(data.unidades_vendidas)} />
        <StatCard label="Ingresos USD" value={formatCurrency(data.ingresos_usd)} icon={<DollarSign className="size-5" />} variant="success" />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
          <input
            type="checkbox"
            checked={showInactives}
            onChange={(e) => setShowInactives(e.target.checked)}
            autoComplete="off"
            className="text-brand focus:ring-brand rounded border-slate-300"
          />
          Mostrar inactivos
        </label>
        <span className="text-xs text-slate-400">
          ({data.proveedores.length - activeSuppliers.length} inactivos)
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        <Suspense fallback={<ChartSkeleton />}>
          <SupplierComparisonBar data={visibleSuppliers} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Top Ventas</h2>
          {sortedBySales.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitTopSales)} onChange={(e) => setLimitTopSales(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Proveedor", render: (s: SupplierAnalyticsOut) => toTitleCase(s.nombre) },
                { key: "unidades_vendidas", header: "Ventas", render: (s: SupplierAnalyticsOut) => String(s.unidades_vendidas), exportValue: (s: SupplierAnalyticsOut) => s.unidades_vendidas },
              ]}
              data={sortedBySales}
              keyExtractor={(s) => s.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Proveedores_top_ventas"
              onExported={notifyExport}
              allData={withSales as (SupplierAnalyticsOut & Record<string, unknown>)[]}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Bajas Ventas</h2>
          {lowSales.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitLowSales)} onChange={(e) => setLimitLowSales(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Proveedor", render: (s: SupplierAnalyticsOut) => toTitleCase(s.nombre) },
                { key: "unidades_vendidas", header: "Ventas", render: (s: SupplierAnalyticsOut) => String(s.unidades_vendidas), exportValue: (s: SupplierAnalyticsOut) => s.unidades_vendidas },
              ]}
              data={lowSales}
              keyExtractor={(s) => s.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Proveedores_bajas_ventas"
              onExported={notifyExport}
              allData={lowSalesAll as (SupplierAnalyticsOut & Record<string, unknown>)[]}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Mayor Margen Prom.</h2>
          {topByMargin.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitTopMargin)} onChange={(e) => setLimitTopMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Proveedor", render: (s: SupplierAnalyticsOut) => toTitleCase(s.nombre) },
                { key: "margen_promedio", header: "Margen Prom.", render: (s: SupplierAnalyticsOut) => `${Number(s.margen_promedio).toFixed(1)}%`, exportValue: (s: SupplierAnalyticsOut) => Number(s.margen_promedio) },
              ]}
              data={topByMargin}
              keyExtractor={(s) => s.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Proveedores_mayor_margen"
              onExported={notifyExport}
              allData={sortedByMargin as (SupplierAnalyticsOut & Record<string, unknown>)[]}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Menor Margen Prom.</h2>
          {lowestByMargin.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitLowMargin)} onChange={(e) => setLimitLowMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Proveedor", render: (s: SupplierAnalyticsOut) => toTitleCase(s.nombre) },
                { key: "margen_promedio", header: "Margen Prom.", render: (s: SupplierAnalyticsOut) => `${Number(s.margen_promedio).toFixed(1)}%`, exportValue: (s: SupplierAnalyticsOut) => Number(s.margen_promedio) },
              ]}
              data={lowestByMargin}
              keyExtractor={(s) => s.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Proveedores_menor_margen"
              onExported={notifyExport}
              allData={lowestByMarginAll as (SupplierAnalyticsOut & Record<string, unknown>)[]}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-text-main">Detalle por Proveedor</h2>
        <Table
          headerLeft={<Select value={String(limitDetalle)} onChange={(e) => setLimitDetalle(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
          columns={[
            { key: "nombre", header: "Proveedor", sortable: true, onSort: () => reqSortDetalle("nombre"), sortDirection: sortDetalle?.key === "nombre" ? sortDetalle.direction : null, render: (s: SupplierAnalyticsOut) => toTitleCase(s.nombre) },
            { key: "total_productos", header: "Productos", sortable: true, onSort: () => reqSortDetalle("total_productos"), sortDirection: sortDetalle?.key === "total_productos" ? sortDetalle.direction : null, render: (s: SupplierAnalyticsOut) => String(s.total_productos), exportValue: (s: SupplierAnalyticsOut) => s.total_productos },
            { key: "stock_total", header: "Stock", sortable: true, onSort: () => reqSortDetalle("stock_total"), sortDirection: sortDetalle?.key === "stock_total" ? sortDetalle.direction : null, render: (s: SupplierAnalyticsOut) => String(s.stock_total), exportValue: (s: SupplierAnalyticsOut) => s.stock_total },
            { key: "margen_promedio", header: "Margen Prom.", sortable: true, onSort: () => reqSortDetalle("margen_promedio"), sortDirection: sortDetalle?.key === "margen_promedio" ? sortDetalle.direction : null, render: (s: SupplierAnalyticsOut) => `${Number(s.margen_promedio).toFixed(1)}%`, exportValue: (s: SupplierAnalyticsOut) => Number(s.margen_promedio) },
            { key: "unidades_vendidas", header: "Vendidos", sortable: true, onSort: () => reqSortDetalle("unidades_vendidas"), sortDirection: sortDetalle?.key === "unidades_vendidas" ? sortDetalle.direction : null, render: (s: SupplierAnalyticsOut) => String(s.unidades_vendidas), exportValue: (s: SupplierAnalyticsOut) => s.unidades_vendidas },
            { key: "ingresos_usd", header: "Ingresos", sortable: true, onSort: () => reqSortDetalle("ingresos_usd"), sortDirection: sortDetalle?.key === "ingresos_usd" ? sortDetalle.direction : null, render: (s: SupplierAnalyticsOut) => formatCurrency(s.ingresos_usd), exportValue: (s: SupplierAnalyticsOut) => Number(s.ingresos_usd) },
          ]}
          data={sortedDetalle}
          keyExtractor={(s) => s.id}
          emptyMessage="Sin proveedores"
          exportable
          exportFilename="Proveedores_detalle"
          onExported={notifyExport}
          allData={visibleSuppliers as (SupplierAnalyticsOut & Record<string, unknown>)[]}
        />
      </div>
    </div>
  );
}
