import { Settings2, Sparkles } from "lucide-react";
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
    <div
      onClick={onQuickAdd}
      className="relative rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 flex flex-col gap-2.5 transition-all duration-150 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="absolute top-2 right-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
      </div>

      <div className="flex items-start gap-2 pr-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white uppercase tracking-wide">
              PROMO
            </span>
          </div>
          <p className="text-sm font-bold text-text-main truncate mt-1">{combo.nombre}</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{variantNames}</p>
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1 border-t border-amber-200/50">
        <span className="text-lg font-black text-amber-700">
          {formatCurrency(combo.precio_total_usd)}
        </span>
        <span className="text-[10px] text-slate-400">combo</span>
      </div>

      <div className="flex justify-end mt-auto pt-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCustomize(); }}
          className="shrink-0 px-2.5 py-2 rounded-lg bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs transition-colors cursor-pointer"
          title="Personalizar cantidades"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
