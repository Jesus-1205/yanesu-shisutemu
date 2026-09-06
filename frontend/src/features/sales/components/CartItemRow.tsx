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
      <div className="space-y-2 rounded-xl border border-emerald-200 bg-surface p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge variant="success" className="text-[10px]! px-1! py-0!">COMBO</Badge>
              <p className="truncate text-sm font-medium text-text-main">
                {item.comboDetalle.nombre}
              </p>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{variantNames}</p>
          </div>
          <button
            onClick={() => removeItem(item.cartItemId)}
            className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-danger"
            title="Eliminar"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => updateQuantity(item.cartItemId, item.cantidad - 1)}
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
              if (!isNaN(v)) updateQuantity(item.cartItemId, v);
            }}
            autoComplete="off"
            className="w-14 [appearance:textfield] rounded-md border border-slate-300 bg-surface py-1 text-center text-base font-semibold outline-none focus:border-brand-blue [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            onClick={() => updateQuantity(item.cartItemId, item.cantidad + 1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Plus className="size-3.5" />
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
    <div className="space-y-2 rounded-xl border border-slate-200 bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-medium text-text-main">
            {item.nombre}
          </p>
          {item.usaPrecioDivisas && (
            <Badge variant="success" className="text-[10px]! px-1! py-0!">DIV</Badge>
          )}
        </div>
        <button
          onClick={() => removeItem(item.cartItemId)}
          className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-danger"
          title="Eliminar"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={item.tipo_empaque}
          onChange={(e) =>
            updateEmpaque(item.cartItemId, e.target.value as "UNIDAD" | "CAJA")
          }
          className="rounded-lg border border-slate-300 bg-surface px-2 py-1 text-xs outline-none focus:border-brand-blue"
        >
          <option value="UNIDAD">Und.</option>
          <option value="CAJA">Caja</option>
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => updateQuantity(item.cartItemId, item.cantidad - 1)}
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
              if (!isNaN(v)) updateQuantity(item.cartItemId, v);
            }}
            autoComplete="off"
            className="w-14 [appearance:textfield] rounded-md border border-slate-300 bg-surface py-1 text-center text-base font-semibold outline-none focus:border-brand-blue [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            onClick={() => updateQuantity(item.cartItemId, item.cantidad + 1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Plus className="size-3.5" />
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
        <div className="border-t border-slate-100 pt-1">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={item.usaPrecioDivisas}
              onChange={() => toggleDivisas(item.cartItemId)}
              autoComplete="off"
              className="size-3.5 rounded accent-emerald-600"
            />
            <span className={item.usaPrecioDivisas ? "font-semibold text-emerald-700" : "text-slate-500"}>
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
