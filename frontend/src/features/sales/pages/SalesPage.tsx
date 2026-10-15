import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import SalesKpiCards from "../components/SalesKpiCards";
import SalesFilters from "../components/SalesFilters";
import OperatorSalesNotice from "../components/OperatorSalesNotice";
import SalesTable from "../components/SalesTable";
import { useSalesHistory, PAGE_SIZE } from "../hooks/useSalesHistory";

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
    totalSales,
    totals,
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

      {/* Tarjetas KPI Superiores */}
      <SalesKpiCards totals={totals} loading={loading} />

      {/* Contenedor de Filtros y Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {isOperator ? <OperatorSalesNotice /> : <SalesFilters />}

        <SalesTable
          sales={sales}
          loading={loading}
          totalRows={totalSales}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          onViewSale={(id) => navigate(`/sales/${id}`)}
        />
      </div>
    </div>
  );
}
