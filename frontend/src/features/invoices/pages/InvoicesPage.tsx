import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "@/services/api";
import type { Invoice, InvoiceStatsOut } from "../types";
import type { SupplierOut } from "@/types/api";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Pagination from "@/ui-components/Pagination";
import Spinner from "@/ui-components/Spinner";
import EmptyState from "@/ui-components/EmptyState";
import Tabs from "@/ui-components/Tabs";
import InvoiceCard from "../components/InvoiceCard";
import InvoiceFilters from "../components/InvoiceFilters";
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

      <InvoiceFilters suppliers={suppliers} />

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
