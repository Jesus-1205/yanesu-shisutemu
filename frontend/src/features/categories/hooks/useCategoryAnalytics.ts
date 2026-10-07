import { useCallback } from "react";
import { useAnalyticsData } from "@/features/dashboard/hooks/useAnalyticsData";
import { api } from "@/services/api";
import type { CategorySummaryResponse } from "@/types/api";

export function useCategoryAnalytics() {
  const fetcher = useCallback(() => api.getCategorySummary(), []);
  return useAnalyticsData<CategorySummaryResponse>(fetcher);
}
