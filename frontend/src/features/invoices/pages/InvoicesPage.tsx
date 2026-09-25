import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Pagination from "@/ui-components/Pagination";
import Spinner from "@/ui-components/Spinner";
import EmptyState from "@/ui-components/EmptyState";
import Tabs from "@/ui-components/Tabs";
import InvoiceCard from "../components/InvoiceCard";
import InvoiceFilters from "../components/InvoiceFilters";
import { useInvoicesList } from "../hooks/useInvoicesList";
import { useInvoiceSuppliers } from "../hooks/useInvoiceSuppliers";

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { suppliers } = useInvoiceSuppliers();
  const {
    invoices,
    loading,
    error,
    page,
    totalPages,
    estadoPago,
    tabsWithCounts,
    fetchInvoices,
    handlePageChange,
    handleTabChange,
  } = useInvoicesList();

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
        onChange={handleTabChange}
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
                onPay={
                  inv.estado_pago !== "PAGADA"
                    ? () => navigate(`/invoices/${inv.id}/pay`)
                    : undefined
                }
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
