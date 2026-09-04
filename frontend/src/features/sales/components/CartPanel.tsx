import { ShoppingCart, PauseCircle, Clock } from "lucide-react";
import type { CartItem, CartTotals } from "../store/cartStore";
import { formatCurrency, formatRate } from "@/lib/utils";
import CartItemRow from "./CartItemRow";
import Button from "@/ui-components/Button";

interface CartPanelProps {
  items: Record<string, CartItem>;
  totals: CartTotals;
  totalUsd: number;
  totalVes: number;
  snapshotTasa: number;
  itemCount: number;
  heldCount: number;
  onCheckout: () => void;
  onHold: () => void;
  onOpenQueue: () => void;
}

export default function CartPanel({
  items,
  totals,
  totalUsd,
  totalVes,
  snapshotTasa,
  itemCount,
  heldCount,
  onCheckout,
  onHold,
  onOpenQueue,
}: CartPanelProps) {
  return (
    <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      {/* Total prominente */}
      <div className="space-y-3 rounded-2xl border-2 border-brand-blue/30 bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <ShoppingCart className="size-4" />
          Total a cobrar
        </div>

        <div className="space-y-1">
          <div className="text-4xl font-black tracking-tight text-brand-blue">
            {formatCurrency(totalUsd)}
          </div>
          {snapshotTasa > 0 && (
            <div className="text-xl font-bold text-emerald-600">
              Bs {formatCurrency(totalVes, "").replace("$", "")}
            </div>
          )}
        </div>

        {snapshotTasa > 0 && (
          <p className="text-right text-xs text-slate-400">
            Tasa: {formatRate(snapshotTasa)}
          </p>
        )}

        {/* Desglose */}
        <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          {totals.monto_exento_usd > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Exento</span>
              <span>{formatCurrency(totals.monto_exento_usd)}</span>
            </div>
          )}
          {totals.base_imponible_usd > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Base imponible</span>
              <span>{formatCurrency(totals.base_imponible_usd)}</span>
            </div>
          )}
          {totals.monto_iva_usd > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>IVA</span>
              <span>{formatCurrency(totals.monto_iva_usd)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items del carrito */}
      <div className="max-h-[calc(100vh-380px)] space-y-2.5 overflow-y-auto rounded-xl border border-slate-200 bg-surface p-3">
        {itemCount === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Selecciona productos para agregar
          </p>
        ) : (
          Object.values(items).map((item) => (
            <CartItemRow key={item.cartItemId} item={item} />
          ))
        )}
      </div>

      {/* Botón cobrar */}
      <Button
        variant="accent"
        size="lg"
        className="w-full text-lg"
        disabled={itemCount === 0}
        onClick={onCheckout}
      >
        Cobrar ({itemCount})
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="md"
          className="w-full"
          disabled={itemCount === 0}
          onClick={onHold}
        >
          <PauseCircle className="size-4" />
          Guardar
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="w-full"
          onClick={onOpenQueue}
        >
          <Clock className="size-4" />
          En espera ({heldCount})
        </Button>
      </div>
    </div>
  );
}
