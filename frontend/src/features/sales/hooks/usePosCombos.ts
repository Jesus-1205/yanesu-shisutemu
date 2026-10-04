import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { ComboActiveOut } from "@/types/api";

export function usePosCombos() {
  const [showPromos, setShowPromos] = useState(false);
  const [combos, setCombos] = useState<ComboActiveOut[]>([]);
  const [customizingCombo, setCustomizingCombo] = useState<ComboActiveOut | null>(null);

  useEffect(() => {
    api.getActiveCombos().then(setCombos).catch(() => {});
  }, []);

  return {
    showPromos,
    setShowPromos,
    combos,
    setCombos,
    customizingCombo,
    setCustomizingCombo,
  };
}
