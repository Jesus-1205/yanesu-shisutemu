import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { Invoice, InvoiceStatsOut } from "../types";
import { useInvoiceFiltersStore } from "../store/invoiceFiltersStore";

const PAGE_SIZE = 20;

const baseStatusTabs = [
  { value: "", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "PARCIALMENTE_PAGADA", label: "Parciales" },
  { value: "PAGADA", label: "Pagadas" },
];

export interface UseInvoicesListReturn {
  invoices: Invoice[];
  stats: InvoiceStatsOut;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  estadoPago: string;
  tabsWithCounts: Array<{ value: string; label: string; badge: number }>;
  fetchInvoices: () => Promise<void>;
  handlePageChange: (newPage: number) => void;
  handleTabChange: (val: string) => void;
}

export function useInvoicesList(): UseInvoicesListReturn {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStatsOut>({
    pendientes: 0,
    parciales: 0,
    pagadas: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const search = useInvoiceFiltersStore((s) => s.search);
  const proveedorId = useInvoiceFiltersStore((s) => s.proveedorId);
  const tipoDocumento = useInvoiceFiltersStore((s) => s.tipoDocumento);
  const estadoPago = useInvoiceFiltersStore((s) => s.estadoPago);
  const sortBy = useInvoiceFiltersStore((s) => s.sortBy);
  const fechaDesde = useInvoiceFiltersStore((s) => s.fechaDesde);
  const fechaHasta = useInvoiceFiltersStore((s) => s.fechaHasta);
  const page = useInvoiceFiltersStore((s) => s.page);
  const setField = useInvoiceFiltersStore((s) => s.setField);

  useEffect(() => {
    const estadoParam = searchParams.get("estado");
    if (
      estadoParam &&
      ["PENDIENTE", "PARCIALMENTE_PAGADA", "PAGADA"].includes(estadoParam)
    ) {
      setField("estadoPago", estadoParam);
    }
  }, []); 

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoices({
        proveedor_id: proveedorId ?? undefined,
        tipo_documento: tipoDocumento || undefined,
        estado_pago: estadoPago || undefined,
        search: search || undefined,
        sort_by: sortBy || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setInvoices(data.items);
      setTotalPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }, [
    proveedorId,
    tipoDocumento,
    estadoPago,
    search,
    sortBy,
    fechaDesde,
    fechaHasta,
    page,
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getInvoiceStats();
      setStats(data);
    } catch {
      // Silenciar error de stats
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setField("page", newPage);
    },
    [setField],
  );

  const handleTabChange = useCallback(
    (val: string) => {
      setField("estadoPago", val);
      setField("page", 1);
    },
    [setField],
  );

  const tabsWithCounts = useMemo(
    () =>
      baseStatusTabs.map((tab) => ({
        ...tab,
        badge:
          tab.value === ""
            ? stats.total
            : tab.value === "PENDIENTE"
              ? stats.pendientes
              : tab.value === "PARCIALMENTE_PAGADA"
                ? stats.parciales
                : stats.pagadas,
      })),
    [stats],
  );

  return {
    invoices,
    stats,
    loading,
    error,
    page,
    totalPages,
    estadoPago,
    tabsWithCounts,
    fetchInvoices,
    handlePageChange,
    handleTabChange,
  };
}
