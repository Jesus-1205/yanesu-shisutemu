import { useNavigate } from "react-router-dom";
import { Package, ShoppingBag, DollarSign, Percent, ArrowRight, Boxes } from "lucide-react";
import Drawer from "@/ui-components/Drawer";
import Spinner from "@/ui-components/Spinner";
import Button from "@/ui-components/Button";
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
  const navigate = useNavigate();
  const { data, loading, error } = useCategoryDetailAnalytics(categoryId);

  const handleGoToProducts = () => {
    if (!categoryId) return;
    onClose();
    navigate(`/products?categoria_id=${categoryId}`);
  };

  return (
    <Drawer open={open} onClose={onClose} title={categoryName} className="sm:w-135!">
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="flex h-50 items-center justify-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : !data ? null : (
        <div className="space-y-5">
          {/* Action banner: link to products catalog */}
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white shadow-xs">
                <Boxes className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Catálogo de Productos</p>
                <p className="text-[11px] text-slate-500">
                  {data.total_productos} productos registrados en esta categoría
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToProducts}
              className="bg-white text-xs gap-1.5 shadow-xs hover:bg-slate-50"
            >
              <span>Ver en Catálogo</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {/* Clean Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* KPI 1: Productos (Clickable) */}
            <div
              onClick={handleGoToProducts}
              className="group relative cursor-pointer rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
              title="Ver productos en el catálogo"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Productos</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
                  <Package className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">{data.total_productos}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-blue group-hover:underline">
                Explorar catálogo <ArrowRight className="size-3" />
              </p>
            </div>

            {/* KPI 2: Unidades Vendidas */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Unidades Vendidas</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShoppingBag className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">{data.unidades_vendidas}</p>
              <p className="mt-1 text-[11px] text-slate-400">Total histórico comercializado</p>
            </div>

            {/* KPI 3: Ingresos */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ingresos</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <DollarSign className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {formatCurrency(Number(data.ingresos_usd))}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Ventas brutas acumuladas</p>
            </div>

            {/* KPI 4: Ganancia Bruta */}
            <div className="rounded-xl border border-slate-200/90 bg-surface p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ganancia Bruta</p>
                <div className="flex size-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Percent className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {formatCurrency(
                  Math.round(Number(data.ingresos_usd) * (Number(data.margen_promedio) / 100) * 100) / 100,
                )}
              </p>
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
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
