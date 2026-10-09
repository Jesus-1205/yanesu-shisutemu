import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { getReportPresetDates } from "@/lib/utils";
import PagosTab from "../components/PagosTab";
import ErrorBanner from "@/ui-components/ErrorBanner";

export default function ReportsPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [data, setData] = useState<PaymentMethodSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getPaymentMethodSummary({
          fecha_desde: from,
          fecha_hasta: to,
        });
        if (!cancelled) {
          setData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar reporte de pagos");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, retryCount]);

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
    return <ErrorBanner onRetry={() => setRetryCount((c) => c + 1)}>{error}</ErrorBanner>;
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
