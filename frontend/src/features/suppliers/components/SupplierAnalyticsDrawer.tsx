import Drawer from "@/ui-components/Drawer";
import Spinner from "@/ui-components/Spinner";
import SupplierTopProductsChart from "./SupplierTopProductsChart";
import SupplierInventoryTable from "./SupplierInventoryTable";
import { useSupplierDetailAnalytics } from "../hooks/useSupplierDetailAnalytics";
import { formatCurrency } from "@/lib/utils";

interface SupplierAnalyticsDrawerProps {
  open: boolean;
  onClose: () => void;
  supplierId: number | null;
  supplierName: string;
}

export default function SupplierAnalyticsDrawer({
  open,
  onClose,
  supplierId,
  supplierName,
}: SupplierAnalyticsDrawerProps) {
  const { data, loading, error } = useSupplierDetailAnalytics(supplierId);

  return (
    <Drawer open={open} onClose={onClose} title={supplierName} className="!w-[540px]">
      {loading || !data ? (
        <Spinner />
      ) : error ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Productos</p>
              <p className="text-lg font-bold text-text-main">{data.total_productos}</p>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Stock en Tienda</p>
              <p className="text-lg font-bold text-text-main">{data.stock_total}</p>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Ingresos Totales</p>
              <p className="text-lg font-bold text-text-main">
                {formatCurrency(Number(data.ingresos_usd))}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Ganancia Bruta</p>
              <p className="text-lg font-bold text-text-main">
                {formatCurrency(Number(data.ingresos_usd) * (Number(data.margen_promedio) / 100))}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {Number(data.margen_promedio).toFixed(1)}% de margen promedio
              </p>
            </div>
          </div>

          <SupplierTopProductsChart data={data.top_productos} />
          <SupplierInventoryTable data={data.top_productos} supplierName={supplierName} />
        </div>
      )}
    </Drawer>
  );
}
