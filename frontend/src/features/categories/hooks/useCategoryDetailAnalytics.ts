import { useCallback } from "react";
import { useAnalyticsData } from "@/features/dashboard/hooks/useAnalyticsData";
import { api } from "@/services/api";
import type { CategoryDetailAnalytics } from "@/types/api";

export function useCategoryDetailAnalytics(categoryId: number | null) {
  const fetcher = useCallback(
    () => api.getCategoryDetailAnalytics(categoryId!),
    [categoryId],
  );
  return useAnalyticsData<CategoryDetailAnalytics>(fetcher, {
    immediate: categoryId !== null,
  });
}
