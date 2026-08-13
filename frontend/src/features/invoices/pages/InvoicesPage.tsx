import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye } from "lucide-react";
import { api } from "@/services/api";
import type { Invoice } from "../types";
import type { SupplierOut } from "@/types/api";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import Select from "@/ui-components/Select";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Pagination from "@/ui-components/Pagination";
import SearchInput from "@/ui-components/SearchInput";
import Spinner from "@/ui-components/Spinner";
import EmptyState from "@/ui-components/EmptyState";
import Badge from "@/ui-components/Badge";
import { formatBs, formatUsd } from "@/lib/text";

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoices({
        proveedor_id: proveedorId ?? undefined,
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
  }, [proveedorId, search, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

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

      <div className="flex items-center gap-3 mb-4">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <SearchInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onClear={() => { setSearch(""); setPage(1); }}
            placeholder="Buscar factura..."
          />
        </div>
        <div className="w-56">
          <Select
            value={proveedorId ?? ""}
            onChange={(e) => { setProveedorId(e.target.value ? Number(e.target.value) : null); setPage(1); }}
            options={[
              { value: "", label: "Todos los proveedores" },
              ...suppliers.map((s) => ({ value: String(s.id), label: s.nombre })),
            ]}
          />
        </div>
      </div>

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
          <Table
            columns={[
              { key: "numero_factura", header: "Factura" },
              {
                key: "supplier",
                header: "Proveedor",
                render: (inv: Invoice) => inv.supplier?.nombre || "—",
              },
              {
                key: "fecha_factura",
                header: "Fecha",
                render: (inv: Invoice) => new Date(inv.fecha_factura).toLocaleDateString("es-VE"),
              },
              {
                key: "moneda_principal",
                header: "Moneda",
                render: (inv: Invoice) => (
                  <Badge variant={inv.moneda_principal === "USD" ? "info" : "warning"}>
                    {inv.moneda_principal}
                  </Badge>
                ),
              },
              {
                key: "total_usd",
                header: "Total USD",
                render: (inv: Invoice) => (
                  <span className="font-mono tabular-nums">{formatUsd(Number(inv.total_usd))}</span>
                ),
              },
              {
                key: "total_bs",
                header: "Total Bs.",
                render: (inv: Invoice) => (
                  <span className="font-mono tabular-nums">Bs. {formatBs(Number(inv.total_bs))}</span>
                ),
              },
              {
                key: "acciones",
                header: "Acciones",
                exportable: false,
                render: (inv: Invoice) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                ),
              },
            ]}
            data={invoices}
            keyExtractor={(inv) => inv.id}
            loading={false}
            emptyMessage="No hay facturas registradas"
          />
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
