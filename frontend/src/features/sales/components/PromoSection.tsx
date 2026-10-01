import { ChevronDown } from "lucide-react";
import type { ComboActiveOut } from "@/types/api";
import ComboCard from "./ComboCard";

interface PromoSectionProps {
  combos: ComboActiveOut[];
  showPromos: boolean;
  onTogglePromos: () => void;
  onQuickAddCombo: (combo: ComboActiveOut) => void;
  onCustomizeCombo: (combo: ComboActiveOut) => void;
}

export default function PromoSection({
  combos,
  showPromos,
  onTogglePromos,
  onQuickAddCombo,
  onCustomizeCombo,
}: PromoSectionProps) {
  if (combos.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onTogglePromos}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 transition-colors hover:bg-amber-100"
      >
        <h2 className="flex-1 text-left text-sm font-bold tracking-wide text-amber-700 uppercase">
          Promociones ({combos.length})
        </h2>
        <ChevronDown
          size={16}
          className={`text-amber-700 transition-transform duration-200 ${showPromos ? "rotate-180" : ""}`}
        />
      </button>
      {showPromos && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {combos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              onQuickAdd={() => onQuickAddCombo(combo)}
              onCustomize={() => onCustomizeCombo(combo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
