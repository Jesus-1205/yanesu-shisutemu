import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { RateInterval, RateTrendPoint } from "../types";
import { RATE_INTERVAL_DAYS } from "../types";

export function useRateTrend() {
  const [trend, setTrend] = useState<RateTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [intervalo, setIntervalo] = useState<RateInterval>("30D");

  const loadTrend = useCallback(async () => {
    setLoading(true);
    try {
      const { history: points } = await api.getRateHistory({ days: RATE_INTERVAL_DAYS[intervalo] });
      setTrend(
        points
          .slice()
          .reverse()
          .map((r) => ({
            fecha: r.fecha_registro,
            usd: Number(r.tasa_usd),
            eur: Number(r.tasa_eur),
          })),
      );
    } catch {
      setTrend([]);
    } finally {
      setLoading(false);
    }
  }, [intervalo]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  return {
    trend,
    loading,
    intervalo,
    setIntervalo,
    refreshTrend: loadTrend,
  };
}
