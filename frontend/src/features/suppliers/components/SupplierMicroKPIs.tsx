import { Building2, TrendingUp, Receipt } from "lucide-react";
import type { SupplierSummaryResponse } from "@/types/api";

interface SupplierMicroKPIsProps {
  data: SupplierSummaryResponse | null;
  loading: boolean;
}

export default function SupplierMicroKPIs({ data, loading }: SupplierMicroKPIsProps) {
  if (loading || !data) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 shrink-0 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-6 w-20 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const principalNombre = data.proveedor_principal_nombre || null;
  const totalFacturas = data.total_proveedores;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* KPI 1: Proveedor Principal */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Proveedor Principal
          </p>
          <p
            className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            title={principalNombre ?? undefined}
          >
            {principalNombre || "—"}
          </p>
        </div>
      </div>

      {/* KPI 2: Compras Totales */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
          <TrendingUp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Compras Totales
          </p>
          <p className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {String(data.total_productos)}
          </p>
        </div>
      </div>

      {/* KPI 3: Total Proveedores */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105">
          <Receipt className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Total Proveedores
          </p>
          <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {String(totalFacturas)}
          </p>
        </div>
      </div>
    </div>
  );
}
