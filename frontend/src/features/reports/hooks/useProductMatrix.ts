import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { ProductMatrixItem } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

interface UseProductMatrixReturn {
  matrixData: ProductMatrixItem[];
  loadingMatrix: boolean;
  fetchMatrixData: () => Promise<void>;
}

export function useProductMatrix(): UseProductMatrixReturn {
  const { toast } = useToast();
  const [matrixData, setMatrixData] = useState<ProductMatrixItem[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const fetchMatrixData = useCallback(async () => {
    setLoadingMatrix(true);
    try {
      const data = await api.getProductsMatrix({ limit: 200 });
      setMatrixData(data);
    } catch {
      toast("Error al cargar matriz de rendimiento", "error");
    } finally {
      setLoadingMatrix(false);
    }
  }, [toast]);

  return { matrixData, loadingMatrix, fetchMatrixData };
}
