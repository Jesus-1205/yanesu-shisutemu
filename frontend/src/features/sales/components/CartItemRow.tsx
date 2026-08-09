import { memo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem } from "../store/cartStore";
import { useCartStore } from "../store/cartStore";
import { formatCurrency } from "@/lib/utils";

interface CartItemRowProps {
  item: CartItem;
}

export default memo(function CartItemRow({ item }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateEmpaque = useCartStore((s) => s.updateEmpaque);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="bg-surface rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-main truncate min-w-0">
          {item.nombre}
        </p>
        <button
          onClick={() => removeItem(item.cartItemId)}
          className="shrink-0 text-slate-400 hover:text-danger transition-colors cursor-pointer"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={item.tipo_empaque}
          onChange={(e) =>
            updateEmpaque(item.cartItemId, e.target.value as "UNIDAD" | "CAJA")
          }
          className="text-xs rounded-lg border border-slate-300 bg-surface px-2 py-1 outline-none focus:border-brand-blue"
        >
          <option value="UNIDAD">Und.</option>
          <option value="CAJA">Caja</option>
        </select>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => updateQuantity(item.cartItemId, item.cantidad - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            min="1"
            value={item.cantidad}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) updateQuantity(item.cartItemId, v);
            }}
            className="w-14 text-center text-base font-semibold rounded-md border border-slate-300 bg-surface py-1 outline-none focus:border-brand-blue [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            onClick={() => updateQuantity(item.cartItemId, item.cantidad + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-slate-500"
          >{formatCurrency(item.cantidad * item.precio_unitario_usd)}</span
        >
        <span className="text-xs text-slate-400">
          {item.tipo_empaque === "CAJA" &&
            `(${item.unidades_descontadas} unds.) `}
          IVA {item.iva_porcentaje}%
        </span>
      </div>
    </div>
  );
});
