import React from "react";
import { DollarSign, CheckCircle2, Clock, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceStatsOut, InvoicePendingSummaryOut } from "@/types/api";

export interface ComprasHubStatsProps {
  pending: InvoicePendingSummaryOut | null;
  stats: InvoiceStatsOut | null;
  upcomingDueCount: number;
}

export const ComprasHubStats: React.FC<ComprasHubStatsProps> = ({
  pending,
  stats,
  upcomingDueCount,
}) => {
  const isPendingAlert = (pending?.total_pendiente_usd ?? 0) > 0;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Pendiente */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Pendiente (USD)
          </span>
          <div
            className={`rounded-lg p-2 ${
              isPendingAlert ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <DollarSign className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(pending?.total_pendiente_usd ?? 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Saldo por pagar a proveedores</p>
        </div>
      </div>

      {/* Facturas Pagadas */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Facturas Pagadas
          </span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {stats?.pagadas ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Comprobantes liquidados</p>
        </div>
      </div>

      {/* Por Vencer (7 días) */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Por Vencer (7 días)
          </span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
            <Clock className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {upcomingDueCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Vencimiento próximo</p>
        </div>
      </div>

      {/* Proveedores */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Proveedores
          </span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <Building2 className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {stats?.total ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Registrados con compras</p>
        </div>
      </div>
    </div>
  );
};

export default ComprasHubStats;
