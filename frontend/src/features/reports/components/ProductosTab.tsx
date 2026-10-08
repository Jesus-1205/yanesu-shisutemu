import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut, ProductMatrixItem, ProductRankingItem } from "@/types/api";
import { useSortableData } from "@/hooks/useSortableData";
import Table from "@/ui-components/Table";
import Select from "@/ui-components/Select";
import Spinner from "@/ui-components/Spinner";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency } from "@/lib/utils";

const RentabilityScatterChart = lazy(() => import("./RentabilityScatterChart"));

const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

interface ProductosTabProps {
  topSelling: { producto: ProductRankingItem; total_vendido: number }[];
  topMargin: ProductOut[];
  lowestMargin: ProductOut[];
  lowRotation: { producto: ProductRankingItem; total_vendido: number }[];
  matrixData: ProductMatrixItem[];
  loadingMatrix: boolean;
}

export default function ProductosTab({
  topSelling,
  topMargin,
  lowestMargin,
  lowRotation,
  matrixData,
  loadingMatrix,
}: ProductosTabProps) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [limitSelling, setLimitSelling] = useState(5);
  const [limitTopMargin, setLimitTopMargin] = useState(5);
  const [limitLowMargin, setLimitLowMargin] = useState(5);
  const [limitLowRot, setLimitLowRot] = useState(5);

  const visibleSelling = useMemo(() => topSelling.slice(0, limitSelling), [topSelling, limitSelling]);
  const visibleTopMargin = useMemo(() => topMargin.slice(0, limitTopMargin), [topMargin, limitTopMargin]);
  const visibleLowMargin = useMemo(() => lowestMargin.slice(0, limitLowMargin), [lowestMargin, limitLowMargin]);
  const visibleLowRotation = useMemo(() => lowRotation.slice(0, limitLowRot), [lowRotation, limitLowRot]);

  const sellingFlat = useMemo(
    () => visibleSelling.map((r) => ({
      nombre: r.producto.nombre,
      total_vendido: r.total_vendido,
      ingresos: Math.round((r.total_vendido * r.producto.precio_unidad_usd) * 100) / 100,
    })),
    [visibleSelling],
  );
  const { sorted: sortedSelling, sortConfig: sortSelling, requestSort: reqSortSelling } = useSortableData(
    sellingFlat as ({ nombre: string; total_vendido: number; ingresos: number } & Record<string, unknown>)[],
    "total_vendido" as keyof ({ nombre: string; total_vendido: number; ingresos: number } & Record<string, unknown>),
    "desc",
  );

  const marginCalc = useCallback((p: ProductOut) => {
    const costo = Number(p.precio_costo_usd) || 0;
    const venta = Number(p.precio_unidad_usd) || 0;
    return costo > 0 ? ((venta - costo) / costo) * 100 : 0;
  }, []);

  const topMarginFlat = useMemo(
    () => visibleTopMargin.map((p) => ({ ...p, margen_pct: marginCalc(p) })),
    [visibleTopMargin, marginCalc],
  );
  const { sorted: sortedTopMargin, sortConfig: sortTopMargin, requestSort: reqSortTopMargin } = useSortableData(
    topMarginFlat as (ProductOut & { margen_pct: number } & Record<string, unknown>)[],
    "margen_pct" as keyof (ProductOut & { margen_pct: number } & Record<string, unknown>),
    "desc",
  );

  const lowMarginFlat = useMemo(
    () => visibleLowMargin.map((p) => ({ ...p, margen_pct: marginCalc(p) })),
    [visibleLowMargin, marginCalc],
  );
  const { sorted: sortedLowMargin, sortConfig: sortLowMargin, requestSort: reqSortLowMargin } = useSortableData(
    lowMarginFlat as (ProductOut & { margen_pct: number } & Record<string, unknown>)[],
    "margen_pct" as keyof (ProductOut & { margen_pct: number } & Record<string, unknown>),
    "asc",
  );

  const lowRotFlat = useMemo(
    () => visibleLowRotation.map((r) => ({
      nombre: r.producto.nombre,
      total_vendido: r.total_vendido,
      stock: r.producto.stock_unidades,
    })),
    [visibleLowRotation],
  );
  const { sorted: sortedLowRot, sortConfig: sortLowRot, requestSort: reqSortLowRot } = useSortableData(
    lowRotFlat as ({ nombre: string; total_vendido: number; stock: number } & Record<string, unknown>)[],
    "total_vendido" as keyof ({ nombre: string; total_vendido: number; stock: number } & Record<string, unknown>),
    "asc",
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        {loadingMatrix ? (
          <div className="flex h-75 items-center justify-center"><Spinner size="lg" /></div>
        ) : (
          <Suspense fallback={<div className="flex h-75 items-center justify-center"><Spinner size="lg" /></div>}>
            <RentabilityScatterChart data={matrixData} />
          </Suspense>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Más Vendidos</h2>
          {sortedSelling.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitSelling)} onChange={(e) => setLimitSelling(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortSelling("nombre"), sortDirection: sortSelling?.key === "nombre" ? sortSelling.direction : null, render: (r: { nombre: string }) => <span className="block max-w-[150px] truncate" title={r.nombre}>{r.nombre}</span> },
                { key: "total_vendido", header: "Vendidos", sortable: true, onSort: () => reqSortSelling("total_vendido"), sortDirection: sortSelling?.key === "total_vendido" ? sortSelling.direction : null, render: (r: { total_vendido: number }) => String(r.total_vendido), exportValue: (r: { total_vendido: number }) => r.total_vendido },
                { key: "ingresos", header: "Ingresos ($)", sortable: true, onSort: () => reqSortSelling("ingresos"), sortDirection: sortSelling?.key === "ingresos" ? sortSelling.direction : null, render: (r: { ingresos: number }) => formatCurrency(r.ingresos), exportValue: (r: { ingresos: number }) => r.ingresos },
              ]}
              data={sortedSelling}
              keyExtractor={(_, i) => i}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Productos_mas_vendidos"
              onExported={notifyExport}
              allData={sellingFlat as ({ nombre: string; total_vendido: number; ingresos: number } & Record<string, unknown>)[]}
              fetchAllData={async () => {
                const all = await api.getTopSellingProducts(9999);
                return all.map((r) => ({ nombre: r.producto.nombre, total_vendido: r.total_vendido, ingresos: Math.round((r.total_vendido * r.producto.precio_unidad_usd) * 100) / 100 }));
              }}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Mayor Margen</h2>
          {sortedTopMargin.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitTopMargin)} onChange={(e) => setLimitTopMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortTopMargin("nombre"), sortDirection: sortTopMargin?.key === "nombre" ? sortTopMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => <span className="block max-w-[150px] truncate" title={p.nombre}>{p.nombre}</span> },
                { key: "precio_costo_usd", header: "Costo", sortable: true, onSort: () => reqSortTopMargin("precio_costo_usd"), sortDirection: sortTopMargin?.key === "precio_costo_usd" ? sortTopMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => formatCurrency(p.precio_costo_usd), exportValue: (p: ProductOut & { margen_pct: number }) => Number(p.precio_costo_usd) },
                { key: "precio_unidad_usd", header: "Venta", sortable: true, onSort: () => reqSortTopMargin("precio_unidad_usd"), sortDirection: sortTopMargin?.key === "precio_unidad_usd" ? sortTopMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => formatCurrency(p.precio_unidad_usd), exportValue: (p: ProductOut & { margen_pct: number }) => Number(p.precio_unidad_usd) },
                { key: "margen_pct", header: "Margen", sortable: true, onSort: () => reqSortTopMargin("margen_pct"), sortDirection: sortTopMargin?.key === "margen_pct" ? sortTopMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => { const margen = Math.round((p.precio_unidad_usd - p.precio_costo_usd) * 100) / 100; return `${formatCurrency(margen)} (${p.margen_pct.toFixed(1)}%)`; }, exportValue: (p: ProductOut & { margen_pct: number }) => Math.round((p.precio_unidad_usd - p.precio_costo_usd) * 100) / 100 },
              ]}
              data={sortedTopMargin}
              keyExtractor={(p) => p.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Productos_mayor_margen"
              onExported={notifyExport}
              allData={topMarginFlat as (ProductOut & { margen_pct: number } & Record<string, unknown>)[]}
              fetchAllData={async () => {
                const all = await api.getTopMarginProducts(9999);
                return all.map((p) => ({ ...p, margen_pct: Number(p.precio_costo_usd) > 0 ? ((Number(p.precio_unidad_usd) - Number(p.precio_costo_usd)) / Number(p.precio_costo_usd)) * 100 : 0 }));
              }}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Menor Margen</h2>
          {sortedLowMargin.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitLowMargin)} onChange={(e) => setLimitLowMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortLowMargin("nombre"), sortDirection: sortLowMargin?.key === "nombre" ? sortLowMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => <span className="block max-w-[150px] truncate" title={p.nombre}>{p.nombre}</span> },
                { key: "precio_costo_usd", header: "Costo", sortable: true, onSort: () => reqSortLowMargin("precio_costo_usd"), sortDirection: sortLowMargin?.key === "precio_costo_usd" ? sortLowMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => formatCurrency(p.precio_costo_usd), exportValue: (p: ProductOut & { margen_pct: number }) => Number(p.precio_costo_usd) },
                { key: "precio_unidad_usd", header: "Venta", sortable: true, onSort: () => reqSortLowMargin("precio_unidad_usd"), sortDirection: sortLowMargin?.key === "precio_unidad_usd" ? sortLowMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => formatCurrency(p.precio_unidad_usd), exportValue: (p: ProductOut & { margen_pct: number }) => Number(p.precio_unidad_usd) },
                { key: "margen_pct", header: "Margen", sortable: true, onSort: () => reqSortLowMargin("margen_pct"), sortDirection: sortLowMargin?.key === "margen_pct" ? sortLowMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => { const margen = Math.round((p.precio_unidad_usd - p.precio_costo_usd) * 100) / 100; return `${formatCurrency(margen)} (${p.margen_pct.toFixed(1)}%)`; }, exportValue: (p: ProductOut & { margen_pct: number }) => Math.round((p.precio_unidad_usd - p.precio_costo_usd) * 100) / 100 },
              ]}
              data={sortedLowMargin}
              keyExtractor={(p) => p.id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Productos_menor_margen"
              onExported={notifyExport}
              allData={lowMarginFlat as (ProductOut & { margen_pct: number } & Record<string, unknown>)[]}
              fetchAllData={async () => {
                const all = await api.getLowestMarginProducts(9999);
                return all.map((p) => ({ ...p, margen_pct: Number(p.precio_costo_usd) > 0 ? ((Number(p.precio_unidad_usd) - Number(p.precio_costo_usd)) / Number(p.precio_costo_usd)) * 100 : 0 }));
              }}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text-main">Menor Rotación</h2>
          {sortedLowRot.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitLowRot)} onChange={(e) => setLimitLowRot(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortLowRot("nombre"), sortDirection: sortLowRot?.key === "nombre" ? sortLowRot.direction : null, render: (r: { nombre: string }) => <span className="block max-w-[150px] truncate" title={r.nombre}>{r.nombre}</span> },
                { key: "total_vendido", header: "Vendidos", sortable: true, onSort: () => reqSortLowRot("total_vendido"), sortDirection: sortLowRot?.key === "total_vendido" ? sortLowRot.direction : null, render: (r: { total_vendido: number }) => String(r.total_vendido), exportValue: (r: { total_vendido: number }) => r.total_vendido },
                { key: "stock", header: "Stock", sortable: true, onSort: () => reqSortLowRot("stock"), sortDirection: sortLowRot?.key === "stock" ? sortLowRot.direction : null, render: (r: { stock: number }) => String(r.stock), exportValue: (r: { stock: number }) => r.stock },
              ]}
              data={sortedLowRot}
              keyExtractor={(_, i) => i}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Productos_menor_rotacion"
              onExported={notifyExport}
              allData={lowRotFlat as ({ nombre: string; total_vendido: number; stock: number } & Record<string, unknown>)[]}
              fetchAllData={async () => {
                const all = await api.getLowRotationProducts(9999);
                return all.map((r) => ({ nombre: r.producto.nombre, total_vendido: r.total_vendido, stock: r.producto.stock_unidades }));
              }}
            />
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
      </div>
    </div>
  );
}
