import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { ProductOut, ProductMatrixItem, ProductRankingItem } from "@/types/api";
import ProductosTab from "../components/ProductosTab";
import ErrorBanner from "@/ui-components/ErrorBanner";

const FETCH_LIMIT = 50;

export default function ReportsProductsPage() {
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const [topSelling, setTopSelling] = useState<{ producto: ProductRankingItem; total_vendido: number }[]>([]);
  const [topMargin, setTopMargin] = useState<ProductOut[]>([]);
  const [lowestMargin, setLowestMargin] = useState<ProductOut[]>([]);
  const [lowRotation, setLowRotation] = useState<{ producto: ProductRankingItem; total_vendido: number }[]>([]);
  const [matrixData, setMatrixData] = useState<ProductMatrixItem[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingMatrix(true);
    setError(null);
    try {
      const [topSellRes, topMargRes, lowMargRes, lowRotRes, matrixRes] = await Promise.allSettled([
        api.getTopSellingProducts(FETCH_LIMIT),
        api.getTopMarginProducts(FETCH_LIMIT),
        api.getLowestMarginProducts(FETCH_LIMIT),
        api.getLowRotationProducts(FETCH_LIMIT),
        api.getProductsMatrix({ fecha_desde: from, fecha_hasta: to, limit: 100 }),
      ]);

      if (topSellRes.status === "fulfilled") setTopSelling(topSellRes.value);
      if (topMargRes.status === "fulfilled") setTopMargin(topMargRes.value);
      if (lowMargRes.status === "fulfilled") setLowestMargin(lowMargRes.value);
      if (lowRotRes.status === "fulfilled") setLowRotation(lowRotRes.value);
      if (matrixRes.status === "fulfilled") setMatrixData(matrixRes.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reporte de productos");
    } finally {
      setLoadingMatrix(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return <ErrorBanner onRetry={fetchData}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <ProductosTab
        topSelling={topSelling}
        topMargin={topMargin}
        lowestMargin={lowestMargin}
        lowRotation={lowRotation}
        matrixData={matrixData}
        loadingMatrix={loadingMatrix}
      />
    </div>
  );
}
