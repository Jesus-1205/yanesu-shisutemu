import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { calcularResumenFiscal, type ResumenFiscal } from "@/lib/iva";
import type { Invoice } from "../types";
import type { InvoicePaymentOut, InvoicePaymentSummary } from "@/types/api";

export interface UseInvoiceDataReturn {
  invoice: Invoice | null;
  loading: boolean;
  error: string | null;
  payments: InvoicePaymentOut[];
  paymentSummary: InvoicePaymentSummary | null;
  resumen: ResumenFiscal | null;
  totalPrincipal: number;
  totalSecundario: number;
  nTasa: number;
  fetchInvoice: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  viewReceipt: (paymentId: number, receiptId: number) => void;
}

export function useInvoiceData(id: string | undefined): UseInvoiceDataReturn {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<InvoicePaymentOut[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<InvoicePaymentSummary | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoice(Number(id));
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar factura");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      const result = await api.getInvoicePayments(Number(id));
      setPayments(result.pagos);
      setPaymentSummary(result.resumen);
    } catch {
      // silently fail
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const resumen = useMemo<ResumenFiscal | null>(() => {
    if (!invoice || invoice.detalles.length === 0) return null;
    return calcularResumenFiscal(
      invoice.detalles.map((d) => ({
        subtotal_usd: d.cantidad * Number(d.costo_unitario_usd),
        subtotal_bs: d.cantidad * Number(d.costo_unitario_bs),
        tipo_iva: d.tipo_iva ?? "GRAVADO",
      })),
      invoice.moneda_principal,
      invoice.aplica_iva,
    );
  }, [invoice]);

  const totalPrincipal = useMemo(() => resumen?.total ?? 0, [resumen]);
  const nTasa = useMemo(() => Number(invoice?.tasa_bs ?? 0), [invoice?.tasa_bs]);

  const totalSecundario = useMemo(() => {
    if (!invoice || nTasa <= 0) return 0;
    return invoice.moneda_principal === "BS"
      ? Math.round((totalPrincipal / nTasa) * 100) / 100
      : Math.round((totalPrincipal * nTasa) * 100) / 100;
  }, [invoice, nTasa, totalPrincipal]);

  const viewReceipt = useCallback(
    (paymentId: number, receiptId: number) => {
      if (!invoice) return;
      const url = api.getPaymentReceiptUrl(invoice.id, paymentId, receiptId);
      window.open(url, "_blank");
    },
    [invoice],
  );

  return {
    invoice,
    loading,
    error,
    payments,
    paymentSummary,
    resumen,
    totalPrincipal,
    totalSecundario,
    nTasa,
    fetchInvoice,
    fetchPayments,
    viewReceipt,
  };
}
