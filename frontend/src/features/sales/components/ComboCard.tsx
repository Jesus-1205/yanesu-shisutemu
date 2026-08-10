import { ShoppingCart, Settings2 } from "lucide-react";
import type { ComboActiveOut } from "@/types/api";
import { formatCurrency } from "@/lib/utils";

interface ComboCardProps {
  combo: ComboActiveOut;
  onQuickAdd: () => void;
  onCustomize: () => void;
}

export default function ComboCard({ combo, onQuickAdd, onCustomize }: ComboCardProps) {
  const variantNames = combo.groups.flatMap((g) => g.productos.map((p) => p.nombre)).join(", ");

  return (
    <div className="bg-surface rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors p-3 flex flex-col gap-2 group">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-main truncate">{combo.nombre}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{variantNames}</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-emerald-700 ml-2">
          {formatCurrency(combo.precio_total_usd)}
        </span>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onQuickAdd}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Agregar
        </button>
        <button
          type="button"
          onClick={onCustomize}
          className="shrink-0 px-2 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs transition-colors cursor-pointer"
          title="Personalizar cantidades"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
