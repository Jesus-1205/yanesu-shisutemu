import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { Sale } from "../types";
import type { Column } from "@/ui-components/Table";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";
import { useToast } from "@/ui-components/Toast";
import { exportToExcel } from "@/lib/exportToExcel";
import { useSalesFiltersStore } from "../store/salesFiltersStore";

export const PAGE_SIZE = 20;
export const EXPORT_PAGE_SIZE = 200;

export const exportColumns: Column<Sale>[] = [
  {
    key: "fecha_venta",
    header: "Fecha",
    render: (s: Sale) => new Date(s.fecha_venta).toLocaleDateString("es-VE"),
  },
  {
    key: "total_usd",
    header: "Total USD",
    render: (s: Sale) => formatCurrency(s.total_usd),
    exportValue: (s: Sale) => Number(s.total_usd),
  },
  {
    key: "total_ves",
    header: "Total VES",
    render: (s: Sale) => formatCurrency(s.total_ves, "Bs "),
    exportValue: (s: Sale) => Number(s.total_ves),
  },
  {
    key: "metodo_pago",
    header: "Método de Pago",
    render: (s: Sale) => (s.metodo_pago ? s.metodo_pago.split(", ").map(formatPaymentMethodName).join(", ") : "-"),
  },
  {
    key: "tasa_bcv_aplicada",
    header: "Tasa BCV",
    render: (s: Sale) => formatRate(s.tasa_bcv_aplicada),
    exportValue: (s: Sale) => Number(s.tasa_bcv_aplicada),
  },
  {
    key: "items_count",
    header: "Items",
    render: (s: Sale) => s.items.length,
    exportValue: (s: Sale) => s.items.length,
  },
  {
    key: "usuario_nombre",
    header: "Vendedor",
    render: (s: Sale) => s.usuario_nombre,
  },
  {
    key: "observaciones",
    header: "Observaciones",
    render: (s: Sale) => s.observaciones || "",
  },
];

export function useSalesHistory() {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const fechaDesde = useSalesFiltersStore((s) => s.fechaDesde);
  const fechaHasta = useSalesFiltersStore((s) => s.fechaHasta);
  const horaDesde = useSalesFiltersStore((s) => s.horaDesde);
  const horaHasta = useSalesFiltersStore((s) => s.horaHasta);
  const metodoPagoIds = useSalesFiltersStore((s) => s.metodoPagoIds);
  const page = useSalesFiltersStore((s) => s.page);
  const setField = useSalesFiltersStore((s) => s.setField);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSalesPaginated({
        ...(fechaDesde && { fecha_desde: fechaDesde }),
        ...(fechaHasta && { fecha_hasta: fechaHasta }),
        ...(horaDesde && { hora_desde: horaDesde }),
        ...(horaHasta && { hora_hasta: horaHasta }),
        ...(metodoPagoIds.length > 0 && { metodo_pago_ids: metodoPagoIds }),
        page,
        page_size: PAGE_SIZE,
      });
      setSales(res.items);
      setTotalPages(res.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, horaDesde, horaHasta, metodoPagoIds, page]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleExportAll = useCallback(async () => {
    try {
      const allSales: Sale[] = [];
      let currentPage = 1;
      let pages = 1;
      do {
        const res = await api.getSalesPaginated({
          ...(fechaDesde && { fecha_desde: fechaDesde }),
          ...(fechaHasta && { fecha_hasta: fechaHasta }),
          ...(horaDesde && { hora_desde: horaDesde }),
          ...(horaHasta && { hora_hasta: horaHasta }),
          ...(metodoPagoIds.length > 0 && { metodo_pago_ids: metodoPagoIds }),
          page: currentPage,
          page_size: EXPORT_PAGE_SIZE,
        });
        allSales.push(...res.items);
        pages = res.pages;
        currentPage += 1;
      } while (currentPage <= pages);
      const name = exportToExcel({ data: allSales, columns: exportColumns, filename: "Ventas" });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar ventas", "error");
    }
  }, [fechaDesde, fechaHasta, horaDesde, horaHasta, metodoPagoIds, toast]);

  const handlePageChange = useCallback((newPage: number) => {
    setField("page", newPage);
  }, [setField]);

  return {
    sales,
    loading,
    error,
    page,
    totalPages,
    fetchSales,
    handleExportAll,
    handlePageChange,
  };
}
