import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import PageHeader from "@/ui-components/PageHeader";
import { useInvoiceData } from "../hooks/useInvoiceData";
import { useExchangeRateSelector } from "../hooks/useExchangeRateSelector";
import { useInvoicePaymentForm } from "../hooks/useInvoicePaymentForm";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { useInvoicePaymentGuard } from "../hooks/useInvoicePaymentGuard";
import { usePaymentFormStore } from "../store/paymentFormStore";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import PaymentAmountSection from "../components/PaymentAmountSection";
import ExchangeRateSelector from "../components/ExchangeRateSelector";
import PaymentSidebar from "../components/PaymentSidebar";
import PaymentReferenceInput from "../components/PaymentReferenceInput";
import PaymentReceiptUpload from "../components/PaymentReceiptUpload";
import PaymentNotesInput from "../components/PaymentNotesInput";

export default function InvoicePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = usePaymentFormStore();

  const { invoice, loading, error, paymentSummary, fetchInvoice } = useInvoiceData(id);
  const { methods } = usePaymentMethods();
  const rateSelector = useExchangeRateSelector();

  useInvoicePaymentGuard({ invoice, invoiceId: id });

  const paymentForm = useInvoicePaymentForm({
    invoice,
    paymentSummary,
    methods,
    tasaBs: rateSelector.tasaBs,
    id,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div>
        <PageHeader
          title="Registrar Pago"
          actions={
            <Button variant="ghost" onClick={() => navigate(`/invoices/${id}`)}>
              <ArrowLeft className="size-4" />
              Volver
            </Button>
          }
        />
        <div className="mt-4">
          <ErrorBanner onRetry={fetchInvoice}>{error || "Factura no encontrada"}</ErrorBanner>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Registrar Pago"
        description={`Factura #${invoice.numero_factura} — ${invoice.supplier?.nombre || "Proveedor"}`}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/invoices/${id}`)}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        }
      />

      <div className="flex max-w-5xl flex-col gap-6 lg:flex-row">
        {/* Columna izquierda: Formulario */}
        <div className="min-w-0 flex-1 space-y-6">
          <PaymentMethodSelector methods={methods} />

          {store.selectedMethodId && (
            <PaymentAmountSection data={paymentForm} tasaBs={rateSelector.tasaBs} />
          )}

          {store.selectedMethodId && (
            <ExchangeRateSelector {...rateSelector} />
          )}

          <PaymentReferenceInput
            visible={Boolean(paymentForm.selectedMethod?.acepta_referencia)}
          />

          <PaymentReceiptUpload />

          <PaymentNotesInput />
        </div>

        {/* Columna derecha: Sidebar sticky */}
        <PaymentSidebar
          invoice={invoice}
          paymentSummary={paymentSummary}
          data={paymentForm}
        />
      </div>
    </div>
  );
}
