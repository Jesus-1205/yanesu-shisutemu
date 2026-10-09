import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { PaymentMethodSummaryItem } from "@/types/api";
import PagosTab from "../components/PagosTab";
import ErrorBanner from "@/ui-components/ErrorBanner";

export default function ReportsPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const [data, setData] = useState<PaymentMethodSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaymentMethodSummary({
        fecha_desde: from || undefined,
        fecha_hasta: to || undefined,
      });
      setData(res || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reporte de pagos");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDesdeChange = (v: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (v) newParams.set("from", v);
    else newParams.delete("from");
    setSearchParams(newParams, { replace: true });
  };

  const handleHastaChange = (v: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (v) newParams.set("to", v);
    else newParams.delete("to");
    setSearchParams(newParams, { replace: true });
  };

  const handleClear = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("from");
    newParams.delete("to");
    setSearchParams(newParams, { replace: true });
  };

  if (error) {
    return <ErrorBanner onRetry={fetchData}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <PagosTab
        data={data}
        loading={loading}
        desde={from}
        hasta={to}
        onDesdeChange={handleDesdeChange}
        onHastaChange={handleHastaChange}
        onClear={handleClear}
      />
    </div>
  );
}
