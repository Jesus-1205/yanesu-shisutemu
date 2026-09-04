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
      className="relative flex cursor-pointer flex-col gap-2.5 rounded-xl border-2 border-amber-300 bg-linear-to-br from-amber-50 to-orange-50 p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="absolute top-2 right-2">
        <Sparkles className="size-4 text-amber-500" />
      </div>

      <div className="flex items-start gap-2 pr-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
              PROMO
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-bold text-text-main">{combo.nombre}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{variantNames}</p>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-amber-200/50 pt-1">
        <span className="text-lg font-black text-amber-700">
          {formatCurrency(combo.precio_total_usd)}
        </span>
        <span className="text-[10px] text-slate-400">combo</span>
      </div>

      <div className="mt-auto flex justify-end pt-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCustomize(); }}
          className="shrink-0 cursor-pointer rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-xs text-amber-600 transition-colors hover:bg-amber-50"
          title="Personalizar cantidades"
        >
          <Settings2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}