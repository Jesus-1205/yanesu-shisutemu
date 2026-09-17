import { useEffect, useRef } from "react";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

interface RateStreamPayload {
  usd: string | number;
  eur: string | number;
  id?: number;
  fecha_registro?: string;
}

export function useRateStream(onRateUpdate?: (usd: number, eur: number) => void): void {
  const setRates = useExchangeRateStore((s) => s.setRates);
  const onRateUpdateRef = useRef(onRateUpdate);
  onRateUpdateRef.current = onRateUpdate;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;

    try {
      eventSource = new EventSource("/api/exchange-rates/stream");

      eventSource.onmessage = (event) => {
        if (!isMounted || !event.data) return;
        try {
          const payload = JSON.parse(event.data) as RateStreamPayload;
          const newUsd = Number(payload.usd);
          const newEur = Number(payload.eur);

          if (!isNaN(newUsd) && newUsd > 0) {
            const currentTasa = useExchangeRateStore.getState().tasa;
            setRates(newUsd, isNaN(newEur) ? 0 : newEur, payload.fecha_registro ?? null);

            if (currentTasa > 0 && currentTasa !== newUsd) {
              onRateUpdateRef.current?.(newUsd, isNaN(newEur) ? 0 : newEur);
            }
          }
        } catch {
          // Ignorar pings o datos no JSON
        }
      };
    } catch {
      // EventSource no soportado o fallo de inicio
    }

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [setRates]);
}
