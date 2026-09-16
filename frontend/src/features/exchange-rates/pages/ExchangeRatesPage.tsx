import { RefreshCw, X } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { isTodayInCaracas } from "@/lib/utils";
import { useExchangeRates } from "../hooks/useExchangeRates";
import RateHeroCard from "../components/RateHeroCard";
import RateQuickUpdatePanel from "../components/RateQuickUpdatePanel";
import RateKpis from "../components/RateKpis";
import RateTrendChart from "../components/RateTrendChart";
import RateHistoryTable from "../components/RateHistoryTable";

export default function ExchangeRatesPage() {
  const {
    latest,
    fechaActualizacion,
    loading,
    error,
    refresh,
    history,
    historyLoading,
    page,
    totalPages,
    setPage,
    trend,
    trendLoading,
    intervalo,
    setIntervalo,
    panelOpen,
    setPanelOpen,
    refreshAfterSave,
  } = useExchangeRates();

  const previousUsd = history.length > 1 ? history[1].tasa_usd : null;
  const previousEur = history.length > 1 ? history[1].tasa_eur : null;
  const updatedToday = isTodayInCaracas(fechaActualizacion);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasas de Cambio"
        description="Consulta y actualiza las tasas oficiales del día"
        actions={
          <Button variant="accent" onClick={() => setPanelOpen((v) => !v)}>
            {panelOpen ? <X className="size-4" /> : <RefreshCw className="size-4" />}
            {panelOpen ? "Cerrar" : "Actualizar Tasas"}
          </Button>
        }
      />

      {error && (
        <ErrorBanner onRetry={refresh} dismissible>
          {error}
        </ErrorBanner>
      )}

      <RateHeroCard
        usd={latest.USD}
        eur={latest.EUR}
        fechaActualizacion={fechaActualizacion}
        previousUsd={previousUsd}
        previousEur={previousEur}
        loading={loading}
        onOpenPanel={() => setPanelOpen(true)}
      />

      <RateQuickUpdatePanel
        open={panelOpen}
        currentUsd={latest.USD}
        currentEur={latest.EUR}
        updatedToday={updatedToday}
        onClose={() => setPanelOpen(false)}
        onSaved={refreshAfterSave}
      />

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
        />
      </div>
    </div>
  );
}
