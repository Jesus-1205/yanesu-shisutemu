import { Building2, TrendingUp, Receipt } from "lucide-react";
import type { SupplierAnalyticsResponse } from "@/types/api";

interface SupplierMicroKPIsProps {
  data: SupplierAnalyticsResponse | null;
  loading: boolean;
}

export default function SupplierMicroKPIs({ data, loading }: SupplierMicroKPIsProps) {
  if (loading || !data) {
    return (
      <div className="mb-6 grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-5">
            <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
            <div className="h-7 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  const principal = data.proveedores.length > 0
    ? data.proveedores.reduce((a, b) => a.ingresos_usd > b.ingresos_usd ? a : b)
    : null;

  const totalFacturas = data.total_proveedores;

  return (
    <div className="mb-6 grid grid-cols-1 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-slate-200">
      <div className="flex items-center gap-4 p-5 transition-colors hover:bg-slate-50/50">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Proveedor Principal</p>
          <p className="truncate text-xl font-bold text-slate-900 sm:text-2xl" title={principal ? principal.nombre : undefined}>
            {principal ? principal.nombre : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-5 transition-colors hover:bg-slate-50/50">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <TrendingUp className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Compras Totales</p>
          <p className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
            {String(data.total_productos)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-5 transition-colors hover:bg-slate-50/50">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Receipt className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Total Proveedores</p>
          <p className="text-xl font-bold text-slate-900 sm:text-2xl">
            {String(totalFacturas)}
          </p>
        </div>
      </div>
    </div>
  );
}
