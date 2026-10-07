import { useCallback } from "react";
import { useAnalyticsData } from "@/features/dashboard/hooks/useAnalyticsData";
import { api } from "@/services/api";
import type { SupplierSummaryResponse } from "@/types/api";

export function useSupplierAnalytics() {
  const fetcher = useCallback(() => api.getSupplierSummary(), []);
  return useAnalyticsData<SupplierSummaryResponse>(fetcher);
}
