import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { ProductOut, ProductMatrixItem, ProductRankingItem } from "@/types/api";
import { getReportPresetDates } from "@/lib/utils";
import ProductosTab from "../components/ProductosTab";
import ErrorBanner from "@/ui-components/ErrorBanner";

const FETCH_LIMIT = 50;

export default function ReportsProductsPage() {
  const [searchParams] = useSearchParams();
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [topSelling, setTopSelling] = useState<{ producto: ProductRankingItem; total_vendido: number }[]>([]);
  const [topMargin, setTopMargin] = useState<ProductOut[]>([]);
  const [lowestMargin, setLowestMargin] = useState<ProductOut[]>([]);
  const [lowRotation, setLowRotation] = useState<{ producto: ProductRankingItem; total_vendido: number }[]>([]);
  const [matrixData, setMatrixData] = useState<ProductMatrixItem[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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

        if (!cancelled) {
          if (topSellRes.status === "fulfilled") setTopSelling(topSellRes.value);
          if (topMargRes.status === "fulfilled") setTopMargin(topMargRes.value);
          if (lowMargRes.status === "fulfilled") setLowestMargin(lowMargRes.value);
          if (lowRotRes.status === "fulfilled") setLowRotation(lowRotRes.value);
          if (matrixRes.status === "fulfilled") setMatrixData(matrixRes.value);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar reporte de productos");
        }
      } finally {
        if (!cancelled) {
          setLoadingMatrix(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, retryCount]);

  if (error) {
    return <ErrorBanner onRetry={() => setRetryCount((c) => c + 1)}>{error}</ErrorBanner>;
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
