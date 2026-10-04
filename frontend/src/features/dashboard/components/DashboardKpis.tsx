import { Link } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  Building2,
  AlertTriangle,
  TrendingUp,
  FileText,
} from "lucide-react";
import type { DashboardStatsOut, SalesSummaryItem, InvoicePendingSummaryOut } from "@/types/api";
import StatCard from "@/ui-components/StatCard";
import { formatCurrency } from "@/lib/utils";

interface DashboardKpisProps {
  stats: DashboardStatsOut | null;
  ventasSemana: SalesSummaryItem | null;
  pendingSummary: InvoicePendingSummaryOut | null;
  pendingCount: number;
}

export default function DashboardKpis({
  stats,
  ventasSemana,
  pendingSummary,
  pendingCount,
}: DashboardKpisProps) {
  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-12">
        <Link to="/products" className="block lg:col-span-2">
          <StatCard
            label="Productos"
            value={String(stats?.total_productos ?? 0)}
            icon={<Package className="size-5" />}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
        <Link to="/categories" className="block lg:col-span-2">
          <StatCard
            label="Categorías"
            value={String(stats?.total_categorias ?? 0)}
            icon={<ShoppingBag className="size-5" />}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
        <Link to="/suppliers" className="block lg:col-span-2">
          <StatCard
            label="Proveedores"
            value={String(stats?.total_proveedores ?? 0)}
            icon={<Building2 className="size-5" />}
            className="cursor-pointer transition-shadow hover:shadow-md"
          />
        </Link>
        <Link to="/products?stock=agotado" className="block lg:col-span-2">
          <StatCard
            label="Sin stock"
            value={String(stats?.sin_stock ?? 0)}
            icon={<AlertTriangle className="size-5" />}
            variant={(stats?.sin_stock ?? 0) > 0 ? "danger" : "success"}
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
    </>
  );
}
