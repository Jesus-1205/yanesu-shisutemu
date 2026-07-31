import { useCallback } from "react";
import { useAnalyticsData } from "@/features/dashboard/hooks/useAnalyticsData";
import { api } from "@/services/api";
import type { SupplierAnalyticsResponse } from "@/types/api";

export function useSupplierAnalytics() {
  const fetcher = useCallback(() => api.getSupplierAnalytics(), []);
  return useAnalyticsData<SupplierAnalyticsResponse>(fetcher);
}
