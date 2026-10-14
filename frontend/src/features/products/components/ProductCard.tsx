import { Pencil, Trash2, Box, Package, Star } from "lucide-react";
import type { Product } from "@/types/api";
import Badge from "@/ui-components/Badge";
import { formatCurrency } from "@/lib/utils";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { calcMargin } from "../types";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
}

export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ProductCardProps) {
  const tasa = useExchangeRateStore((s) => s.tasa);
  const margin = calcMargin(
    Number(product.precio_costo_usd),
    Number(product.precio_unidad_usd),
  );

  const totalStock =
    product.stock_cajas * product.unidades_por_caja + product.stock_unidades;
  const isLowStock = totalStock > 0 && totalStock <= product.stock_minimo;
  const isOutOfStock = totalStock === 0;

  const stockVariant = isOutOfStock
    ? "danger"
    : isLowStock
      ? "warning"
      : "success";

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-surface shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Top section: Title, barcode, categories, packaging and margin */}
      <div className="flex flex-1 flex-col justify-between p-4 pb-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold tracking-tight text-slate-900">
                {product.nombre}
              </h3>
              {product.codigo_barra && (
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {product.codigo_barra}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onToggleFavorite?.(product)}
                className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-yellow-50/80"
                title={
                  product.es_favorito
                    ? "Quitar de favoritos"
                    : "Agregar a favoritos"
                }
              >
                <Star
                  className={`size-4 transition-colors ${
                    product.es_favorito
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-slate-300 hover:text-yellow-400"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50/80 hover:text-brand-blue"
                aria-label="Editar"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(product)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/80 hover:text-danger"
                aria-label="Eliminar"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {/* Categories chips */}
          {product.categories.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {product.categories.map((c) => (
                <Badge key={c.id} variant="info" className="text-[11px] py-0.5">
                  {c.nombre}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Package & Margin info */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <Package className="size-3.5 text-slate-400" />
            {product.unidades_por_caja} uds/caja
          </span>
          <span
            className="flex items-center font-medium"
            data-margin={margin.color}
          >
            <Badge variant={margin.color} className="text-[11px] py-0.5 font-semibold">
              {margin.label}
            </Badge>
          </span>
        </div>
      </div>

      {/* Bottom tray section: Stock status and refined Price hierarchy */}
      <div className="flex items-end justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3 transition-colors group-hover:bg-slate-50">
        <div className="flex items-center gap-1.5">
          <Box className="size-3.5 text-slate-400" />
          <Badge variant={stockVariant} className="text-xs font-semibold">
            {totalStock} uds
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {formatCurrency(product.precio_unidad_usd)}
          </p>
          {tasa > 0 && (
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {formatCurrency(product.precio_unidad_usd * tasa, "Bs ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
