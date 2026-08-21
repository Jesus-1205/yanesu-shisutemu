import { useState, useEffect, useCallback } from "react";
import { calcMargin, type MarginDisplay } from "../types";

interface UseMarginInputResult {
  input: string;
  margin: MarginDisplay;
  onFocus: () => void;
  onChange: (raw: string) => void;
  onBlur: () => void;
}

export function useMarginInput(
  costo: number,
  precioActual: number,
  onPriceChange: (price: number) => void,
): UseMarginInputResult {
  const margin = calcMargin(costo, precioActual);
  const [focused, setFocused] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!focused) {
      setInput(margin.margen > 0 ? margin.margen.toFixed(1) : "");
    }
  }, [margin.margen, focused]);

  const onFocus = useCallback(() => setFocused(true), []);

  const onChange = useCallback(
    (raw: string) => {
      setInput(raw);
      const pct = parseFloat(raw);
      if (!isNaN(pct) && costo > 0) {
        const divisor = 1 - pct / 100;
        if (divisor > 0) {
          onPriceChange(Math.round((costo / divisor) * 100) / 100);
        }
      }
    },
    [costo, onPriceChange],
  );

  const onBlur = useCallback(() => {
    setFocused(false);
    const pct = parseFloat(input);
    if (!isNaN(pct) && costo > 0) {
      const divisor = 1 - pct / 100;
      if (divisor > 0) {
        onPriceChange(Math.round((costo / divisor) * 100) / 100);
      }
    }
    setInput(margin.margen > 0 ? margin.margen.toFixed(1) : "");
  }, [input, costo, margin.margen, onPriceChange]);

  return { input, margin, onFocus, onChange, onBlur };
}
