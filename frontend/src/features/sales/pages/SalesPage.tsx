import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import { api } from "@/services/api";
import type { Sale } from "../types";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/ui-components/Toast";
import { exportToExcel } from "@/lib/exportToExcel";
import { useSalesFiltersStore } from "../store/salesFiltersStore";
import SalesFilters from "../components/SalesFilters";
import OperatorSalesNotice from "../components/OperatorSalesNotice";

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 200;

export default function SalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
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

  const exportColumns: Column<Sale>[] = [
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

  const handleExportAll = async () => {
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
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas"
        description="Historial de ventas del sistema"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="size-4" />
              Descargar Excel
            </Button>
            <Button variant="accent" onClick={() => navigate("/sales/new")}>
              <Plus className="size-4" />
              Nueva Venta
            </Button>
          </div>
        }
      />

      {error && (
        <ErrorBanner onRetry={fetchSales}>
          {error}
        </ErrorBanner>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {isOperator ? <OperatorSalesNotice /> : <SalesFilters />}

        <Table
          columns={[
            {
              key: "fecha_venta",
              header: "Fecha",
              render: (s: Sale) => new Date(s.fecha_venta).toLocaleDateString("es-VE"),
            },
            {
              key: "total_usd",
              header: "Total USD",
              render: (s: Sale) => (
                <span className="font-semibold text-slate-900">{formatCurrency(s.total_usd)}</span>
              ),
            },
            {
              key: "total_ves",
              header: "Total VES",
              hideOnMobile: true,
              render: (s: Sale) => formatCurrency(s.total_ves, "Bs "),
            },
            {
              key: "metodo_pago",
              header: "Método de Pago",
              hideOnMobile: true,
              render: (s: Sale) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {s.metodo_pago ? s.metodo_pago.split(", ").map(formatPaymentMethodName).join(", ") : "-"}
                </span>
              ),
            },
            {
              key: "tasa_bcv_aplicada",
              header: "Tasa BCV",
              hideOnMobile: true,
              render: (s: Sale) => formatRate(s.tasa_bcv_aplicada),
            },
            {
              key: "items",
              header: "Items",
              render: (s: Sale) => s.items.length,
            },
            {
              key: "acciones",
              header: "",
              render: (s: Sale) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/sales/${s.id}`)}
                >
                  Ver
                </Button>
              ),
            },
          ]}
          data={sales}
          keyExtractor={(s) => s.id}
          loading={loading}
          emptyMessage="No hay ventas registradas"
          className="!rounded-none !border-0 !shadow-none"
        />

        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setField("page", p)} />
        </div>
      </div>
    </div>
  );
}
