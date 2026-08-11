import { memo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem } from "../store/cartStore";
import { useCartStore } from "../store/cartStore";
import { formatCurrency } from "@/lib/utils";
import Badge from "@/ui-components/Badge";

interface CartItemRowProps {
  item: CartItem;
}

export default memo(function CartItemRow({ item }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateEmpaque = useCartStore((s) => s.updateEmpaque);
  const removeItem = useCartStore((s) => s.removeItem);
  const toggleDivisas = useCartStore((s) => s.toggleDivisas);
  const snapshotTasa = useCartStore((s) => s.snapshotTasa);

  const hasDivisas = item.precioDivisasUnidad !== null || item.precioDivisasCaja !== null;
  const precioDivisasActual =
    item.tipo_empaque === "UNIDAD"
      ? item.precioDivisasUnidad
      : item.precioDivisasCaja;

  const subtotalUsd = item.cantidad * item.precio_unitario_usd;
  const precioUnitarioVes = snapshotTasa > 0 ? item.precio_unitario_usd * snapshotTasa : 0;
  const subtotalVes = snapshotTasa > 0 ? subtotalUsd * snapshotTasa : 0;

  if (item.combo_id && item.comboDetalle) {
    const subtotal = Math.round(item.cantidad * item.precio_unitario_usd * 100) / 100;
    const variantNames = item.comboDetalle.productos.map((p) => p.nombre).join(" + ");
    const precioUnitarioVes = snapshotTasa > 0 ? item.precio_unitario_usd * snapshotTasa : 0;
    const subtotalVes = snapshotTasa > 0 ? subtotal * snapshotTasa : 0;

    return (
      <div className="bg-surface rounded-xl border border-emerald-200 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge variant="success" className="!text-[10px] !px-1 !py-0">COMBO</Badge>
              <p className="text-sm font-medium text-text-main truncate">
                {item.comboDetalle.nombre}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{variantNames}</p>
          </div>
          <button
            onClick={() => removeItem(item.cartItemId)}
            className="shrink-0 text-slate-400 hover:text-danger transition-colors cursor-pointer"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
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
          <span className="ml-auto text-sm font-semibold text-text-main">
            {formatCurrency(subtotal)}
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
  }

  return (
    <div className="bg-surface rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-text-main truncate">
            {item.nombre}
          </p>
          {item.usaPrecioDivisas && (
            <Badge variant="success" className="!text-[10px] !px-1 !py-0">DIV</Badge>
          )}
        </div>
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
          >{formatCurrency(subtotalUsd)}</span
        >
        <span className="text-xs text-slate-400">
          {item.tipo_empaque === "CAJA" &&
            `(${item.unidades_descontadas} unds.) `}
          IVA {item.iva_porcentaje}%
        </span>
      </div>
      {snapshotTasa > 0 && (
        <div className="flex justify-between text-xs text-emerald-600">
          <span>{formatCurrency(precioUnitarioVes, "Bs")} c/u</span>
          <span>{formatCurrency(subtotalVes, "Bs")}</span>
        </div>
      )}

      {hasDivisas && precioDivisasActual !== null && (
        <div className="pt-1 border-t border-slate-100">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={item.usaPrecioDivisas}
              onChange={() => toggleDivisas(item.cartItemId)}
              className="w-3.5 h-3.5 rounded accent-emerald-600"
            />
            <span className={item.usaPrecioDivisas ? "text-emerald-700 font-semibold" : "text-slate-500"}>
              {item.usaPrecioDivisas
                ? `Divisas (${formatCurrency(item.precio_unitario_usd)} c/u)`
                : `Precio divisas (${formatCurrency(precioDivisasActual)} c/u)`}
            </span>
          </label>
        </div>
      )}
    </div>
  );
});