import type { FacturaOut as Invoice, InvoicePaymentSummary, PaymentMethodOut } from "@/types/api";
import { usePaymentFormStore } from "../store/paymentFormStore";
import {
  useInvoicePaymentCalculations,
  type UseInvoicePaymentCalculationsReturn,
} from "./useInvoicePaymentCalculations";
import {
  useInvoicePaymentSubmit,
  type UseInvoicePaymentSubmitReturn,
} from "./useInvoicePaymentSubmit";

export interface UseInvoicePaymentFormProps {
  invoice: Invoice | null;
  paymentSummary: InvoicePaymentSummary | null;
  methods: PaymentMethodOut[];
  tasaBs: number;
  id: string | undefined;
}

export type UseInvoicePaymentFormReturn = UseInvoicePaymentCalculationsReturn &
  UseInvoicePaymentSubmitReturn;

export function useInvoicePaymentForm({
  invoice,
  paymentSummary,
  methods,
  tasaBs,
  id,
}: UseInvoicePaymentFormProps): UseInvoicePaymentFormReturn {
  const store = usePaymentFormStore();

  const calculations = useInvoicePaymentCalculations({
    invoice,
    paymentSummary,
    methods,
    selectedMethodId: store.selectedMethodId,
    monto: store.monto,
    incluirMora: store.incluirMora,
    tasaBs,
  });

  const submit = useInvoicePaymentSubmit({
    invoice,
    isValid: calculations.isValid,
    montoUsd: calculations.montoUsd,
    montoBs: calculations.montoBs,
    montoNum: calculations.montoNum,
    montoMoraBs: calculations.montoMoraBs,
    montoPagoBs: calculations.montoPagoBs,
    payInUsd: calculations.payInUsd,
    tasaBs,
    id,
  });

  return {
    ...calculations,
    ...submit,
  };
}
