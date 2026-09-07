import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { api } from "@/services/api";
import type { Invoice, InvoiceStatsOut } from "../types";
import type { SupplierOut } from "@/types/api";
import Button from "@/ui-components/Button";
import Combobox from "@/ui-components/Combobox";
import Select from "@/ui-components/Select";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Pagination from "@/ui-components/Pagination";
import SearchInput from "@/ui-components/SearchInput";
import Spinner from "@/ui-components/Spinner";
import EmptyState from "@/ui-components/EmptyState";
import Badge from "@/ui-components/Badge";
import Tabs from "@/ui-components/Tabs";
import InvoiceCard from "../components/InvoiceCard";
import { useInvoiceFiltersStore } from "../store/invoiceFiltersStore";

const PAGE_SIZE = 20;

const statusTabs = [
  { value: "", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "PARCIALMENTE_PAGADA", label: "Parciales" },
  { value: "PAGADA", label: "Pagadas" },
];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [stats, setStats] = useState<InvoiceStatsOut>({ pendientes: 0, parciales: 0, pagadas: 0, total: 0 });
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
  const clearAll = useInvoiceFiltersStore((s) => s.clearAll);

  useEffect(() => {
    const estadoParam = searchParams.get("estado");
    if (estadoParam && ["PENDIENTE", "PARCIALMENTE_PAGADA", "PAGADA"].includes(estadoParam)) {
      setField("estadoPago", estadoParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [proveedorId, tipoDocumento, estadoPago, search, sortBy, fechaDesde, fechaHasta, page]);

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

  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  const handlePageChange = (newPage: number) => {
    setField("page", newPage);
  };

  const clearAllFilters = () => {
    clearAll();
  };

  const tabsWithCounts = statusTabs.map((tab) => ({
    ...tab,
    badge: tab.value === ""
      ? stats.total
      : tab.value === "PENDIENTE"
        ? stats.pendientes
        : tab.value === "PARCIALMENTE_PAGADA"
          ? stats.parciales
          : stats.pagadas,
  }));

  const hasActiveFilters = search || proveedorId || tipoDocumento || estadoPago || fechaDesde || fechaHasta;

  return (
    <div>
      <PageHeader
        title="Facturas de Proveedor"
        description="Registro de compras y facturas"
        actions={
          <Button variant="accent" onClick={() => navigate("/invoices/new")}>
            <Plus className="size-4" />
            Nueva Factura
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchInvoices}>{error}</ErrorBanner>
        </div>
      )}

      {/* Tabs de estado */}
      <Tabs
        tabs={tabsWithCounts}
        value={estadoPago}
        onChange={(v) => { setField("estadoPago", v); setField("page", 1); }}
        className="mb-4"
      />

      {/* Filtros - Fila 1 */}
      <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs sm:min-w-50 sm:flex-1">
          <SearchInput
            value={search}
            onChange={(e) => { setField("search", e.target.value); setField("page", 1); }}
            onClear={() => { setField("search", ""); setField("page", 1); }}
            placeholder="Buscar factura..."
          />
        </div>
        <div className="w-full sm:w-56">
          <Combobox
            value={proveedorId}
            options={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
            onChange={(v) => { setField("proveedorId", v ? Number(v) : null); setField("page", 1); }}
            placeholder="Buscar proveedor..."
            allowClear
            clearLabel="Todos"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={tipoDocumento}
            onChange={(e) => { setField("tipoDocumento", e.target.value); setField("page", 1); }}
            options={[
              { value: "", label: "Todos los tipos" },
              { value: "FACTURA", label: "Factura" },
              { value: "NOTA_ENTREGA", label: "Nota de Entrega" },
            ]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={sortBy}
            onChange={(e) => { setField("sortBy", e.target.value); setField("page", 1); }}
            options={[
              { value: "", label: "Fecha" },
              { value: "fecha_limite_pago", label: "Por vencer" },
              { value: "precio_desc", label: "Mayor a menor precio" },
              { value: "precio_asc", label: "Menor a mayor precio" },
            ]}
          />
        </div>
      </div>

      {/* Filtros - Fila 2: fechas */}
      <div className="mb-3 flex items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setField("fechaDesde", e.target.value); setField("page", 1); }}
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setField("fechaHasta", e.target.value); setField("page", 1); }}
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        {(fechaDesde || fechaHasta) && (
          <Button variant="ghost" size="sm" onClick={() => { setField("fechaDesde", ""); setField("fechaHasta", ""); setField("page", 1); }}>
            Limpiar fechas
          </Button>
        )}
      </div>

      {/* Filtros activos */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Filtros activos:</span>
          {search && (
            <Badge variant="neutral" className="gap-1">
              &quot;{search}&quot;
              <button onClick={() => { setField("search", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {proveedorId && (
            <Badge variant="neutral" className="gap-1">
              {suppliers.find((s) => s.id === proveedorId)?.nombre}
              <button onClick={() => { setField("proveedorId", null); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {tipoDocumento && (
            <Badge variant="neutral" className="gap-1">
              {tipoDocumento === "FACTURA" ? "Factura" : "Nota de Entrega"}
              <button onClick={() => { setField("tipoDocumento", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {fechaDesde && (
            <Badge variant="neutral" className="gap-1">
              Desde: {fechaDesde}
              <button onClick={() => { setField("fechaDesde", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {fechaHasta && (
            <Badge variant="neutral" className="gap-1">
              Hasta: {fechaHasta}
              <button onClick={() => { setField("fechaHasta", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Limpiar todo
          </Button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No hay facturas"
          description="Registra tu primera factura de proveedor"
          actionLabel="Nueva Factura"
          onAction={() => navigate("/invoices/new")}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {invoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onView={() => navigate(`/invoices/${inv.id}`)}
                onPay={inv.estado_pago !== "PAGADA" ? () => navigate(`/invoices/${inv.id}/pay`) : undefined}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}
