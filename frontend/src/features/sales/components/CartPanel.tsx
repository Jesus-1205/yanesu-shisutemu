import { ShoppingCart } from "lucide-react";
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
  onCheckout: () => void;
}

export default function CartPanel({
  items,
  totals,
  totalUsd,
  totalVes,
  snapshotTasa,
  itemCount,
  onCheckout,
}: CartPanelProps) {
  return (
    <div className="lg:sticky lg:top-24 lg:self-start space-y-3">
      {/* Total prominente */}
      <div className="bg-surface rounded-2xl border-2 border-brand-blue/30 p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <ShoppingCart className="w-4 h-4" />
          Total a cobrar
        </div>

        <div className="space-y-1">
          <div className="text-4xl font-black text-brand-blue tracking-tight">
            {formatCurrency(totalUsd)}
          </div>
          {snapshotTasa > 0 && (
            <div className="text-xl font-bold text-emerald-600">
              Bs {formatCurrency(totalVes, "").replace("$", "")}
            </div>
          )}
        </div>

        {snapshotTasa > 0 && (
          <p className="text-xs text-slate-400 text-right">
            Tasa: {formatRate(snapshotTasa)}
          </p>
        )}

        {/* Desglose */}
        <div className="space-y-1 text-sm border-t border-slate-100 pt-3">
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
      <div className="bg-surface rounded-xl border border-slate-200 p-3 space-y-2.5 max-h-[calc(100vh-380px)] overflow-y-auto">
        {itemCount === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
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
    </div>
  );
}
