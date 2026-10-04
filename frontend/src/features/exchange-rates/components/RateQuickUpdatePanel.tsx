import { RefreshCw, Check, Globe, AlertTriangle } from "lucide-react";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import ErrorBanner from "@/ui-components/ErrorBanner";
import RateChangeBadge from "./RateChangeBadge";
import { useRateQuickUpdate } from "../hooks/useRateQuickUpdate";

interface RateQuickUpdatePanelProps {
  open: boolean;
  currentUsd?: string | null;
  currentEur?: string | null;
  updatedToday?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function RateQuickUpdatePanel({
  open,
  currentUsd,
  currentEur,
  updatedToday = false,
  onClose,
  onSaved,
}: RateQuickUpdatePanelProps) {
  const {
    usd,
    setUsd,
    eur,
    setEur,
    bcvLoading,
    bcvError,
    saving,
    normUsd,
    normEur,
    currentUsdNorm,
    currentEurNorm,
    sinCambios,
    disabledSave,
    handleLoadBcv,
    handleSave,
  } = useRateQuickUpdate({ open, currentUsd, currentEur, onClose, onSaved });

  if (!open) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-main">Actualizar tasas del día</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Cargue las tasas oficiales del BCV o ingréselas manualmente. Solo se guardan si hay cambios.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Input
            label="USD / VES"
            type="number"
            step="0.0001"
            min="0"
            value={usd}
            onChange={(e) => setUsd(e.target.value)}
            placeholder="ej: 45.1234"
            required
          />
          {currentUsdNorm !== null && (
            <RateChangeBadge label="USD" before={currentUsdNorm} after={normUsd} />
          )}
        </div>
        <div className="space-y-2">
          <Input
            label="EUR / VES"
            type="number"
            step="0.0001"
            min="0"
            value={eur}
            onChange={(e) => setEur(e.target.value)}
            placeholder="ej: 48.5678"
            required
          />
          {currentEurNorm !== null && (
            <RateChangeBadge label="EUR" before={currentEurNorm} after={normEur} />
          )}
        </div>
      </div>

      {bcvError && (
        <div className="mt-4">
          <ErrorBanner
            variant="warning"
            title="No se pudieron obtener las tasas del BCV"
            onRetry={handleLoadBcv}
          >
            {bcvError} Puede ingresar los valores manualmente en los campos de arriba.
          </ErrorBanner>
        </div>
      )}

      {usd.trim() !== "" && eur.trim() !== "" && sinCambios && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-100 px-3 py-2 text-xs text-blue-700">
          <Check className="size-4" />
          <span>Los valores coinciden con las tasas vigentes. No es necesario actualizar.</span>
        </div>
      )}

      {updatedToday && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Ya se registró una actualización de tasas hoy. Solo continúe si el BCV cambió
            nuevamente; de lo contrario, cancele para no duplicar el registro.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={handleLoadBcv} loading={bcvLoading}>
          <RefreshCw className="size-4" />
          Cargar desde BCV
        </Button>
        <Button variant="accent" onClick={handleSave} loading={saving} disabled={disabledSave}>
          <Check className="size-4" />
          Guardar
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Globe className="size-3.5" />
        <span>Fuente oficial: banco central de Venezuela (bcv.org.ve)</span>
      </div>
    </div>
  );
}
