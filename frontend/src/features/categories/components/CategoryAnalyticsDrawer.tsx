import Drawer from "@/ui-components/Drawer";
import Spinner from "@/ui-components/Spinner";
import CategoryTopProductsChart from "./CategoryTopProductsChart";
import CategoryInventoryTable from "./CategoryInventoryTable";
import { useCategoryDetailAnalytics } from "../hooks/useCategoryDetailAnalytics";
import { formatCurrency } from "@/lib/utils";

interface CategoryAnalyticsDrawerProps {
  open: boolean;
  onClose: () => void;
  categoryId: number | null;
  categoryName: string;
}

export default function CategoryAnalyticsDrawer({
  open,
  onClose,
  categoryId,
  categoryName,
}: CategoryAnalyticsDrawerProps) {
  const { data, loading, error } = useCategoryDetailAnalytics(categoryId);

  return (
    <Drawer open={open} onClose={onClose} title={categoryName} className="w-135!">
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
              <p className="mb-1 text-xs text-slate-500">Unidades Vendidas</p>
              <p className="text-lg font-bold text-text-main">{data.unidades_vendidas}</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="mb-1 text-xs text-slate-500">Ingresos</p>
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

          <CategoryTopProductsChart data={data.top_productos} />
          <CategoryInventoryTable data={data.top_productos} categoryName={categoryName} />
        </div>
      )}
    </Drawer>
  );
}
