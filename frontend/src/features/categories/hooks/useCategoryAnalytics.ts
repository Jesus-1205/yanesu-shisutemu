import { useCallback } from "react";
import { useAnalyticsData } from "@/features/dashboard/hooks/useAnalyticsData";
import { api } from "@/services/api";
import type { CategoryAnalyticsResponse } from "@/types/api";

export function useCategoryAnalytics() {
  const fetcher = useCallback(() => api.getCategoryAnalytics(), []);
  return useAnalyticsData<CategoryAnalyticsResponse>(fetcher);
}
