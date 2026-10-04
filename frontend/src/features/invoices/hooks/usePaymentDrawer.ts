import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { PaymentMethodOut } from "@/types/api";
import type { FacturaOut as Invoice } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { formatBs } from "@/lib/text";
import { toCents } from "@/lib/money";

export interface UsePaymentDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export function usePaymentDrawer({
  open,
  onClose,
  invoice,
  onSuccess,
}: UsePaymentDrawerProps) {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethodOut[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobantes, setComprobantes] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  const isBs = invoice.moneda_principal === "BS";
  const saldoPendiente = isBs ? invoice.total_bs : invoice.total_usd;
  const prefix = isBs ? "Bs." : "$";

  useEffect(() => {
    if (open) {
      setMonto(String(saldoPendiente));
      setSelectedMethodId(null);
      setReferencia("");
      setComprobantes([]);
      setObservaciones("");
      api
        .getPaymentMethods(true)
        .then((data) => {
          setMethods(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  }, [open, saldoPendiente]);

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);
  const montoNum = Number(monto) || 0;
  const excedeSaldo = montoNum > saldoPendiente + 0.01;
  const isValid = montoNum > 0 && selectedMethodId !== null && !excedeSaldo;

  const handleConfirm = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await api.registerInvoicePayment(
        invoice.id,
        {
          metodo_pago_id: selectedMethodId!,
          monto_usd: isBs ? 0 : toCents(montoNum),
          monto_bs: isBs ? toCents(montoNum) : 0,
          referencia: referencia.trim() || null,
          observaciones: observaciones.trim() || null,
        },
        comprobantes.length > 0 ? comprobantes : undefined
      );
      toast(`Pago de ${prefix} ${formatBs(montoNum)} registrado`, "success");
      onSuccess();
      onClose();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al registrar pago",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }, [
    isValid,
    saving,
    invoice.id,
    selectedMethodId,
    montoNum,
    isBs,
    referencia,
    observaciones,
    comprobantes,
    prefix,
    toast,
    onSuccess,
    onClose,
  ]);

  return {
    methods,
    selectedMethodId,
    setSelectedMethodId,
    monto,
    setMonto,
    referencia,
    setReferencia,
    comprobantes,
    setComprobantes,
    observaciones,
    setObservaciones,
    saving,
    isBs,
    saldoPendiente,
    prefix,
    selectedMethod,
    montoNum,
    excedeSaldo,
    isValid,
    handleConfirm,
  };
}

export type UsePaymentDrawerReturn = ReturnType<typeof usePaymentDrawer>;
