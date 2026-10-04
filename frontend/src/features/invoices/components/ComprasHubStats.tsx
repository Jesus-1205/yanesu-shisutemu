import React from "react";
import { DollarSign, CheckCircle, Clock, Building2 } from "lucide-react";
import StatCard from "@/ui-components/StatCard";
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
  const totalPendiente = (pending?.total_pendiente_usd ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Pendiente (USD)"
        value={`$${totalPendiente}`}
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
        value={String(upcomingDueCount)}
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
  );
};

export default ComprasHubStats;
