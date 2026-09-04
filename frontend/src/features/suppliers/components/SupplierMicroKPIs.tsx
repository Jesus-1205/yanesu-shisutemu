import { Building2, TrendingUp, Receipt } from "lucide-react";
import StatCard from "@/ui-components/StatCard";
import type { SupplierAnalyticsResponse } from "@/types/api";

interface SupplierMicroKPIsProps {
  data: SupplierAnalyticsResponse | null;
  loading: boolean;
}

export default function SupplierMicroKPIs({ data, loading }: SupplierMicroKPIsProps) {
  if (loading || !data) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-surface p-5">
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
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Proveedor Principal"
        value={principal ? principal.nombre : "—"}
        icon={<Building2 className="size-5" />}
        variant="info"
      />
      <StatCard
        label="Compras Totales"
        value={String(data.total_productos)}
        icon={<TrendingUp className="size-5" />}
        variant="success"
      />
      <StatCard
        label="Total Proveedores"
        value={String(totalFacturas)}
        icon={<Receipt className="size-5" />}
      />
    </div>
  );
}
