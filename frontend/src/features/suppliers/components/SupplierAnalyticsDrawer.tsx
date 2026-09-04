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
    <Drawer open={open} onClose={onClose} title={supplierName} className="w-135!">
      {loading || !data ? (
        <Spinner />
      ) : error ? (
        <div className="flex h-50 items-center justify-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="mb-1 text-xs text-slate-500">Productos</p>
              <p className="text-lg font-bold text-text-main">{data.total_productos}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="mb-1 text-xs text-slate-500">Stock en Tienda</p>
              <p className="text-lg font-bold text-text-main">{data.stock_total}</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="mb-1 text-xs text-slate-500">Ingresos Totales</p>
              <p className="text-lg font-bold text-text-main">
                {formatCurrency(Number(data.ingresos_usd))}
              </p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <p className="mb-1 text-xs text-slate-500">Ganancia Bruta</p>
              <p className="text-lg font-bold text-text-main">
                {formatCurrency(Math.round(Number(data.ingresos_usd) * (Number(data.margen_promedio) / 100) * 100) / 100)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
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
