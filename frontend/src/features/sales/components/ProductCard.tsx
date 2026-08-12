import { memo } from "react";
import { Package, Star } from "lucide-react";
import type { ProductOut } from "@/types/api";
import { formatCurrency } from "@/lib/utils";
import Badge from "@/ui-components/Badge";

interface ProductCardProps {
  product: ProductOut;
  tasa: number;
  isOperator: boolean;
  onAddUnit: () => void;
  onAddBox: () => void;
}

export default memo(function ProductCard({
  product,
  tasa,
  isOperator,
  onAddUnit,
  onAddBox,
}: ProductCardProps) {
  const isAgotado = product.stock_cajas === 0 && product.stock_unidades === 0;
  const hasLowStock = !isAgotado && product.stock_unidades <= product.stock_minimo;
  const hasCajas = product.unidades_por_caja > 1;
  const precioBs = tasa > 0 ? product.precio_unidad_usd * tasa : 0;
  const hasDivisas = product.precio_divisas_unidad || product.precio_divisas_caja;

  const stockLabel = isOperator
    ? isAgotado
      ? "Agotado"
      : "Disponible"
    : product.stock_cajas > 0
      ? `${product.stock_cajas} cj | ${product.stock_unidades} und`
      : `${product.stock_unidades} und`;

  const handleCardClick = () => {
    if (!isAgotado && product.precio_unidad_usd > 0) {
      onAddUnit();
    }
  };

  const handleBoxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAgotado && product.precio_caja_usd > 0) {
      onAddBox();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        relative rounded-xl border p-3.5 transition-all duration-150
        ${isAgotado
          ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
          : hasLowStock
            ? "border-amber-300 bg-amber-50/30 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
            : "border-slate-200 bg-surface cursor-pointer hover:shadow-md hover:-translate-y-0.5"
        }
      `}
    >
      {product.es_favorito && (
        <div className="absolute top-2 right-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
        </div>
      )}

      {isAgotado && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-100/80 z-10">
          <Badge variant="danger">AGOTADO</Badge>
        </div>
      )}

      <div className="space-y-2.5">
        <p className="text-base font-semibold text-text-main leading-tight pr-6 line-clamp-2" title={product.nombre}>
          {product.nombre}
        </p>

        <div className="flex items-center gap-1.5">
          {isAgotado ? (
            <Badge variant="danger">{stockLabel}</Badge>
          ) : hasLowStock && !isOperator ? (
            <Badge variant="warning">{stockLabel}</Badge>
          ) : isOperator ? (
            <Badge variant="success">{stockLabel}</Badge>
          ) : (
            <span className="text-sm text-slate-600 font-medium">{stockLabel}</span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-text-main">
              {formatCurrency(product.precio_unidad_usd)}
            </span>
            <span className="text-xs text-slate-400">/ und</span>
          </div>
          {tasa > 0 && (
            <div className="text-sm font-semibold text-emerald-600">
              Bs {precioBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          {hasCajas && (
            <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">
                {formatCurrency(product.precio_caja_usd)}
              </span>
              <span className="text-xs text-slate-400">/ caja</span>
            </div>
          )}
        </div>

        {hasDivisas && (
          <div className="flex gap-1 flex-wrap">
            {product.precio_divisas_unidad && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Div Ud: {formatCurrency(product.precio_divisas_unidad)}
              </span>
            )}
            {product.precio_divisas_caja && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Div Cj: {formatCurrency(product.precio_divisas_caja)}
              </span>
            )}
          </div>
        )}

        {hasCajas && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isAgotado || product.precio_caja_usd <= 0}
              onClick={handleBoxClick}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-blue text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shadow-xs hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              <Package className="w-3.5 h-3.5" />
              CAJA
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
