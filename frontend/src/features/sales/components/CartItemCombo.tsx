import { memo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem } from "../store/cartStore";
import { formatCurrency } from "@/lib/utils";
import Badge from "@/ui-components/Badge";

export interface CartItemComboProps {
  item: CartItem;
  subtotalUsd: number;
  precioUnitarioVes: number;
  subtotalVes: number;
  snapshotTasa: number;
  variantNames: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
}

export const CartItemCombo = memo(function CartItemCombo({
  item,
  subtotalUsd,
  precioUnitarioVes,
  subtotalVes,
  snapshotTasa,
  variantNames,
  onIncrement,
  onDecrement,
  onQuantityChange,
  onRemove,
}: CartItemComboProps) {
  return (
    <div className="space-y-2 rounded-xl border border-emerald-200 bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge variant="success" className="text-[10px]! px-1! py-0!">COMBO</Badge>
            <p className="truncate text-sm font-medium text-text-main">
              {item.comboDetalle?.nombre}
            </p>
          </div>
          {variantNames && (
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{variantNames}</p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-danger"
          title="Eliminar"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onDecrement}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          min="1"
          value={item.cantidad}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onQuantityChange(v);
          }}
          autoComplete="off"
          className="w-14 [appearance:textfield] rounded-md border border-slate-300 bg-surface py-1 text-center text-base font-semibold outline-none focus:border-brand-blue [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          onClick={onIncrement}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Plus className="size-3.5" />
        </button>
        <span className="ml-auto text-sm font-semibold text-text-main">
          {formatCurrency(subtotalUsd)}
        </span>
      </div>

      <div className="flex justify-between text-xs text-slate-400">
        <span>{item.cantidad} × {formatCurrency(item.precio_unitario_usd)}</span>
        <span>IVA 0%</span>
      </div>
      {snapshotTasa > 0 && (
        <div className="flex justify-between text-xs text-emerald-600">
          <span>{formatCurrency(precioUnitarioVes, "Bs")} c/u</span>
          <span>{formatCurrency(subtotalVes, "Bs")}</span>
        </div>
      )}
    </div>
  );
});
