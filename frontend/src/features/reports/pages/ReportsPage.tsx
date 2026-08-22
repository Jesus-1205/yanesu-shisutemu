import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Package, ShoppingBag, Building2, TrendingUp, DollarSign, Wallet, Banknote } from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut, ProductMatrixItem, CategoryOut, CategoryAnalyticsResponse, SupplierAnalyticsResponse, CategoryAnalyticsOut, SupplierAnalyticsOut, PaymentMethodSummaryItem } from "@/types/api";
import type { SalesSummaryItem } from "@/features/sales/types";
import { formatPeriodRange } from "@/utils/dateUtils";
import { useSortableData } from "@/hooks/useSortableData";
import Tabs from "@/ui-components/Tabs";
import PageHeader from "@/ui-components/PageHeader";
import StatCard from "@/ui-components/StatCard";
import Table from "@/ui-components/Table";
import Spinner from "@/ui-components/Spinner";
import Select from "@/ui-components/Select";
import Button from "@/ui-components/Button";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";
const VentasVsCostosChart = lazy(() => import("../components/VentasVsCostosChart"));
const RentabilityScatterChart = lazy(() => import("../components/RentabilityScatterChart"));
const CategorySalesDonut = lazy(() => import("../components/CategorySalesDonut"));
const SupplierComparisonBar = lazy(() => import("../components/SupplierComparisonBar"));
const PaymentMethodsDonut = lazy(() => import("../components/PaymentMethodsDonut"));

const RANGO_OPTIONS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
];

const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

const FETCH_LIMIT = 50;

interface Filters {
  rango: string;
}

const defaultFilters: Filters = {
  rango: "semanal",
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [activeTab, setActiveTab] = useState("resumen");

  const [loading, setLoading] = useState(true);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryItem[]>([]);
  const [topWeek, setTopWeek] = useState<{ periodo: string; total_ventas: number; total_usd: number; total_ves: number } | null>(null);
  const [topSelling, setTopSelling] = useState<{ producto: ProductOut; total_vendido: number }[]>([]);
  const [topMargin, setTopMargin] = useState<ProductOut[]>([]);
  const [lowestMargin, setLowestMargin] = useState<ProductOut[]>([]);
  const [lowRotation, setLowRotation] = useState<{ producto: ProductOut; total_vendido: number }[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalyticsResponse | null>(null);
  const [supplierAnalytics, setSupplierAnalytics] = useState<SupplierAnalyticsResponse | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [topSellCats, setTopSellCats] = useState<{ categoria: CategoryOut; total_vendido: number }[]>([]);
  const [lowRotCats, setLowRotCats] = useState<{ categoria: CategoryOut; total_vendido: number }[]>([]);
  const [matrixData, setMatrixData] = useState<ProductMatrixItem[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentMethodSummaryItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [pagoDesde, setPagoDesde] = useState("");
  const [pagoHasta, setPagoHasta] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [summaryRes, topWeekRes, topSellRes, topMargRes, lowMargRes, lowRotRes] = await Promise.allSettled([
      api.getSalesSummary({ rango: filters.rango }),
      api.getTopWeek(filters.rango),
      api.getTopSellingProducts(FETCH_LIMIT),
      api.getTopMarginProducts(FETCH_LIMIT),
      api.getLowestMarginProducts(FETCH_LIMIT),
      api.getLowRotationProducts(FETCH_LIMIT),
    ]);

    if (summaryRes.status === "fulfilled") setSalesSummary(summaryRes.value);
    else toast("Error al cargar resumen de ventas", "error");
    if (topWeekRes.status === "fulfilled") setTopWeek(topWeekRes.value);
    if (topSellRes.status === "fulfilled") setTopSelling(topSellRes.value);
    if (topMargRes.status === "fulfilled") setTopMargin(topMargRes.value);
    if (lowMargRes.status === "fulfilled") setLowestMargin(lowMargRes.value);
    if (lowRotRes.status === "fulfilled") setLowRotation(lowRotRes.value);
    setLoading(false);
  }, [filters, toast]);

  const fetchMatrixData = useCallback(async () => {
    setLoadingMatrix(true);
    try {
      const data = await api.getProductsMatrix({ limit: 200 });
      setMatrixData(data);
    } catch {
      toast("Error al cargar matriz de rendimiento", "error");
    } finally {
      setLoadingMatrix(false);
    }
  }, [toast]);

  const fetchCategoryAnalytics = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const [analytics, topSell, lowRot] = await Promise.allSettled([
        api.getCategoryAnalytics(),
        api.getTopSellingCategories(FETCH_LIMIT),
        api.getLowRotationCategories(FETCH_LIMIT),
      ]);
      if (analytics.status === "fulfilled") setCategoryAnalytics(analytics.value);
      if (topSell.status === "fulfilled") setTopSellCats(topSell.value);
      if (lowRot.status === "fulfilled") setLowRotCats(lowRot.value);
    } catch {
      toast("Error al cargar analytics de categorías", "error");
    } finally {
      setLoadingCategories(false);
    }
  }, [toast]);

  const fetchSupplierAnalytics = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const data = await api.getSupplierAnalytics();
      setSupplierAnalytics(data);
    } catch {
      toast("Error al cargar analytics de proveedores", "error");
    } finally {
      setLoadingSuppliers(false);
    }
  }, [toast]);

  const fetchPaymentSummary = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const data = await api.getPaymentMethodSummary({
        ...(pagoDesde && { fecha_desde: pagoDesde }),
        ...(pagoHasta && { fecha_hasta: pagoHasta }),
      });
      setPaymentSummary(data.map((m) => ({
        ...m,
        cantidad_pagos: Number(m.cantidad_pagos) || 0,
        total_usd: Number(m.total_usd) || 0,
        total_ves: Number(m.total_ves) || 0,
        total_equivalente_usd: Number(m.total_equivalente_usd) || 0,
      })));
    } catch {
      toast("Error al cargar estadísticas de métodos de pago", "error");
    } finally {
      setLoadingPayments(false);
    }
  }, [pagoDesde, pagoHasta, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchMatrixData(); }, [fetchMatrixData]);

  useEffect(() => {
    if (activeTab === "categorias" && !categoryAnalytics && !loadingCategories) fetchCategoryAnalytics();
    if (activeTab === "proveedores" && !supplierAnalytics && !loadingSuppliers) fetchSupplierAnalytics();
    if (activeTab === "pagos") fetchPaymentSummary();
  }, [activeTab, categoryAnalytics, supplierAnalytics, loadingCategories, loadingSuppliers, fetchCategoryAnalytics, fetchSupplierAnalytics, fetchPaymentSummary]);

  const categoriesTotal = useMemo(
    () => Math.round(salesSummary.reduce((sum, s) => sum + Number(s.total_usd), 0) * 100) / 100,
    [salesSummary],
  );
  const categoriesCount = salesSummary.length;

  return (
    <div>
      <PageHeader
        title="Panel de Control"
        description="Estadísticas detalladas del sistema"
      />

      <div className="mb-6">
        <Tabs
          className="w-full justify-around"
          tabs={[
            { value: "resumen", label: "Resumen", icon: <BarChart3 className="w-4 h-4" /> },
            { value: "productos", label: "Productos", icon: <Package className="w-4 h-4" /> },
            { value: "categorias", label: "Categorías", icon: <ShoppingBag className="w-4 h-4" /> },
            { value: "proveedores", label: "Proveedores", icon: <Building2 className="w-4 h-4" /> },
            { value: "pagos", label: "Pagos", icon: <Wallet className="w-4 h-4" /> },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {loading && activeTab === "resumen" ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : activeTab === "resumen" ? (
        <ResumenTab
          salesSummary={salesSummary}
          topWeek={topWeek}
          topSelling={topSelling}
          categoriesTotal={categoriesTotal}
          categoriesCount={categoriesCount}
          rango={filters.rango}
          onRangoChange={(r) => setFilters((prev) => ({ ...prev, rango: r }))}
        />
      ) : activeTab === "productos" ? (
        loading ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <ProductosTab
            topSelling={topSelling}
            topMargin={topMargin}
            lowestMargin={lowestMargin}
            lowRotation={lowRotation}
            matrixData={matrixData}
            loadingMatrix={loadingMatrix}
          />
        )
      ) : activeTab === "categorias" ? (
        loadingCategories ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <CategoriasTab
            data={categoryAnalytics}
            topSelling={topSellCats}
            lowRotation={lowRotCats}
          />
        )
      ) : activeTab === "proveedores" ? (
        loadingSuppliers ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <ProveedoresTab data={supplierAnalytics} />
        )
      ) : activeTab === "pagos" ? (
        <PagosTab
          data={paymentSummary}
          loading={loadingPayments}
          desde={pagoDesde}
          hasta={pagoHasta}
          onDesdeChange={setPagoDesde}
          onHastaChange={setPagoHasta}
          onClear={() => { setPagoDesde(""); setPagoHasta(""); }}
        />
      ) : null}
    </div>
  );
}

function SortableSalesTable({ data, rango }: { data: SalesSummaryItem[]; rango: string }) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [limit, setLimit] = useState(5);
  const visible = useMemo(() => data.slice(-limit), [data, limit]);
  const { sorted, sortConfig, requestSort } = useSortableData<SalesSummaryItem & Record<string, unknown>>(visible as (SalesSummaryItem & Record<string, unknown>)[], "periodo", "desc");
  const columns = [
    {
      key: "periodo",
      header: "Período",
      sortable: true,
      onSort: () => requestSort("periodo"),
      sortDirection: sortConfig?.key === "periodo" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => formatPeriodRange(s.periodo, rango as "semanal"),
    },
    {
      key: "total_ventas",
      header: "Ventas",
      sortable: true,
      onSort: () => requestSort("total_ventas"),
      sortDirection: sortConfig?.key === "total_ventas" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => String(s.total_ventas),
      exportValue: (s: SalesSummaryItem) => Number(s.total_ventas),
    },
    {
      key: "total_usd",
      header: "USD",
      sortable: true,
      onSort: () => requestSort("total_usd"),
      sortDirection: sortConfig?.key === "total_usd" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => formatCurrency(s.total_usd),
      exportValue: (s: SalesSummaryItem) => Number(s.total_usd),
    },
    {
      key: "total_ves",
      header: "VES",
      sortable: true,
      onSort: () => requestSort("total_ves"),
      sortDirection: sortConfig?.key === "total_ves" ? sortConfig.direction : null,
      render: (s: SalesSummaryItem) => formatCurrency(s.total_ves, "Bs "),
      exportValue: (s: SalesSummaryItem) => Number(s.total_ves),
    },
  ];
  return (
    <Table
      headerLeft={<Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
      columns={columns}
      data={sorted}
      keyExtractor={(s) => s.periodo}
      emptyMessage="Sin datos"
      exportable
      exportFilename="Resumen_ventas"
        onExported={notifyExport}
      allData={data as (SalesSummaryItem & Record<string, unknown>)[]}
    />
  );
}

function ResumenTab({
  salesSummary,
  topWeek,
  topSelling,
  categoriesTotal,
  categoriesCount,
  rango,
  onRangoChange,
}: {
  salesSummary: SalesSummaryItem[];
  topWeek: { periodo: string; total_ventas: number; total_usd: number; total_ves: number } | null;
  topSelling: { producto: ProductOut; total_vendido: number }[];
  categoriesTotal: number;
  categoriesCount: number;
  rango: string;
  onRangoChange: (r: string) => void;
}) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total USD" value={formatCurrency(categoriesTotal)} icon={<DollarSign className="w-5 h-5" />} variant="info" trend={getTrend()} />
          <StatCard label="Períodos" value={String(categoriesCount)} icon={<BarChart3 className="w-5 h-5" />} />
          <StatCard label={bestPeriodLabel} value={`${formatPeriodRange(topWeek.periodo, rango as "semanal")} · ${formatCurrency(topWeek.total_usd)}`} icon={<TrendingUp className="w-5 h-5" />} variant="success" />
        </div>
      )}

      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-4">Resumen de Ventas</h2>
          {salesSummary.length > 0 ? (
            <SortableSalesTable data={salesSummary} rango={rango} />
          ) : (
            <p className="text-sm text-slate-400">Sin datos de ventas</p>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Top Vendidos</h2>
          {topSelling.length > 0 ? (
            <Table
              headerLeft={<Select value={String(limitTopSelling)} onChange={(e) => setLimitTopSelling(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
              columns={[
                { key: "nombre", header: "Producto", render: (r: { producto: ProductOut }) => <span className="truncate max-w-[150px] block" title={r.producto.nombre}>{r.producto.nombre}</span> },
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

function ProductosTab({
  topSelling,
  topMargin,
  lowestMargin,
  lowRotation,
  matrixData,
  loadingMatrix,
}: {
  topSelling: { producto: ProductOut; total_vendido: number }[];
  topMargin: ProductOut[];
  lowestMargin: ProductOut[];
  lowRotation: { producto: ProductOut; total_vendido: number }[];
  matrixData: ProductMatrixItem[];
  loadingMatrix: boolean;
}) {
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
      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        {loadingMatrix ? (
          <div className="flex items-center justify-center h-[300px]"><Spinner size="lg" /></div>
        ) : (
          <Suspense fallback={<div className="flex items-center justify-center h-[300px]"><Spinner size="lg" /></div>}>
            <RentabilityScatterChart data={matrixData} />
          </Suspense>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-text-main mb-3">Más Vendidos</h2>
        {sortedSelling.length > 0 ? (
          <Table
            headerLeft={<Select value={String(limitSelling)} onChange={(e) => setLimitSelling(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
            columns={[
              { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortSelling("nombre"), sortDirection: sortSelling?.key === "nombre" ? sortSelling.direction : null, render: (r: { nombre: string }) => <span className="truncate max-w-[150px] block" title={r.nombre}>{r.nombre}</span> },
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
      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-text-main mb-3">Mayor Margen</h2>
        {sortedTopMargin.length > 0 ? (
          <Table
            headerLeft={<Select value={String(limitTopMargin)} onChange={(e) => setLimitTopMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
            columns={[
              { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortTopMargin("nombre"), sortDirection: sortTopMargin?.key === "nombre" ? sortTopMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => <span className="truncate max-w-[150px] block" title={p.nombre}>{p.nombre}</span> },
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
      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-text-main mb-3">Menor Margen</h2>
        {sortedLowMargin.length > 0 ? (
          <Table
            headerLeft={<Select value={String(limitLowMargin)} onChange={(e) => setLimitLowMargin(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
            columns={[
              { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortLowMargin("nombre"), sortDirection: sortLowMargin?.key === "nombre" ? sortLowMargin.direction : null, render: (p: ProductOut & { margen_pct: number }) => <span className="truncate max-w-[150px] block" title={p.nombre}>{p.nombre}</span> },
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
      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-text-main mb-3">Menor Rotación</h2>
        {sortedLowRot.length > 0 ? (
          <Table
            headerLeft={<Select value={String(limitLowRot)} onChange={(e) => setLimitLowRot(Number(e.target.value))} options={LIMIT_OPTIONS} size="sm" />}
            columns={[
              { key: "nombre", header: "Producto", sortable: true, onSort: () => reqSortLowRot("nombre"), sortDirection: sortLowRot?.key === "nombre" ? sortLowRot.direction : null, render: (r: { nombre: string }) => <span className="truncate max-w-[150px] block" title={r.nombre}>{r.nombre}</span> },
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

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function CategoriasTab({
  data,
  topSelling,
  lowRotation,
}: {
  data: CategoryAnalyticsResponse | null;
  topSelling: { categoria: CategoryOut; total_vendido: number }[];
  lowRotation: { categoria: CategoryOut; total_vendido: number }[];
}) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [limitTopSelling, setLimitTopSelling] = useState(5);
  const [limitLowRot, setLimitLowRot] = useState(5);
  const [limitTopMargin, setLimitTopMargin] = useState(5);
  const [limitLowMargin, setLimitLowMargin] = useState(5);
  const [limitDetalle, setLimitDetalle] = useState(10);

  if (!data) return <p className="text-sm text-slate-400 text-center py-10">Sin datos de categorías</p>;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard label="Categorías" value={String(data.total_categorias)} icon={<ShoppingBag className="w-5 h-5" />} />
        <StatCard label="Productos" value={String(data.total_productos)} icon={<Package className="w-5 h-5" />} />
        <StatCard label="Stock Total" value={String(data.stock_total)} />
        <StatCard label="Uds. Vendidas" value={String(data.unidades_vendidas)} />
        <StatCard label="Ingresos USD" value={formatCurrency(data.ingresos_usd)} icon={<DollarSign className="w-5 h-5" />} variant="success" />
      </div>

      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <Suspense fallback={<ChartSkeleton />}>
          <CategorySalesDonut data={data.categorias} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Top Ventas</h2>
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
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Bajas Ventas</h2>
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
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Mayor Margen Prom.</h2>
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
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Menor Margen Prom.</h2>
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

      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-text-main mb-3">Detalle por Categoría</h2>
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

function ProveedoresTab({ data }: { data: SupplierAnalyticsResponse | null }) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const [showInactives, setShowInactives] = useState(false);
  const [limitTopSales, setLimitTopSales] = useState(5);
  const [limitLowSales, setLimitLowSales] = useState(5);
  const [limitTopMargin, setLimitTopMargin] = useState(5);
  const [limitLowMargin, setLimitLowMargin] = useState(5);
  const [limitDetalle, setLimitDetalle] = useState(10);

  if (!data) return <p className="text-sm text-slate-400 text-center py-10">Sin datos de proveedores</p>;

  const isActive = useCallback(
    (s: SupplierAnalyticsOut) =>
      s.total_productos > 0 || s.stock_total > 0 || s.ingresos_usd > 0,
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard label="Proveedores" value={String(data.total_proveedores)} icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Productos" value={String(data.total_productos)} icon={<Package className="w-5 h-5" />} />
        <StatCard label="Stock Total" value={String(data.stock_total)} />
        <StatCard label="Uds. Vendidas" value={String(data.unidades_vendidas)} />
        <StatCard label="Ingresos USD" value={formatCurrency(data.ingresos_usd)} icon={<DollarSign className="w-5 h-5" />} variant="success" />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactives}
            onChange={(e) => setShowInactives(e.target.checked)}
            autoComplete="off"
            className="rounded border-slate-300 text-brand focus:ring-brand"
          />
          Mostrar inactivos
        </label>
        <span className="text-xs text-slate-400">
          ({data.proveedores.length - activeSuppliers.length} inactivos)
        </span>
      </div>

      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <Suspense fallback={<ChartSkeleton />}>
          <SupplierComparisonBar data={visibleSuppliers} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Top Ventas</h2>
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
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Bajas Ventas</h2>
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
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Mayor Margen Prom.</h2>
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
        <div className="bg-surface rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-text-main mb-3">Menor Margen Prom.</h2>
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

      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-text-main mb-3">Detalle por Proveedor</h2>
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

function PagosTab({
  data,
  loading,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
  onClear,
}: {
  data: PaymentMethodSummaryItem[];
  loading: boolean;
  desde: string;
  hasta: string;
  onDesdeChange: (v: string) => void;
  onHastaChange: (v: string) => void;
  onClear: () => void;
}) {
  const { toast } = useToast();
  const notifyExport = (name: string) => toast(`Archivo descargado: ${name}`, "success");
  const { sorted, sortConfig, requestSort } = useSortableData<PaymentMethodSummaryItem & Record<string, unknown>>(
    data as (PaymentMethodSummaryItem & Record<string, unknown>)[],
    "total_usd",
    "desc",
  );

  const totals = useMemo(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let totalPagos = 0;
    let totalEquivUsd = 0;
    for (const m of data) {
      totalUsd = Math.round((totalUsd + (Number(m.total_usd) || 0)) * 100) / 100;
      totalVes = Math.round((totalVes + (Number(m.total_ves) || 0)) * 100) / 100;
      totalPagos += m.cantidad_pagos || 0;
      totalEquivUsd = Math.round((totalEquivUsd + (Number(m.total_equivalente_usd) || 0)) * 100) / 100;
    }
    return { totalUsd, totalVes, totalPagos, totalEquivUsd };
  }, [data]);
  const { totalUsd, totalVes, totalPagos, totalEquivUsd } = totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => onDesdeChange(e.target.value)}
            autoComplete="off"
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => onHastaChange(e.target.value)}
            autoComplete="off"
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
        {(desde || hasta) && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpiar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Recibido USD" value={formatCurrency(totalUsd)} icon={<DollarSign className="w-5 h-5" />} variant="success" />
            <StatCard label="Recibido VES" value={formatCurrency(totalVes, "Bs ")} icon={<Banknote className="w-5 h-5" />} variant="info" />
            <StatCard label="Equivalente USD" value={formatCurrency(totalEquivUsd)} icon={<DollarSign className="w-5 h-5" />} />
            <StatCard label="Total de Pagos" value={String(totalPagos)} icon={<Wallet className="w-5 h-5" />} />
          </div>

          <div className="bg-surface rounded-xl border border-slate-200 p-5">
            <Suspense fallback={<ChartSkeleton />}>
              <PaymentMethodsDonut data={data} />
            </Suspense>
          </div>

          <div className="bg-surface rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-text-main mb-3">Detalle por Método de Pago</h2>
            <Table
              columns={[
                {
                  key: "metodo_pago_nombre",
                  header: "Método",
                  sortable: true,
                  onSort: () => requestSort("metodo_pago_nombre"),
                  sortDirection: sortConfig?.key === "metodo_pago_nombre" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => (
                    <span className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {formatPaymentMethodName(m.metodo_pago_nombre)}
                      </span>
                      <span className="text-xs text-slate-400">{m.moneda_default}</span>
                    </span>
                  ),
                },
                {
                  key: "cantidad_pagos",
                  header: "Pagos",
                  sortable: true,
                  onSort: () => requestSort("cantidad_pagos"),
                  sortDirection: sortConfig?.key === "cantidad_pagos" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => String(m.cantidad_pagos),
                  exportValue: (m: PaymentMethodSummaryItem) => m.cantidad_pagos,
                },
                {
                  key: "total_usd",
                  header: "Total USD",
                  sortable: true,
                  onSort: () => requestSort("total_usd"),
                  sortDirection: sortConfig?.key === "total_usd" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => formatCurrency(m.total_usd),
                  exportValue: (m: PaymentMethodSummaryItem) => Number(m.total_usd),
                },
                {
                  key: "total_ves",
                  header: "Total VES",
                  sortable: true,
                  onSort: () => requestSort("total_ves"),
                  sortDirection: sortConfig?.key === "total_ves" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => formatCurrency(m.total_ves, "Bs "),
                  exportValue: (m: PaymentMethodSummaryItem) => Number(m.total_ves),
                },
                {
                  key: "total_equivalente_usd",
                  header: "Equiv. USD",
                  sortable: true,
                  onSort: () => requestSort("total_equivalente_usd"),
                  sortDirection: sortConfig?.key === "total_equivalente_usd" ? sortConfig.direction : null,
                  render: (m: PaymentMethodSummaryItem) => formatCurrency(m.total_equivalente_usd),
                  exportValue: (m: PaymentMethodSummaryItem) => Number(m.total_equivalente_usd),
                },
              ]}
              data={sorted}
              keyExtractor={(m) => m.metodo_pago_id}
              emptyMessage="Sin datos"
              exportable
              exportFilename="Metodos_pago_estadisticas"
              onExported={notifyExport}
              allData={sorted as (PaymentMethodSummaryItem & Record<string, unknown>)[]}
            />
          </div>
        </>
      )}
    </div>
  );
}