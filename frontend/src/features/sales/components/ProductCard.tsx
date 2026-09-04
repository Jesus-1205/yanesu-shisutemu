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
        relative flex flex-col rounded-xl border border-slate-200 bg-surface p-3.5 transition-all duration-150
        ${isAgotado
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
        }
      `}
    >
      {product.es_favorito && (
        <div className="absolute top-2 right-2">
          <Star className="size-4 fill-amber-400 text-amber-400" />
        </div>
      )}

      {isAgotado && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-100/80">
          <Badge variant="danger">AGOTADO</Badge>
        </div>
      )}

      <div className="flex flex-1 flex-col space-y-2.5">
        <p className="line-clamp-2 pr-6 text-base leading-tight font-semibold text-text-main" title={product.nombre}>
          {product.nombre}
        </p>

        <div className="flex items-center gap-1.5">
          {isAgotado ? (
            <Badge variant="danger">{stockLabel}</Badge>
          ) : isOperator ? (
            <Badge variant="success">{stockLabel}</Badge>
          ) : (
            <span className="text-sm font-medium text-slate-600">{stockLabel}</span>
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
            <div className="flex items-baseline justify-between border-t border-slate-100 pt-1">
              <span className="text-sm font-semibold text-slate-700">
                {formatCurrency(product.precio_caja_usd)}
              </span>
              <span className="text-xs text-slate-400">/ caja</span>
            </div>
          )}
        </div>

        {hasDivisas && (
          <div className="flex flex-wrap gap-1">
            {product.precio_divisas_unidad && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Div Ud: {formatCurrency(product.precio_divisas_unidad)}
              </span>
            )}
            {product.precio_divisas_caja && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Div Cj: {formatCurrency(product.precio_divisas_caja)}
              </span>
            )}
          </div>
        )}

        {hasCajas && (
          <div className="mt-auto flex justify-end pt-2">
            <button
              type="button"
              disabled={isAgotado || product.precio_caja_usd <= 0}
              onClick={handleBoxClick}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-brand-blue px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md active:translate-y-0 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
              <Package className="size-3.5" />
              CAJA
            </button>
          </div>
        )}
      </div>
    </div>
  );
});