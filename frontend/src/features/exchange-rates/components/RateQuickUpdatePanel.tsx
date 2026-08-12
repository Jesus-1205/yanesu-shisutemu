import { useCallback, useState } from "react";
import { RefreshCw, Check, Globe, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useToast } from "@/ui-components/Toast";
import RateChangeBadge from "./RateChangeBadge";

interface RateQuickUpdatePanelProps {
  open: boolean;
  currentUsd?: string | null;
  currentEur?: string | null;
  updatedToday?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function norm(value: string): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : "";
}

export default function RateQuickUpdatePanel({
  open,
  currentUsd,
  currentEur,
  updatedToday = false,
  onClose,
  onSaved,
}: RateQuickUpdatePanelProps) {
  const { toast } = useToast();
  const [usd, setUsd] = useState("");
  const [eur, setEur] = useState("");
  const [bcvLoading, setBcvLoading] = useState(false);
  const [bcvError, setBcvError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setUsd("");
    setEur("");
    setBcvError(null);
  }, []);

  const normUsd = norm(usd);
  const normEur = norm(eur);
  const currentUsdNorm = currentUsd ? norm(currentUsd) : null;
  const currentEurNorm = currentEur ? norm(currentEur) : null;
  const usdIgual = currentUsdNorm !== null && normUsd === currentUsdNorm;
  const eurIgual = currentEurNorm !== null && normEur === currentEurNorm;
  const sinCambios = usdIgual && eurIgual;
  const disabledSave = saving || usd.trim() === "" || eur.trim() === "" || sinCambios;

  const handleLoadBcv = async () => {
    setBcvLoading(true);
    setBcvError(null);
    try {
      const data = await api.getBcvRates();
      setUsd(data.rates.USD ? Number(data.rates.USD).toFixed(4) : "");
      setEur(data.rates.EUR ? Number(data.rates.EUR).toFixed(4) : "");
      toast("Tasas del BCV cargadas", "success");
    } catch (err) {
      setBcvError(
        err instanceof Error ? err.message : "No se pudo consultar el BCV. Ingrese las tasas manualmente.",
      );
    } finally {
      setBcvLoading(false);
    }
  };

  const handleSave = async () => {
    const usdNum = Number(usd);
    const eurNum = Number(eur);
    if (!Number.isFinite(usdNum) || !Number.isFinite(eurNum) || usdNum <= 0 || eurNum <= 0) {
      toast("Ingrese valores válidos para ambas tasas", "error");
      return;
    }
    if (sinCambios) {
      toast("Las tasas no han cambiado respecto a las actuales", "info");
      return;
    }
    setSaving(true);
    try {
      await api.saveBulkRates({ usd: normUsd, eur: normEur });
      toast("Tasas guardadas correctamente", "success");
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al guardar tasas", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-text-main">Actualizar tasas del día</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Cargue las tasas oficiales del BCV o ingréselas manualmente. Solo se guardan si hay cambios.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="mt-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-blue-100 text-blue-700 border border-blue-200">
          <Check className="w-4 h-4" />
          <span>Los valores coinciden con las tasas vigentes. No es necesario actualizar.</span>
        </div>
      )}

      {updatedToday && (
        <div className="mt-4 flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-red-50 text-red-800 border border-red-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Ya se registró una actualización de tasas hoy. Solo continúe si el BCV cambió
            nuevamente; de lo contrario, cancele para no duplicar el registro.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={handleLoadBcv} loading={bcvLoading}>
          <RefreshCw className="w-4 h-4" />
          Cargar desde BCV
        </Button>
        <Button variant="accent" onClick={handleSave} loading={saving} disabled={disabledSave}>
          <Check className="w-4 h-4" />
          Guardar
        </Button>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
        <Globe className="w-3.5 h-3.5" />
        <span>Fuente oficial: banco central de Venezuela (bcv.org.ve)</span>
      </div>
    </div>
  );
}
