import { useEffect, useState } from "react";
import type { ExchangeRateOut } from "@/types/api";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import { useToast } from "@/ui-components/Toast";

export function useInvoiceExchangeRateSync() {
  const { toast } = useToast();
  const tasa = useInvoiceFormStore((s) => s.tasa);
  const setField = useInvoiceFormStore((s) => s.setField);

  const tasaBcv = useExchangeRateStore((s) => s.tasa);
  const loadTasa = useExchangeRateStore((s) => s.loadTasa);
  const fechaUltimaActualizacion = useExchangeRateStore((s) => s.fechaUltimaActualizacion);

  const [rateHistory, setRateHistory] = useState<ExchangeRateOut[]>([]);
  const [showRateHistory, setShowRateHistory] = useState(false);

  useEffect(() => {
    if (tasaBcv === 0) {
      loadTasa();
    }
    api
      .getRateHistory({ days: 10 })
      .then((res) => {
        setRateHistory(res.history);
      })
      .catch(() => {});
  }, [loadTasa, tasaBcv]);

  useEffect(() => {
    if (tasaBcv > 0 && (tasa === "" || tasa === "0")) {
      setField("tasa", String(Math.round(tasaBcv * 100) / 100));
    }
  }, [tasaBcv, tasa, setField]);

  const applyRate = (rate: ExchangeRateOut) => {
    setField("tasa", String(Math.round(Number(rate.tasa_usd) * 100) / 100));
    setShowRateHistory(false);
    toast(
      `Tasa del ${new Date(rate.fecha_registro).toLocaleDateString("es-VE")} aplicada`,
      "success"
    );
  };

  return {
    tasaActual: tasaBcv,
    fechaUltimaActualizacion,
    rateHistory,
    showRateHistory,
    setShowRateHistory,
    applyRate,
  };
}
