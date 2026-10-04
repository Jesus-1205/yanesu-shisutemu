import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import SalesFilters from "../components/SalesFilters";
import OperatorSalesNotice from "../components/OperatorSalesNotice";
import SalesTable from "../components/SalesTable";
import { useSalesHistory } from "../hooks/useSalesHistory";

export default function SalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const {
    sales,
    loading,
    error,
    page,
    totalPages,
    fetchSales,
    handleExportAll,
    handlePageChange,
  } = useSalesHistory();

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

        <SalesTable
          sales={sales}
          loading={loading}
          onViewSale={(id) => navigate(`/sales/${id}`)}
        />

        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </div>
    </div>
  );
}
