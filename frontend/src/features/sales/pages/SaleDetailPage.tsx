import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import SaleSummaryCards from "../components/SaleSummaryCards";
import SaleDetailItemsTable from "../components/SaleDetailItemsTable";
import SaleDetailPaymentsTable from "../components/SaleDetailPaymentsTable";
import SaleFiscalSummary from "../components/SaleFiscalSummary";
import { useSaleDetail } from "../hooks/useSaleDetail";

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sale, loading } = useSaleDetail(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="py-20 text-center text-slate-500">
        Venta no encontrada
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate("/sales")}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </div>

      <PageHeader
        title={`Venta #${sale.id}`}
        description={new Date(sale.fecha_venta).toLocaleString("es-VE")}
      />

      <SaleSummaryCards sale={sale} />

      {sale.observaciones && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-xs font-semibold text-amber-700">Observaciones</p>
          <p className="text-sm text-amber-900">{sale.observaciones}</p>
        </div>
      )}

      <SaleDetailItemsTable items={sale.items} />

      <SaleDetailPaymentsTable pagos={sale.pagos} />

      <SaleFiscalSummary sale={sale} />
    </div>
  );
}
