import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { FacturaOut, InvoicePendingSummaryOut, InvoiceStatsOut, TopSupplier } from "@/types/api";

export const NEARBY_INVOICES_LIMIT = 5;
export const DAYS_AHEAD = 7;

export function getDaysUntil(dateStr: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cleanDate = dateStr.split("T")[0];
  const [y, m, d] = cleanDate.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  fecha.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export interface UseComprasHubDataReturn {
  pending: InvoicePendingSummaryOut | null;
  stats: InvoiceStatsOut | null;
  nearbyInvoices: FacturaOut[];
  invoicesByDue: FacturaOut[];
  upcomingDueCount: number;
  topSuppliers: TopSupplier[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useComprasHubData(): UseComprasHubDataReturn {
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

  const invoicesByDue = useMemo(() => {
    return nearbyInvoices
      .filter((inv) => inv.fecha_limite_pago && inv.estado_pago !== "PAGADA")
      .sort((a, b) => {
        const da = getDaysUntil(a.fecha_limite_pago!);
        const db = getDaysUntil(b.fecha_limite_pago!);
        return da - db;
      });
  }, [nearbyInvoices]);

  const upcomingDueCount = useMemo(() => {
    return nearbyInvoices.filter(
      (inv) =>
        inv.fecha_limite_pago &&
        inv.estado_pago !== "PAGADA" &&
        getDaysUntil(inv.fecha_limite_pago) >= 0 &&
        getDaysUntil(inv.fecha_limite_pago) <= DAYS_AHEAD,
    ).length;
  }, [nearbyInvoices]);

  return {
    pending,
    stats,
    nearbyInvoices,
    invoicesByDue,
    upcomingDueCount,
    topSuppliers,
    loading,
    error,
    refetch: fetchAll,
  };
}
