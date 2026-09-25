import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { FacturaOut as Invoice } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { formatBs, formatUsd } from "@/lib/text";
import { usePaymentFormStore } from "../store/paymentFormStore";

export interface UseInvoicePaymentSubmitProps {
  invoice: Invoice | null;
  isValid: boolean;
  montoUsd: number;
  montoBs: number;
  montoNum: number;
  montoMoraBs: number;
  montoPagoBs: number;
  payInUsd: boolean;
  tasaBs: number;
  id: string | undefined;
}

export interface UseInvoicePaymentSubmitReturn {
  submitting: boolean;
  submitError: string | null;
  handleSubmit: () => Promise<void>;
}

export function useInvoicePaymentSubmit({
  invoice,
  isValid,
  montoUsd,
  montoBs,
  montoNum,
  montoMoraBs,
  montoPagoBs,
  payInUsd,
  tasaBs,
  id,
}: UseInvoicePaymentSubmitProps): UseInvoicePaymentSubmitReturn {
  const { toast } = useToast();
  const navigate = useNavigate();
  const store = usePaymentFormStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting || !invoice) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.registerInvoicePayment(
        invoice.id,
        {
          metodo_pago_id: store.selectedMethodId!,
          monto_usd: montoUsd,
          monto_bs: montoBs,
          tasa_bs: tasaBs > 0 ? tasaBs : null,
          monto_mora: montoMoraBs,
          referencia: store.referencia.trim() || null,
          observaciones: store.observaciones.trim() || null,
        },
        store.comprobantes.length > 0 ? store.comprobantes : undefined,
      );
      const montoStr = payInUsd ? formatUsd(montoNum) : `Bs. ${formatBs(montoPagoBs)}`;
      const moraStr = montoMoraBs > 0 ? ` + mora Bs. ${formatBs(montoMoraBs)}` : "";
      toast(`Pago de ${montoStr}${moraStr} registrado`, "success");
      store.reset();
      navigate(`/invoices/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar pago");
    } finally {
      setSubmitting(false);
    }
  }, [
    isValid,
    submitting,
    invoice,
    store,
    montoUsd,
    montoBs,
    montoNum,
    montoMoraBs,
    montoPagoBs,
    tasaBs,
    payInUsd,
    toast,
    navigate,
    id,
  ]);

  return {
    submitting,
    submitError,
    handleSubmit,
  };
}
