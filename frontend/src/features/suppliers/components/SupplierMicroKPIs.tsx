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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-surface p-5 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
            <div className="h-7 bg-slate-200 rounded w-20" />
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard
        label="Proveedor Principal"
        value={principal ? principal.nombre : "—"}
        icon={<Building2 className="w-5 h-5" />}
        variant="info"
      />
      <StatCard
        label="Compras Totales"
        value={String(data.total_productos)}
        icon={<TrendingUp className="w-5 h-5" />}
        variant="success"
      />
      <StatCard
        label="Total Proveedores"
        value={String(totalFacturas)}
        icon={<Receipt className="w-5 h-5" />}
      />
    </div>
  );
}
