import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { SupplierAnalyticsResponse } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

interface UseReportsProveedoresReturn {
  supplierAnalytics: SupplierAnalyticsResponse | null;
  loadingSuppliers: boolean;
  fetchSupplierAnalytics: () => Promise<void>;
}

export function useReportsProveedores(): UseReportsProveedoresReturn {
  const { toast } = useToast();
  const [supplierAnalytics, setSupplierAnalytics] = useState<SupplierAnalyticsResponse | null>(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const fetchSupplierAnalytics = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const data = await api.getSupplierAnalytics();
      setSupplierAnalytics(data);
    } catch {
      toast("Error al cargar analytics de proveedores", "error");
    } finally {
      setLoadingSuppliers(false);
    }
  }, [toast]);

  return { supplierAnalytics, loadingSuppliers, fetchSupplierAnalytics };
}
