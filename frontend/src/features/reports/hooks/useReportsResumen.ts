import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut, ProductRankingItem } from "@/types/api";
import type { SalesSummaryItem } from "@/features/sales/types";
import { useToast } from "@/ui-components/Toast";

const FETCH_LIMIT = 50;

interface TopWeek {
  periodo: string;
  total_ventas: number;
  total_usd: number;
  total_ves: number;
}

interface UseReportsResumenReturn {
  loading: boolean;
  salesSummary: SalesSummaryItem[];
  topWeek: TopWeek | null;
  topSelling: { producto: ProductRankingItem; total_vendido: number }[];
  topMargin: ProductOut[];
  lowestMargin: ProductOut[];
  lowRotation: { producto: ProductRankingItem; total_vendido: number }[];
  categoriesTotal: number;
  categoriesCount: number;
  refetch: () => void;
}

export function useReportsResumen(rango: string): UseReportsResumenReturn {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryItem[]>([]);
  const [topWeek, setTopWeek] = useState<TopWeek | null>(null);
  const [topSelling, setTopSelling] = useState<{ producto: ProductRankingItem; total_vendido: number }[]>([]);
  const [topMargin, setTopMargin] = useState<ProductOut[]>([]);
  const [lowestMargin, setLowestMargin] = useState<ProductOut[]>([]);
  const [lowRotation, setLowRotation] = useState<{ producto: ProductRankingItem; total_vendido: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [summaryRes, topWeekRes, topSellRes, topMargRes, lowMargRes, lowRotRes] = await Promise.allSettled([
      api.getSalesSummary({ rango }),
      api.getTopWeek(rango),
      api.getTopSellingProducts(FETCH_LIMIT),
      api.getTopMarginProducts(FETCH_LIMIT),
      api.getLowestMarginProducts(FETCH_LIMIT),
      api.getLowRotationProducts(FETCH_LIMIT),
    ]);

    if (summaryRes.status === "fulfilled") setSalesSummary(summaryRes.value);
    else toast("Error al cargar resumen de ventas", "error");
    if (topWeekRes.status === "fulfilled") setTopWeek(topWeekRes.value);
    if (topSellRes.status === "fulfilled") setTopSelling(topSellRes.value);
    if (topMargRes.status === "fulfilled") setTopMargin(topMargRes.value);
    if (lowMargRes.status === "fulfilled") setLowestMargin(lowMargRes.value);
    if (lowRotRes.status === "fulfilled") setLowRotation(lowRotRes.value);
    setLoading(false);
  }, [rango, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoriesTotal = useMemo(
    () => Math.round(salesSummary.reduce((sum, s) => sum + Number(s.total_usd), 0) * 100) / 100,
    [salesSummary],
  );
  const categoriesCount = salesSummary.length;

  return {
    loading,
    salesSummary,
    topWeek,
    topSelling,
    topMargin,
    lowestMargin,
    lowRotation,
    categoriesTotal,
    categoriesCount,
    refetch: fetchData,
  };
}
