import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowRight,
  DollarSign,
  CheckCircle,
  Clock,
  Building2,
  Trophy,
} from "lucide-react";
import { api } from "@/services/api";
import type { FacturaOut } from "@/types/api";
import type { InvoiceStatsOut, InvoicePendingSummaryOut, TopSupplier } from "@/types/api";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import StatCard from "@/ui-components/StatCard";
import Spinner from "@/ui-components/Spinner";
import InvoiceCard from "../components/InvoiceCard";

const NEARBY_INVOICES_LIMIT = 5;
const DAYS_AHEAD = 7;

function getDaysUntil(dateStr: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(dateStr);
  fecha.setHours(0, 0, 0, 0);
  return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ComprasHubPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<InvoicePendingSummaryOut | null>(null);
  const [stats, setStats] = useState<InvoiceStatsOut | null>(null);
  const [nearbyInvoices, setNearbyInvoices] = useState<FacturaOut[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, statsRes, invoicesRes, suppliersRes] = await Promise.all([
        api.getInvoicePendingSummary(),
        api.getInvoiceStats(),
        api.getInvoices({
          sort_by: "fecha_limite_pago",
          estado_pago: "PENDIENTE",
          page_size: NEARBY_INVOICES_LIMIT,
          page: 1,
        }),
        api.getTopSuppliers(),
      ]);
      setPending(pendingRes);
      setStats(statsRes);
      setNearbyInvoices(invoicesRes.items);
      setTopSuppliers(suppliersRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos de compras");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const invoicesByDue = nearbyInvoices
    .filter((inv) => inv.fecha_limite_pago && inv.estado_pago !== "PAGADA")
    .sort((a, b) => {
      const da = getDaysUntil(a.fecha_limite_pago!);
      const db = getDaysUntil(b.fecha_limite_pago!);
      return da - db;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Resumen de facturas y proveedores"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/suppliers")}>
              <Building2 className="size-4" />
              Ver Proveedores
            </Button>
            <Button variant="accent" onClick={() => navigate("/invoices/new")}>
              <Plus className="size-4" />
              Nueva Factura
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pendiente (USD)"
          value={`$${(pending?.total_pendiente_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="size-5" />}
          variant={pending && pending.total_pendiente_usd > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Facturas Pagadas"
          value={String(stats?.pagadas ?? 0)}
          icon={<CheckCircle className="size-5" />}
          variant="success"
        />
        <StatCard
          label="Por Vencer (7 días)"
          value={String(
            nearbyInvoices.filter(
              (inv) =>
                inv.fecha_limite_pago &&
                inv.estado_pago !== "PAGADA" &&
                getDaysUntil(inv.fecha_limite_pago) >= 0 &&
                getDaysUntil(inv.fecha_limite_pago) <= DAYS_AHEAD,
            ).length,
          )}
          icon={<Clock className="size-5" />}
          variant="info"
        />
        <StatCard
          label="Proveedores"
          value={String(stats?.total ?? 0)}
          icon={<Building2 className="size-5" />}
          variant="default"
        />
      </div>

      {/* Facturas Próximas a Vencer */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">Facturas Próximas a Vencer</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
            Ver todas
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
        {invoicesByDue.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-surface p-8 text-center">
            <p className="text-sm text-slate-500">No hay facturas pendientes por vencer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {invoicesByDue.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onView={() => navigate(`/invoices/${inv.id}`)}
                onPay={
                  inv.estado_pago !== "PAGADA"
                    ? () => navigate(`/invoices/${inv.id}/pay`)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Top Proveedores */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">Top Proveedores</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/suppliers")}>
            Ver todos
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
        {topSuppliers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-surface p-8 text-center">
            <p className="text-sm text-slate-500">No hay proveedores con compras registradas</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-12 px-4 py-3 text-left font-medium text-slate-600">#</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Proveedor</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Compras</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((s, idx) => (
                  <tr
                    key={s.supplier_id}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                    onClick={() => navigate(`/suppliers?open=${s.supplier_id}`)}
                  >
                    <td className="px-4 py-3">
                      {idx === 0 ? (
                        <Trophy className="size-4 text-amber-500" />
                      ) : (
                        <span className="font-mono text-xs text-slate-400">{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-main">{s.supplier_name}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{s.invoice_count}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        Ver
                        <ArrowRight className="ml-1 size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
