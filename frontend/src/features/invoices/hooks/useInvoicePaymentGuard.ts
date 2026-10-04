import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { FacturaOut as Invoice } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

interface UseInvoicePaymentGuardProps {
  invoice: Invoice | null;
  invoiceId: string | undefined;
}

export function useInvoicePaymentGuard({ invoice, invoiceId }: UseInvoicePaymentGuardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const paidToastShown = useRef(false);

  useEffect(() => {
    if (invoice?.estado_pago === "PAGADA" && invoiceId) {
      if (!paidToastShown.current) {
        paidToastShown.current = true;
        toast("Esta factura ya está pagada", "info");
      }
      navigate(`/invoices/${invoiceId}`, { replace: true });
    }
  }, [invoice, invoiceId, navigate, toast]);
}
