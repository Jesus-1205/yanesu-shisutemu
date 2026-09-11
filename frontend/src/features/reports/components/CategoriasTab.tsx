import { Suspense, lazy, useMemo, useState } from "react";
import { DollarSign, Package, ShoppingBag } from "lucide-react";
import { api } from "@/services/api";
import type { CategoryOut, CategoryAnalyticsResponse, CategoryAnalyticsOut } from "@/types/api";
import { useSortableData } from "@/hooks/useSortableData";
import StatCard from "@/ui-components/StatCard";
import Table from "@/ui-components/Table";
import Select from "@/ui-components/Select";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency } from "@/lib/utils";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";

const CategorySalesDonut = lazy(() => import("./CategorySalesDonut"));

const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CategoriasTabProps {
  data: CategoryAnalyticsResponse | null;
  topSelling: { categoria: CategoryOut; total_vendido: number }[];
  lowRotation: { categoria: CategoryOut; total_vendido: number }[];
}

export default function CategoriasTab({ data, topSelling, lowRotation }: CategoriasTabProps) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [limitTopSelling, setLimitTopSelling] = useState(5);
  const [limitLowRot, setLimitLowRot] = useState(5);
  const [limitTopMargin, setLimitTopMargin] = useState(5);
  const [limitLowMargin, setLimitLowMargin] = useState(5);
  const [limitDetalle, setLimitDetalle] = useState(10);

  if (!data) return <p className="py-10 text-center text-sm text-slate-400">Sin datos de categorías</p>;

  const sortedByMargin = useMemo(
    () => [...data.categorias].sort((a, b) => b.margen_promedio - a.margen_promedio),
    [data],
  );
  const topByMargin = useMemo(() => sortedByMargin.slice(0, limitTopMargin), [sortedByMargin, limitTopMargin]);
  const lowestByMargin = useMemo(() => sortedByMargin.slice(-limitLowMargin).reverse(), [sortedByMargin, limitLowMargin]);
  const lowestByMarginAll = useMemo(() => [...sortedByMargin].reverse(), [sortedByMargin]);

  const topSellingFlat = useMemo(
    () => topSelling.slice(0, limitTopSelling).map((t) => ({
      nombre: toTitleCase(t.categoria.nombre),
      total_vendido: t.total_vendido,
    })),
    [topSelling, limitTopSelling],
  );
  const lowRotFlat = useMemo(
    () => lowRotation.slice(0, limitLowRot).map((r) => ({
      nombre: toTitleCase(r.categoria.nombre),
      total_vendido: r.total_vendido,
    })),
    [lowRotation, limitLowRot],
  );

  const { sorted: sortedTopSelling, sortConfig: sortTopSelling, requestSort: reqSortTopSelling } =
    useSortableData<{ nombre: string; total_vendido: number } & Record<string, unknown>>(topSellingFlat, "total_vendido", "desc");
  const { sorted: sortedLowRot, sortConfig: sortLowRot, requestSort: reqSortLowRot } =
    useSortableData<{ nombre: string; total_vendido: number } & Record<string, unknown>>(lowRotFlat, "total_vendido");
  const { sorted: sortedTopMargin, sortConfig: sortTopMargin, requestSort: reqSortTopMargin } =
    useSortableData(topByMargin as (CategoryAnalyticsOut & Record<string, unknown>)[], "margen_promedio", "desc");
  const { sorted: sortedLowMargin, sortConfig: sortLowMargin, requestSort: reqSortLowMargin } =
    useSortableData(lowestByMargin as (CategoryAnalyticsOut & Record<string, unknown>)[], "margen_promedio");

  const visibleDetalle = useMemo(() => data.categorias.slice(0, limitDetalle), [data, limitDetalle]);
  const { sorted: sortedDetalle, sortConfig: sortDetalle, requestSort: reqSortDetalle } =
    useSortableData(visibleDetalle as (CategoryAnalyticsOut & Record<string, unknown>)[], "nombre");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Categorías" value={String(data.total_categorias)} icon={<ShoppingBag className="size-5" />} />
        <StatCard label="Productos" value={String(data.total_productos)} icon={<Package className="size-5" />} />
        <StatCard label="Stock Total" value={String(data.stock_total)} />
        <StatCard label="Uds. Vendidas" value={String(data.unidades_vendidas)} />
        <StatCard label="Ingresos USD" value={formatCurrency(data.ingresos_usd)} icon={<DollarSign className="size-5" />} variant="success" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        <Suspense fallback={<ChartSkeleton />}>
          <CategorySalesDonut data={data.categorias} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Top Ventas</h2>
          {sortedTopSelling.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitTopSelling)} onChange={(e) => setLimitTopSelling(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Categoría", sortable: true, onSort: () => reqSortTopSelling("nombre"), sortDirection: sortTopSelling?.key === "nombre" ? sortTopSelling.direction : null, render: (r: { nombre: string }) => r.nombre },
                { key: "total_vendido", header: "Ventas", sortable: true, onSort: () => reqSortTopSelling("total_vendido"), sortDirection: sortTopSelling?.key === "total_vendido" ? sortTopSelling.direction : null, render: (r: { total_vendido: number }) => String(r.total_vendido), exportValue: (r: { total_vendido: number }) => r.total_vendido },
              ]}
              data={sortedTopSelling}
              keyExtractor={(_, i) => i}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Categorias_top_ventas"
              onExported={notifyExport}
              allData={topSellingFlat as ({ nombre: string; total_vendido: number } & Record<string, unknown>)[]}
              fetchAllData={async () => {
                const all = await api.getTopSellingCategories(9999);
                return all.map((t) => ({ nombre: toTitleCase(t.categoria.nombre), total_vendido: t.total_vendido }));
              }}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Bajas Ventas</h2>
          {sortedLowRot.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitLowRot)} onChange={(e) => setLimitLowRot(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Categoría", sortable: true, onSort: () => reqSortLowRot("nombre"), sortDirection: sortLowRot?.key === "nombre" ? sortLowRot.direction : null, render: (r: { nombre: string }) => r.nombre },
                { key: "total_vendido", header: "Ventas", sortable: true, onSort: () => reqSortLowRot("total_vendido"), sortDirection: sortLowRot?.key === "total_vendido" ? sortLowRot.direction : null, render: (r: { total_vendido: number }) => String(r.total_vendido), exportValue: (r: { total_vendido: number }) => r.total_vendido },
              ]}
              data={sortedLowRot}
              keyExtractor={(_, i) => i}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Categorias_bajas_ventas"
              onExported={notifyExport}
              allData={lowRotFlat as ({ nombre: string; total_vendido: number } & Record<string, unknown>)[]}
              fetchAllData={async () => {
                const all = await api.getLowRotationCategories(9999);
                return all.map((r) => ({ nombre: toTitleCase(r.categoria.nombre), total_vendido: r.total_vendido }));
              }}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Mayor Margen Prom.</h2>
          {sortedTopMargin.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitTopMargin)} onChange={(e) => setLimitTopMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Categoría", sortable: true, onSort: () => reqSortTopMargin("nombre"), sortDirection: sortTopMargin?.key === "nombre" ? sortTopMargin.direction : null, render: (c: CategoryAnalyticsOut) => toTitleCase(c.nombre) },
                { key: "margen_promedio", header: "Margen Prom.", sortable: true, onSort: () => reqSortTopMargin("margen_promedio"), sortDirection: sortTopMargin?.key === "margen_promedio" ? sortTopMargin.direction : null, render: (c: CategoryAnalyticsOut) => `${Number(c.margen_promedio).toFixed(1)}%`, exportValue: (c: CategoryAnalyticsOut) => Number(c.margen_promedio) },
              ]}
              data={sortedTopMargin}
              keyExtractor={(c) => c.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Categorias_mayor_margen"
              onExported={notifyExport}
              allData={sortedByMargin as (CategoryAnalyticsOut & Record<string, unknown>)[]}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Menor Margen Prom.</h2>
          {sortedLowMargin.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitLowMargin)} onChange={(e) => setLimitLowMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Categoría", sortable: true, onSort: () => reqSortLowMargin("nombre"), sortDirection: sortLowMargin?.key === "nombre" ? sortLowMargin.direction : null, render: (c: CategoryAnalyticsOut) => toTitleCase(c.nombre) },
                { key: "margen_promedio", header: "Margen Prom.", sortable: true, onSort: () => reqSortLowMargin("margen_promedio"), sortDirection: sortLowMargin?.key === "margen_promedio" ? sortLowMargin.direction : null, render: (c: CategoryAnalyticsOut) => `${Number(c.margen_promedio).toFixed(1)}%`, exportValue: (c: CategoryAnalyticsOut) => Number(c.margen_promedio) },
              ]}
              data={sortedLowMargin}
              keyExtractor={(c) => c.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Categorias_menor_margen"
              onExported={notifyExport}
              allData={lowestByMarginAll as (CategoryAnalyticsOut & Record<string, unknown>)[]}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-text-main">Detalle por Categoría</h2>
        <Table
          headerLeft={<Select value={String(limitDetalle)} onChange={(e) => setLimitDetalle(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
          columns={[
            { key: "nombre", header: "Categoría", sortable: true, onSort: () => reqSortDetalle("nombre"), sortDirection: sortDetalle?.key === "nombre" ? sortDetalle.direction : null, render: (c: CategoryAnalyticsOut) => toTitleCase(c.nombre) },
            { key: "total_productos", header: "Productos", sortable: true, onSort: () => reqSortDetalle("total_productos"), sortDirection: sortDetalle?.key === "total_productos" ? sortDetalle.direction : null, render: (c: CategoryAnalyticsOut) => String(c.total_productos), exportValue: (c: CategoryAnalyticsOut) => c.total_productos },
            { key: "stock_total", header: "Stock", sortable: true, onSort: () => reqSortDetalle("stock_total"), sortDirection: sortDetalle?.key === "stock_total" ? sortDetalle.direction : null, render: (c: CategoryAnalyticsOut) => String(c.stock_total), exportValue: (c: CategoryAnalyticsOut) => c.stock_total },
            { key: "margen_promedio", header: "Margen Prom.", sortable: true, onSort: () => reqSortDetalle("margen_promedio"), sortDirection: sortDetalle?.key === "margen_promedio" ? sortDetalle.direction : null, render: (c: CategoryAnalyticsOut) => `${Number(c.margen_promedio).toFixed(1)}%`, exportValue: (c: CategoryAnalyticsOut) => Number(c.margen_promedio) },
            { key: "unidades_vendidas", header: "Vendidos", sortable: true, onSort: () => reqSortDetalle("unidades_vendidas"), sortDirection: sortDetalle?.key === "unidades_vendidas" ? sortDetalle.direction : null, render: (c: CategoryAnalyticsOut) => String(c.unidades_vendidas), exportValue: (c: CategoryAnalyticsOut) => c.unidades_vendidas },
            { key: "ingresos_usd", header: "Ingresos", sortable: true, onSort: () => reqSortDetalle("ingresos_usd"), sortDirection: sortDetalle?.key === "ingresos_usd" ? sortDetalle.direction : null, render: (c: CategoryAnalyticsOut) => formatCurrency(c.ingresos_usd), exportValue: (c: CategoryAnalyticsOut) => Number(c.ingresos_usd) },
          ]}
          data={sortedDetalle}
          keyExtractor={(c) => c.id}
          emptyMessage="Sin categorías"
          exportable
          exportFilename="Categorias_detalle"
          onExported={notifyExport}
          allData={data.categorias as (CategoryAnalyticsOut & Record<string, unknown>)[]}
        />
      </div>
    </div>
  );
}
