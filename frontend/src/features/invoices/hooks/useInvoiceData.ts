import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { Invoice } from "../types";
import type { InvoicePaymentOut, InvoicePaymentSummary } from "@/types/api";

interface UseInvoiceDataReturn {
  invoice: Invoice | null;
  loading: boolean;
  error: string | null;
  payments: InvoicePaymentOut[];
  paymentSummary: InvoicePaymentSummary | null;
  fetchInvoice: () => Promise<void>;
  fetchPayments: () => Promise<void>;
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

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return { invoice, loading, error, payments, paymentSummary, fetchInvoice, fetchPayments };
}
