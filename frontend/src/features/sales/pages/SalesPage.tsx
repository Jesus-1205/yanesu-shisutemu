import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Download } from "lucide-react";
import { api } from "@/services/api";
import type { Sale } from "../types";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/ui-components/Toast";
import { exportToExcel } from "@/lib/exportToExcel";
import type { PaymentMethodOut } from "@/types/api";

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
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [horaDesde, setHoraDesde] = useState("");
  const [horaHasta, setHoraHasta] = useState("");
  const [metodoPagoIds, setMetodoPagoIds] = useState<number[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  useEffect(() => {
    api.getPaymentMethods(true).then(setPaymentMethods).catch(() => {});
  }, []);

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const handleMetodoPagoChange = (ids: number[]) => {
    setMetodoPagoIds(ids);
    setPage(1);
  };

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
      render: (s: Sale) => s.metodo_pago ? s.metodo_pago.split(", ").map(formatPaymentMethodName).join(", ") : "-",
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
    <div>
      <PageHeader
        title="Ventas"
        description="Historial de ventas del sistema"
        actions={
          <Button variant="accent" onClick={() => navigate("/sales/new")}>
            <Plus className="size-4" />
            Nueva Venta
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchSales}>
            {error}
          </ErrorBanner>
        </div>
      )}

      {isOperator ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <Calendar className="size-4" />
          Mostrando ventas del día de hoy
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => handleFilterChange(setFechaDesde)(e.target.value)}
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => handleFilterChange(setFechaHasta)(e.target.value)}
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Hora desde</label>
            <input
              type="time"
              value={horaDesde}
              onChange={(e) => handleFilterChange(setHoraDesde)(e.target.value)}
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Hora hasta</label>
            <input
              type="time"
              value={horaHasta}
              onChange={(e) => handleFilterChange(setHoraHasta)(e.target.value)}
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              autoComplete="off"
            />
          </div>
          <MultiSelectTags
            label="Método de pago"
            selected={metodoPagoIds}
            options={paymentMethods.map((m) => ({ value: m.id, label: m.nombre }))}
            onChange={handleMetodoPagoChange}
            placeholder="Todos"
            className="min-w-50"
          />
          {(fechaDesde || fechaHasta || horaDesde || horaHasta || metodoPagoIds.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFechaDesde(""); setFechaHasta(""); setHoraDesde(""); setHoraHasta(""); setMetodoPagoIds([]); setPage(1); }}
            >
              Limpiar
            </Button>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" onClick={handleExportAll}>
          <Download className="size-4" />
          Descargar Excel
        </Button>
      </div>

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
            render: (s: Sale) => formatCurrency(s.total_usd),
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
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
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
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
    </div>
  );
}
