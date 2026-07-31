import { useCallback } from "react";
import { useAnalyticsData } from "@/features/dashboard/hooks/useAnalyticsData";
import { api } from "@/services/api";
import type { SupplierDetailAnalytics } from "@/types/api";

export function useSupplierDetailAnalytics(supplierId: number | null) {
  const fetcher = useCallback(
    () => api.getSupplierDetailAnalytics(supplierId!),
    [supplierId],
  );
  return useAnalyticsData<SupplierDetailAnalytics>(fetcher, {
    immediate: supplierId !== null,
  });
}
