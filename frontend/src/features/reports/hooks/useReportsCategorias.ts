import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { CategoryOut, CategoryAnalyticsResponse } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

const FETCH_LIMIT = 50;

interface UseReportsCategoriasReturn {
  categoryAnalytics: CategoryAnalyticsResponse | null;
  loadingCategories: boolean;
  topSellCats: { categoria: CategoryOut; total_vendido: number }[];
  lowRotCats: { categoria: CategoryOut; total_vendido: number }[];
  fetchCategoryAnalytics: () => Promise<void>;
}

export function useReportsCategorias(): UseReportsCategoriasReturn {
  const { toast } = useToast();
  const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalyticsResponse | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [topSellCats, setTopSellCats] = useState<{ categoria: CategoryOut; total_vendido: number }[]>([]);
  const [lowRotCats, setLowRotCats] = useState<{ categoria: CategoryOut; total_vendido: number }[]>([]);

  const fetchCategoryAnalytics = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const [analytics, topSell, lowRot] = await Promise.allSettled([
        api.getCategoryAnalytics(),
        api.getTopSellingCategories(FETCH_LIMIT),
        api.getLowRotationCategories(FETCH_LIMIT),
      ]);
      if (analytics.status === "fulfilled") setCategoryAnalytics(analytics.value);
      if (topSell.status === "fulfilled") setTopSellCats(topSell.value);
      if (lowRot.status === "fulfilled") setLowRotCats(lowRot.value);
    } catch {
      toast("Error al cargar analytics de categorías", "error");
    } finally {
      setLoadingCategories(false);
    }
  }, [toast]);

  return { categoryAnalytics, loadingCategories, topSellCats, lowRotCats, fetchCategoryAnalytics };
}
