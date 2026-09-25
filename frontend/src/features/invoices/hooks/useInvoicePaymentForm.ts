import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { FacturaOut as Invoice, InvoicePaymentSummary, PaymentMethodOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { toCents } from "@/lib/money";
import { formatBs, formatUsd } from "@/lib/text";
import { usePaymentFormStore } from "../store/paymentFormStore";

interface UseInvoicePaymentFormProps {
  invoice: Invoice | null;
  paymentSummary: InvoicePaymentSummary | null;
  methods: PaymentMethodOut[];
  tasaBs: number;
  id: string | undefined;
}

export interface UseInvoicePaymentFormReturn {
  selectedMethod: PaymentMethodOut | undefined;
  payInUsd: boolean;
  saldoPendienteUsd: number;
  saldoPendienteBs: number;
  totalFacturaUsd: number;
  totalFacturaBs: number;
  totalPagadoUsd: number;
  totalPagadoBs: number;
  saldoEnMonedaPago: number;
  montoNum: number;
  montoMoraUsd: number;
  montoMoraBs: number;
  montoPagoBs: number;
  montoUsd: number;
  montoBs: number;
  saldoRestanteUsd: number;
  saldoRestanteBs: number;
  excedeSaldo: boolean;
  isValid: boolean;
  submitting: boolean;
  submitError: string | null;
  handleSubmit: () => Promise<void>;
}

export function useInvoicePaymentForm({
  invoice,
  paymentSummary,
  methods,
  tasaBs,
  id,
}: UseInvoicePaymentFormProps): UseInvoicePaymentFormReturn {
  const { toast } = useToast();
  const navigate = useNavigate();
  const store = usePaymentFormStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedMethod = methods.find((m) => m.id === store.selectedMethodId);
  const payInUsd = selectedMethod?.moneda_default === "USD";

  const saldoPendienteUsd = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.saldo_pendiente_usd ?? invoice.total_usd);
  }, [invoice, paymentSummary]);

  const saldoPendienteBs = useMemo(() => {
    if (!invoice) return 0;
    if (tasaBs > 0) return toCents(saldoPendienteUsd * tasaBs);
    return Number(paymentSummary?.saldo_pendiente_bs ?? invoice.total_bs);
  }, [invoice, paymentSummary, saldoPendienteUsd, tasaBs]);

  const totalFacturaUsd = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_factura_usd ?? invoice.total_usd);
  }, [invoice, paymentSummary]);

  const totalFacturaBs = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_factura_bs ?? invoice.total_bs);
  }, [invoice, paymentSummary]);

  const totalPagadoUsd = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_pagado_usd ?? 0);
  }, [invoice, paymentSummary]);

  const totalPagadoBs = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_pagado_bs ?? 0);
  }, [invoice, paymentSummary]);

  const saldoEnMonedaPago = useMemo(() => {
    if (!selectedMethod) return saldoPendienteUsd;
    if (payInUsd) return saldoPendienteUsd;
    if (saldoPendienteBs <= 0 && saldoPendienteUsd > 0 && tasaBs > 0) {
      return toCents(saldoPendienteUsd * tasaBs);
    }
    return saldoPendienteBs;
  }, [selectedMethod, payInUsd, saldoPendienteUsd, saldoPendienteBs, tasaBs]);

  const montoNum = Number(store.monto) || 0;

  const montoMoraUsd = useMemo(() => {
    if (!store.incluirMora || montoNum <= 0) return 0;
    const diff = toCents(montoNum - saldoEnMonedaPago);
    return diff > 0 ? diff : 0;
  }, [store.incluirMora, montoNum, saldoEnMonedaPago]);

  const montoMoraBs = useMemo(() => {
    if (montoMoraUsd <= 0) return 0;
    if (payInUsd && tasaBs > 0) return toCents(montoMoraUsd * tasaBs);
    return montoMoraUsd;
  }, [montoMoraUsd, payInUsd, tasaBs]);

  const montoPagoBs = useMemo(() => toCents(montoNum), [montoNum]);

  const excedeSaldo = useMemo(() => {
    if (store.incluirMora) {
      const totalEnMoneda = payInUsd ? totalFacturaUsd : totalFacturaBs;
      return montoNum > 0 && montoNum < totalEnMoneda;
    }
    return toCents(montoNum) > toCents(saldoEnMonedaPago);
  }, [store.incluirMora, montoNum, saldoEnMonedaPago, totalFacturaBs, totalFacturaUsd, payInUsd]);

  const montoUsd = useMemo(() => {
    if (montoPagoBs <= 0) return 0;
    if (payInUsd) return toCents(montoNum);
    if (tasaBs > 0) return Math.floor((montoPagoBs / tasaBs) * 100) / 100;
    return 0;
  }, [montoPagoBs, montoNum, payInUsd, tasaBs]);

  const montoBs = useMemo(() => {
    if (montoPagoBs <= 0) return 0;
    if (!payInUsd) return montoPagoBs;
    if (tasaBs > 0) return toCents(montoNum * tasaBs);
    return 0;
  }, [montoPagoBs, montoNum, payInUsd, tasaBs]);

  const saldoRestanteEnMonedaPago = useMemo(
    () => Math.max(0, toCents(saldoEnMonedaPago - montoPagoBs)),
    [saldoEnMonedaPago, montoPagoBs],
  );

  const saldoRestanteUsd = useMemo(() => {
    if (payInUsd) return saldoRestanteEnMonedaPago;
    if (tasaBs > 0) return toCents(saldoRestanteEnMonedaPago / tasaBs);
    return 0;
  }, [payInUsd, saldoRestanteEnMonedaPago, tasaBs]);

  const saldoRestanteBs = useMemo(() => {
    if (!payInUsd) return saldoRestanteEnMonedaPago;
    if (tasaBs > 0) return toCents(saldoRestanteEnMonedaPago * tasaBs);
    return 0;
  }, [payInUsd, saldoRestanteEnMonedaPago, tasaBs]);

  const isValid = montoNum > 0 && store.selectedMethodId !== null && !excedeSaldo;

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
  }, [isValid, submitting, invoice, store, montoUsd, montoBs, montoNum, montoMoraBs, montoPagoBs, tasaBs, payInUsd, toast, navigate, id]);

  return {
    selectedMethod,
    payInUsd,
    saldoPendienteUsd,
    saldoPendienteBs,
    totalFacturaUsd,
    totalFacturaBs,
    totalPagadoUsd,
    totalPagadoBs,
    saldoEnMonedaPago,
    montoNum,
    montoMoraUsd,
    montoMoraBs,
    montoPagoBs,
    montoUsd,
    montoBs,
    saldoRestanteUsd,
    saldoRestanteBs,
    excedeSaldo,
    isValid,
    submitting,
    submitError,
    handleSubmit,
  };
}
