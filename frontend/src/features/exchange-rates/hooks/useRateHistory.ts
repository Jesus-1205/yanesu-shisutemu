import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { ExchangeRate } from "../types";

const PAGE_SIZE = 20;

export function useRateHistory() {
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const refreshHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const historyRes = await api.getRateHistoryPaginated({ page, page_size: PAGE_SIZE });
      setHistory(historyRes.items);
      setTotalPages(historyRes.pages);
    } catch (err) {
      setHistory([]);
      setTotalPages(1);
      setError(err instanceof Error ? err.message : "Error al cargar historial de tasas");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const fetchAllRates = useCallback(async (): Promise<ExchangeRate[]> => {
    const all: ExchangeRate[] = [];
    let currentPage = 1;
    let totalPagesCount = 1;
    while (currentPage <= totalPagesCount) {
      const res = await api.getRateHistoryPaginated({
        page: currentPage,
        page_size: 200,
      });
      all.push(...res.items);
      totalPagesCount = res.pages;
      currentPage += 1;
    }
    return all;
  }, []);

  return {
    history,
    loading,
    error,
    page,
    totalPages,
    setPage,
    refreshHistory,
    fetchAllRates,
  };
}
