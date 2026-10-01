import { useState, useEffect, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { isTodayInCaracas } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { useRateHistory } from "../hooks/useRateHistory";
import { useRateTrend } from "../hooks/useRateTrend";
import RateHeroCard from "../components/RateHeroCard";
import RateQuickUpdatePanel from "../components/RateQuickUpdatePanel";
import RateKpis from "../components/RateKpis";
import RateTrendChart from "../components/RateTrendChart";
import RateHistoryTable from "../components/RateHistoryTable";

export default function ExchangeRatesPage() {
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  
  const {
    tasa: usd,
    tasaEUR: eur,
    fechaUltimaActualizacion,
    loading: storeLoading,
    loadTasa,
  } = useExchangeRateStore();

  useEffect(() => {
    loadTasa();
  }, [loadTasa]);

  const [panelOpen, setPanelOpen] = useState(false);

  const {
    history,
    loading: historyLoading,
    error,
    page,
    totalPages,
    setPage,
    refreshHistory,
    fetchAllRates,
  } = useRateHistory();

  const {
    trend,
    loading: trendLoading,
    intervalo,
    setIntervalo,
    refreshTrend,
  } = useRateTrend();

  const lastUpdateRef = useRef(fechaUltimaActualizacion);
  useEffect(() => {
    if (fechaUltimaActualizacion && fechaUltimaActualizacion !== lastUpdateRef.current) {
      lastUpdateRef.current = fechaUltimaActualizacion;
      refreshHistory();
      refreshTrend();
    }
  }, [fechaUltimaActualizacion, refreshHistory, refreshTrend]);

  const handleRefreshAll = async () => {
    await loadTasa();
    await refreshHistory();
    await refreshTrend();
  };

  const refreshAfterSave = async () => {
    await loadTasa();
  };

  const previousUsd = history.length > 1 ? history[1].tasa_usd : null;
  const previousEur = history.length > 1 ? history[1].tasa_eur : null;
  const updatedToday = isTodayInCaracas(fechaUltimaActualizacion);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasas de Cambio"
        description="Consulta y actualiza las tasas oficiales del día"
        actions={
          !isOperator ? (
            <Button variant="accent" onClick={() => setPanelOpen((v) => !v)}>
              {panelOpen ? <X className="size-4" /> : <RefreshCw className="size-4" />}
              {panelOpen ? "Cerrar" : "Actualizar Tasas"}
            </Button>
          ) : undefined
        }
      />

      {error && (
        <ErrorBanner onRetry={handleRefreshAll} dismissible>
          {error}
        </ErrorBanner>
      )}

      <RateHeroCard
        usd={usd > 0 ? String(usd) : null}
        eur={eur > 0 ? String(eur) : null}
        fechaActualizacion={fechaUltimaActualizacion}
        previousUsd={previousUsd}
        previousEur={previousEur}
        loading={storeLoading}
        canUpdate={!isOperator}
        onOpenPanel={() => setPanelOpen(true)}
      />

      {!isOperator && (
        <RateQuickUpdatePanel
          open={panelOpen}
          currentUsd={usd > 0 ? String(usd) : null}
          currentEur={eur > 0 ? String(eur) : null}
          updatedToday={updatedToday}
          onClose={() => setPanelOpen(false)}
          onSaved={refreshAfterSave}
        />
      )}

      <RateKpis data={trend} intervalo={intervalo} loading={trendLoading} />

      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        <RateTrendChart
          data={trend}
          interval={intervalo}
          onIntervalChange={setIntervalo}
          loading={trendLoading}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-surface p-5">
        <RateHistoryTable
          data={history}
          loading={historyLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onFetchAllData={fetchAllRates}
        />
      </div>
    </div>
  );
}
