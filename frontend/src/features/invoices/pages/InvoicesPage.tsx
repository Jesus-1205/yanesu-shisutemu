import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const PAGE_SIZE = 20;

const statusTabs = [
  { value: "", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "PARCIALMENTE_PAGADA", label: "Parciales" },
  { value: "PAGADA", label: "Pagadas" },
];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [stats, setStats] = useState<InvoiceStatsOut>({ pendientes: 0, parciales: 0, pagadas: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<string>("");
  const [estadoPago, setEstadoPago] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoices({
        proveedor_id: proveedorId ?? undefined,
        tipo_documento: tipoDocumento || undefined,
        estado_pago: estadoPago || undefined,
        search: search || undefined,
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
  }, [proveedorId, tipoDocumento, estadoPago, search, page]);

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
    setPage(newPage);
  };

  const clearAllFilters = () => {
    setSearch("");
    setProveedorId(null);
    setTipoDocumento("");
    setEstadoPago("");
    setPage(1);
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

  const hasActiveFilters = search || proveedorId || tipoDocumento || estadoPago;

  return (
    <div>
      <PageHeader
        title="Facturas de Proveedor"
        description="Registro de compras y facturas"
        actions={
          <Button variant="accent" onClick={() => navigate("/invoices/new")}>
            <Plus className="w-4 h-4" />
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
        onChange={(v) => { setEstadoPago(v); setPage(1); }}
        className="mb-4"
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-3">
        <div className="relative w-full sm:min-w-[200px] sm:flex-1 sm:max-w-xs">
          <SearchInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onClear={() => { setSearch(""); setPage(1); }}
            placeholder="Buscar factura..."
          />
        </div>
        <div className="w-full sm:w-56">
          <Combobox
            value={proveedorId}
            options={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
            onChange={(v) => { setProveedorId(v ? Number(v) : null); setPage(1); }}
            placeholder="Buscar proveedor..."
            allowClear
            clearLabel="Todos"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={tipoDocumento}
            onChange={(e) => { setTipoDocumento(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Todos los tipos" },
              { value: "FACTURA", label: "Factura" },
              { value: "NOTA_ENTREGA", label: "Nota de Entrega" },
            ]}
          />
        </div>
      </div>

      {/* Filtros activos */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-slate-500">Filtros activos:</span>
          {search && (
            <Badge variant="neutral" className="gap-1">
              &quot;{search}&quot;
              <button onClick={() => { setSearch(""); setPage(1); }} className="ml-1 hover:text-text-main cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {proveedorId && (
            <Badge variant="neutral" className="gap-1">
              {suppliers.find((s) => s.id === proveedorId)?.nombre}
              <button onClick={() => { setProveedorId(null); setPage(1); }} className="ml-1 hover:text-text-main cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {tipoDocumento && (
            <Badge variant="neutral" className="gap-1">
              {tipoDocumento === "FACTURA" ? "Factura" : "Nota de Entrega"}
              <button onClick={() => { setTipoDocumento(""); setPage(1); }} className="ml-1 hover:text-text-main cursor-pointer">
                <X className="w-3 h-3" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {invoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onView={() => navigate(`/invoices/${inv.id}`)}
                onPay={inv.estado_pago !== "PAGADA" ? () => navigate(`/invoices/${inv.id}?action=pay`) : undefined}
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
