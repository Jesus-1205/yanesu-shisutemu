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

export default function ProductCard({ product, onEdit, onDelete, onToggleFavorite }: ProductCardProps) {
  const tasa = useExchangeRateStore((s) => s.tasa);
  const margin = calcMargin(Number(product.precio_costo_usd), Number(product.precio_unidad_usd));

  const totalStock = product.stock_cajas * product.unidades_por_caja + product.stock_unidades;
  const isLowStock = totalStock > 0 && totalStock <= product.stock_minimo;
  const isOutOfStock = totalStock === 0;

  const stockVariant = isOutOfStock ? "danger" : isLowStock ? "warning" : "success";

  return (
    <div className="bg-surface rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-main truncate">{product.nombre}</h3>
          {product.codigo_barra && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{product.codigo_barra}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleFavorite?.(product)}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            title={product.es_favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <Star className={`w-4 h-4 ${product.es_favorito ? "fill-yellow-400 text-yellow-400" : "text-slate-400 hover:text-yellow-400"}`} />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors cursor-pointer"
            aria-label="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            aria-label="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {product.categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.categories.map((c) => (
            <Badge key={c.id} variant="info">{c.nombre}</Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5" />
          {product.unidades_por_caja} uds/caja
        </span>
        <span className="flex items-center gap-1 font-medium" data-margin={margin.color}>
          <Badge variant={margin.color}>{margin.label}</Badge>
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-slate-400" />
          <Badge variant={stockVariant}>
            {totalStock} uds
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-text-main">
            {formatCurrency(product.precio_unidad_usd)}
          </p>
          {tasa > 0 && (
            <p className="text-sm font-semibold text-slate-600">
              {formatCurrency(product.precio_unidad_usd * tasa, "Bs ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
