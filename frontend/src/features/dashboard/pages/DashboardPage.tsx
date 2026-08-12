import { Suspense, lazy, useEffect, useState } from "react";
import { Package, ShoppingBag, Building2, AlertTriangle, TrendingUp } from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut, SalesSummaryItem } from "@/types/api";
import StatCard from "@/ui-components/StatCard";
import Table from "@/ui-components/Table";
import Spinner from "@/ui-components/Spinner";
import ChartContainer from "@/ui-components/charts/ChartContainer";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";
const SalesTrendChart = lazy(() => import("../components/SalesTrendChart"));
const TopProductsBarChart = lazy(() => import("../components/TopProductsBarChart"));
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/ui-components/Toast";

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [totalProductos, setTotalProductos] = useState(0);
  const [sinStock, setSinStock] = useState(0);
  const [totalCategorias, setTotalCategorias] = useState(0);
  const [totalProveedores, setTotalProveedores] = useState(0);
  const [ventasSemana, setVentasSemana] = useState<SalesSummaryItem | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryItem[]>([]);
  const [topProducts, setTopProducts] = useState<{ producto: ProductOut; total_vendido: number }[]>([]);
  const [topMargin, setTopMargin] = useState<ProductOut[]>([]);
  const [lowRotation, setLowRotation] = useState<{ producto: ProductOut; total_vendido: number }[]>([]);

  useEffect(() => {
    const now = new Date();
    const daysSinceSunday = now.getDay();
    const lastSunday = new Date(now.getTime() - daysSinceSunday * 86400000);
    const sixWeeksBefore = new Date(lastSunday.getTime() - 41 * 86400000);
    const fechaDesde = sixWeeksBefore.toISOString().slice(0, 10);
    const fechaHasta = lastSunday.toISOString().slice(0, 10);

    Promise.allSettled([
      api.getProducts(),
      api.getCategories(),
      api.getSuppliers(),
      api.getSalesSummary({ rango: "semanal", fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      api.getTopSellingProducts(5),
      api.getTopMarginProducts(5),
      api.getLowRotationProducts(5),
    ]).then(([
      productsRes,
      categoriesRes,
      suppliersRes,
      salesSummaryRes,
      topProductsRes,
      topMarginRes,
      lowRotationRes,
    ]) => {
      if (productsRes.status === "fulfilled") {
        setTotalProductos(productsRes.value.items.length);
        setSinStock(productsRes.value.items.filter((p) => p.stock_unidades === 0).length);
      }
      if (categoriesRes.status === "fulfilled") setTotalCategorias(categoriesRes.value.length);
      if (suppliersRes.status === "fulfilled") setTotalProveedores(suppliersRes.value.length);
      if (salesSummaryRes.status === "fulfilled") {
        const data = salesSummaryRes.value;
        setSalesSummary(data.slice(-5));
        if (data.length > 0) setVentasSemana(data[data.length - 1]);
      }
      if (topProductsRes.status === "fulfilled") setTopProducts(topProductsRes.value);
      if (topMarginRes.status === "fulfilled") setTopMargin(topMarginRes.value);
      if (lowRotationRes.status === "fulfilled") setLowRotation(lowRotationRes.value);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <h1 className="text-responsive-h1 text-text-main">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 sm:gap-4">
        <StatCard
          label="Productos"
          value={String(totalProductos)}
          icon={<Package className="w-5 h-5" />}
          className="lg:col-span-2"
        />
        <StatCard
          label="Categorías"
          value={String(totalCategorias)}
          icon={<ShoppingBag className="w-5 h-5" />}
          className="lg:col-span-2"
        />
        <StatCard
          label="Proveedores"
          value={String(totalProveedores)}
          icon={<Building2 className="w-5 h-5" />}
          className="lg:col-span-2"
        />
        <StatCard
          label="Sin stock"
          value={String(sinStock)}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant={sinStock > 0 ? "danger" : "success"}
          className="lg:col-span-2"
        />
        <StatCard
          label="Ventas semanal"
          value={ventasSemana ? formatCurrency(ventasSemana.total_usd) : "—"}
          icon={<TrendingUp className="w-5 h-5" />}
          variant={ventasSemana ? "success" : "default"}
          className="lg:col-span-4"
        />
      </div>

      {/* Sales trend + Top products charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ChartContainer title="Ventas Semanales — Últimas 5 Semanas">
            <Suspense fallback={<ChartSkeleton />}>
              <SalesTrendChart data={salesSummary} />
            </Suspense>
          </ChartContainer>
        </div>
        <div className="lg:col-span-5">
          <ChartContainer title="Top 5 Más Vendidos — Histórico">
            <Suspense fallback={<ChartSkeleton />}>
              <TopProductsBarChart data={topProducts} />
            </Suspense>
          </ChartContainer>
        </div>
      </div>

      {/* Top margin + Low rotation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-text-main mb-3">Mayor Margen — Catálogo Actual</h2>
          {topMargin.length > 0 ? (
            <Table
              columns={[
                { key: "nombre", header: "Producto", className: "max-w-[140px] truncate" },
                {
                  key: "precio_costo_usd",
                  header: "Costo",
                  render: (p: ProductOut) => formatCurrency(p.precio_costo_usd),
                },
                {
                  key: "precio_unidad_usd",
                  header: "Venta",
                  render: (p: ProductOut) => formatCurrency(p.precio_unidad_usd),
                },
                {
                  key: "margen",
                  header: "Margen",
                  render: (p: ProductOut) =>
                    formatCurrency(Math.round((p.precio_unidad_usd - p.precio_costo_usd) * 100) / 100),
                },
              ]}
              data={topMargin}
              keyExtractor={(p) => p.id}
              emptyMessage="Sin datos"
              className="text-xs"
              exportable
              exportFilename="Dashboard_mayor_margen"
              onExported={(name) => toast(`Archivo descargado: ${name}`, "success")}
            />
          ) : (
            <p className="text-sm text-slate-400">Sin datos de margen</p>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-text-main mb-3">Menor Rotación — Histórico</h2>
          {lowRotation.length > 0 ? (
            <Table
              columns={[
                { key: "nombre", header: "Producto", render: (r: { producto: ProductOut }) => r.producto.nombre },
                { key: "total", header: "Vendidos", render: (r: { total_vendido: number }) => String(r.total_vendido) },
              ]}
              data={lowRotation}
              keyExtractor={(_, i) => i}
              emptyMessage="Sin datos"
              className="text-xs"
              exportable
              exportFilename="Dashboard_menor_rotacion"
              onExported={(name) => toast(`Archivo descargado: ${name}`, "success")}
            />
          ) : (
            <p className="text-sm text-slate-400">Sin datos de rotación</p>
          )}
        </div>
      </div>
    </div>
  );
}
