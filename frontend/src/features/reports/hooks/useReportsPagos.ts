import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

interface UseReportsPagosReturn {
  paymentSummary: PaymentMethodSummaryItem[];
  loadingPayments: boolean;
  pagoDesde: string;
  pagoHasta: string;
  setPagoDesde: (v: string) => void;
  setPagoHasta: (v: string) => void;
  fetchPaymentSummary: () => Promise<void>;
}

export function useReportsPagos(): UseReportsPagosReturn {
  const { toast } = useToast();
  const [paymentSummary, setPaymentSummary] = useState<PaymentMethodSummaryItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [pagoDesde, setPagoDesde] = useState("");
  const [pagoHasta, setPagoHasta] = useState("");

  const fetchPaymentSummary = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const data = await api.getPaymentMethodSummary({
        ...(pagoDesde && { fecha_desde: pagoDesde }),
        ...(pagoHasta && { fecha_hasta: pagoHasta }),
      });
      setPaymentSummary(data.map((m) => ({
        ...m,
        cantidad_pagos: Number(m.cantidad_pagos) || 0,
        total_usd: Number(m.total_usd) || 0,
        total_ves: Number(m.total_ves) || 0,
        total_equivalente_usd: Number(m.total_equivalente_usd) || 0,
      })));
    } catch {
      toast("Error al cargar estadísticas de métodos de pago", "error");
    } finally {
      setLoadingPayments(false);
    }
  }, [pagoDesde, pagoHasta, toast]);

  return {
    paymentSummary,
    loadingPayments,
    pagoDesde,
    pagoHasta,
    setPagoDesde,
    setPagoHasta,
    fetchPaymentSummary,
  };
}
