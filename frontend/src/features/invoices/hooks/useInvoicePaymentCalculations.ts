import { useMemo } from "react";
import type { FacturaOut as Invoice, InvoicePaymentSummary, PaymentMethodOut } from "@/types/api";
import { toCents } from "@/lib/money";

export interface UseInvoicePaymentCalculationsProps {
  invoice: Invoice | null;
  paymentSummary: InvoicePaymentSummary | null;
  methods: PaymentMethodOut[];
  selectedMethodId: number | null;
  monto: string;
  incluirMora: boolean;
  tasaBs: number;
}

export interface UseInvoicePaymentCalculationsReturn {
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
}

export function useInvoicePaymentCalculations({
  invoice,
  paymentSummary,
  methods,
  selectedMethodId,
  monto,
  incluirMora,
  tasaBs,
}: UseInvoicePaymentCalculationsProps): UseInvoicePaymentCalculationsReturn {
  const selectedMethod = methods.find((m) => m.id === selectedMethodId);
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

  const montoNum = Number(monto) || 0;

  const montoMoraUsd = useMemo(() => {
    if (!incluirMora || montoNum <= 0) return 0;
    const diff = toCents(montoNum - saldoEnMonedaPago);
    return diff > 0 ? diff : 0;
  }, [incluirMora, montoNum, saldoEnMonedaPago]);

  const montoMoraBs = useMemo(() => {
    if (montoMoraUsd <= 0) return 0;
    if (payInUsd && tasaBs > 0) return toCents(montoMoraUsd * tasaBs);
    return montoMoraUsd;
  }, [montoMoraUsd, payInUsd, tasaBs]);

  const montoPagoBs = useMemo(() => toCents(montoNum), [montoNum]);

  const excedeSaldo = useMemo(() => {
    if (incluirMora) {
      const totalEnMoneda = payInUsd ? totalFacturaUsd : totalFacturaBs;
      return montoNum > 0 && montoNum < totalEnMoneda;
    }
    return toCents(montoNum) > toCents(saldoEnMonedaPago);
  }, [incluirMora, montoNum, saldoEnMonedaPago, totalFacturaBs, totalFacturaUsd, payInUsd]);

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

  const isValid = montoNum > 0 && selectedMethodId !== null && !excedeSaldo;

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
  };
}
