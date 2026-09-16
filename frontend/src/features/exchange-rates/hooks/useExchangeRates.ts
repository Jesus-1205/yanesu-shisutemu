import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { ExchangeRate, RateInterval, RateTrendPoint } from "../types";
import { RATE_INTERVAL_DAYS } from "../types";

const PAGE_SIZE = 20;

export function useExchangeRates() {
  const loadTasa = useExchangeRateStore((s) => s.loadTasa);

  const [latest, setLatest] = useState<{ USD?: string; EUR?: string }>({});
  const [fechaActualizacion, setFechaActualizacion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [trend, setTrend] = useState<RateTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [intervalo, setIntervalo] = useState<RateInterval>("30D");

  const [panelOpen, setPanelOpen] = useState(false);

  const refreshLatestAndHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ratesRes = await api.getLatestRates();
      setLatest(ratesRes.rates);
      setFechaActualizacion(ratesRes.fecha_ultima_actualizacion ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tasas");
    } finally {
      setLoading(false);
    }

    setHistoryLoading(true);
    try {
      const historyRes = await api.getRateHistoryPaginated({ page, page_size: PAGE_SIZE });
      setHistory(historyRes.items);
      setTotalPages(historyRes.pages);
    } catch {
      setHistory([]);
      setTotalPages(1);
    } finally {
      setHistoryLoading(false);
    }
  }, [page]);

  const loadTrend = useCallback(async (iv: RateInterval) => {
    setTrendLoading(true);
    try {
      const { history: points } = await api.getRateHistory({ days: RATE_INTERVAL_DAYS[iv] });
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
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLatestAndHistory();
  }, [refreshLatestAndHistory]);

  useEffect(() => {
    loadTrend(intervalo);
  }, [loadTrend, intervalo]);

  const refreshAfterSave = useCallback(async () => {
    await refreshLatestAndHistory();
    await loadTrend(intervalo);
    loadTasa();
  }, [refreshLatestAndHistory, loadTrend, intervalo, loadTasa]);

  return {
    latest,
    fechaActualizacion,
    loading,
    error,
    refresh: refreshLatestAndHistory,
    history,
    historyLoading,
    page,
    totalPages,
    setPage,
    trend,
    trendLoading,
    intervalo,
    setIntervalo,
    panelOpen,
    setPanelOpen,
    refreshAfterSave,
  };
}
