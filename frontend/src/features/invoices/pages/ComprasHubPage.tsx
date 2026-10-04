import { useNavigate } from "react-router-dom";
import { Plus, Building2 } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useComprasHubData } from "../hooks/useComprasHubData";
import ComprasHubStats from "../components/ComprasHubStats";
import ComprasHubPendingInvoices from "../components/ComprasHubPendingInvoices";
import ComprasHubTopSuppliers from "../components/ComprasHubTopSuppliers";

export default function ComprasHubPage() {
  const navigate = useNavigate();
  const {
    pending,
    stats,
    invoicesByDue,
    upcomingDueCount,
    topSuppliers,
    loading,
    error,
  } = useComprasHubData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Compras"
        description="Resumen de facturas y proveedores"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/suppliers")}>
              <Building2 className="size-4" />
              Ver Proveedores
            </Button>
            <Button variant="accent" onClick={() => navigate("/invoices/new")}>
              <Plus className="size-4" />
              Nueva Factura
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <ComprasHubStats
        pending={pending}
        stats={stats}
        upcomingDueCount={upcomingDueCount}
      />

      {/* Facturas Próximas a Vencer */}
      <ComprasHubPendingInvoices
        invoices={invoicesByDue}
        onViewAll={() => navigate("/invoices")}
        onViewInvoice={(id) => navigate(`/invoices/${id}`)}
        onPayInvoice={(id) => navigate(`/invoices/${id}/pay`)}
      />

      {/* Top Proveedores */}
      <ComprasHubTopSuppliers
        suppliers={topSuppliers}
        onViewAll={() => navigate("/suppliers")}
        onSelectSupplier={(supplierId) => navigate(`/suppliers?open=${supplierId}`)}
      />
    </>
  );
}
