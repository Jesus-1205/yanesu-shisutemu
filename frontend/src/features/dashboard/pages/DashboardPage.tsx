import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  Building2,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  FileText,
  Receipt,
} from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut, SalesSummaryItem, InvoiceStatsOut, InvoicePendingSummaryOut } from "@/types/api";
import StatCard from "@/ui-components/StatCard";
import Spinner from "@/ui-components/Spinner";
import ChartContainer from "@/ui-components/charts/ChartContainer";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";
const SalesTrendChart = lazy(() => import("../components/SalesTrendChart"));
const TopProductsBarChart = lazy(() => import("../components/TopProductsBarChart"));
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [totalProductos, setTotalProductos] = useState(0);
  const [sinStock, setSinStock] = useState(0);
  const [totalCategorias, setTotalCategorias] = useState(0);
  const [totalProveedores, setTotalProveedores] = useState(0);
  const [ventasSemana, setVentasSemana] = useState<SalesSummaryItem | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryItem[]>([]);
  const [topProducts, setTopProducts] = useState<{ producto: ProductOut; total_vendido: number }[]>([]);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStatsOut | null>(null);
  const [pendingSummary, setPendingSummary] = useState<InvoicePendingSummaryOut | null>(null);

  useEffect(() => {
    const now = new Date();
    const daysSinceSunday = now.getDay();
    const lastSunday = new Date(now.getTime() - daysSinceSunday * 86400000);
    const sixWeeksBefore = new Date(lastSunday.getTime() - 41 * 86400000);
    const fechaDesde = sixWeeksBefore.toISOString().slice(0, 10);
    const fechaHasta = lastSunday.toISOString().slice(0, 10);

    Promise.allSettled([
      api.getProducts({ page_size: 9999 }),
      api.getCategories(),
      api.getSuppliers(),
      api.getSalesSummary({ rango: "semanal", fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      api.getTopSellingProducts(5),
      api.getInvoiceStats(),
      api.getInvoicePendingSummary(),
    ]).then(([
      productsRes,
      categoriesRes,
      suppliersRes,
      salesSummaryRes,
      topProductsRes,
      invoiceStatsRes,
      pendingSummaryRes,
    ]) => {
      if (productsRes.status === "fulfilled") {
        setTotalProductos(productsRes.value.total);
        setSinStock(
          productsRes.value.items.filter(
            (p) => (p.stock_cajas * p.unidades_por_caja + p.stock_unidades) === 0
          ).length
        );
      }
      if (categoriesRes.status === "fulfilled") setTotalCategorias(categoriesRes.value.length);
      if (suppliersRes.status === "fulfilled") setTotalProveedores(suppliersRes.value.length);
      if (salesSummaryRes.status === "fulfilled") {
        const data = salesSummaryRes.value;
        setSalesSummary(data.slice(-5));
        if (data.length > 0) setVentasSemana(data[data.length - 1]);
      }
      if (topProductsRes.status === "fulfilled") setTopProducts(topProductsRes.value);
      if (invoiceStatsRes.status === "fulfilled") setInvoiceStats(invoiceStatsRes.value);
      if (pendingSummaryRes.status === "fulfilled") setPendingSummary(pendingSummaryRes.value);
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

  const pendingCount = (invoiceStats?.pendientes ?? 0) + (invoiceStats?.parciales ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-responsive-h1 text-text-main">Dashboard</h1>

      {/* Accesos Directos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          to="/sales/new"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-green-50 p-4 transition-all hover:border-green-300 hover:shadow-md"
        >
          <span className="rounded-lg bg-green-100 p-2 text-green-600">
            <ShoppingCart className="size-5" />
          </span>
          <span className="text-sm font-semibold text-green-800">Punto de Venta</span>
        </Link>
        <Link
          to="/products"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-4 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <span className="rounded-lg bg-brand-blue/10 p-2 text-brand-blue">
            <Package className="size-5" />
          </span>
          <span className="text-sm font-semibold text-text-main">Productos</span>
        </Link>
        <Link
          to="/invoices"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-4 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <span className="rounded-lg bg-brand-blue/10 p-2 text-brand-blue">
            <FileText className="size-5" />
          </span>
          <span className="text-sm font-semibold text-text-main">Facturas</span>
        </Link>
        <Link
          to="/sales"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-4 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <span className="rounded-lg bg-brand-blue/10 p-2 text-brand-blue">
            <Receipt className="size-5" />
          </span>
          <span className="text-sm font-semibold text-text-main">Ventas</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-12">
        <Link to="/products" className="block lg:col-span-2">
          <StatCard
            label="Productos"
            value={String(totalProductos)}
            icon={<Package className="size-5" />}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
        <Link to="/categories" className="block lg:col-span-2">
          <StatCard
            label="Categorías"
            value={String(totalCategorias)}
            icon={<ShoppingBag className="size-5" />}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
        <Link to="/suppliers" className="block lg:col-span-2">
          <StatCard
            label="Proveedores"
            value={String(totalProveedores)}
            icon={<Building2 className="size-5" />}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
        <Link to="/products?stock=agotado" className="block lg:col-span-2">
          <StatCard
            label="Sin stock"
            value={String(sinStock)}
            icon={<AlertTriangle className="size-5" />}
            variant={sinStock > 0 ? "danger" : "success"}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
        <Link to="/sales" className="block lg:col-span-4">
          <StatCard
            label="Ventas semanal"
            value={ventasSemana ? formatCurrency(ventasSemana.total_usd) : "—"}
            icon={<TrendingUp className="size-5" />}
            variant={ventasSemana ? "success" : "default"}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
      </div>

      {/* Facturas pendientes - ancho completo */}
      <Link to="/invoices?estado=PENDIENTE" className="block">
        <StatCard
          label={`Facturas pendientes — ${pendingCount} factura${pendingCount !== 1 ? "s" : ""} sin pagar`}
          value={pendingSummary ? formatCurrency(pendingSummary.total_pendiente_usd) : "$0.00"}
          icon={<FileText className="size-5" />}
          variant={pendingCount > 0 ? "warning" : "success"}
          className="cursor-pointer transition-shadow hover:shadow-md"
        />
      </Link>

      {/* Sales trend + Top products charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
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
    </div>
  );
}
