import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";

interface UseRateQuickUpdateProps {
  open: boolean;
  currentUsd?: string | null;
  currentEur?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function norm(value: string): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : "";
}

export function useRateQuickUpdate({
  open,
  currentUsd,
  currentEur,
  onClose,
  onSaved,
}: UseRateQuickUpdateProps) {
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

  const handleLoadBcv = useCallback(async () => {
    setBcvLoading(true);
    setBcvError(null);
    try {
      const data = await api.getBcvRates();
      setUsd(data.rates.USD ? Number(data.rates.USD).toFixed(4) : "");
      setEur(data.rates.EUR ? Number(data.rates.EUR).toFixed(4) : "");
      toast("Tasas del BCV cargadas", "success");
    } catch (err) {
      setBcvError(
        err instanceof Error
          ? err.message
          : "No se pudo consultar el BCV. Ingrese las tasas manualmente."
      );
    } finally {
      setBcvLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      handleLoadBcv();
    } else {
      reset();
    }
  }, [open, handleLoadBcv, reset]);

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

  return {
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
  };
}
