import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import type { PaymentMethodOut } from "@/types/api";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import PageHeader from "@/ui-components/PageHeader";
import FileUpload from "@/ui-components/FileUpload";
import { useToast } from "@/ui-components/Toast";
import { useInvoiceData } from "../hooks/useInvoiceData";
import { useExchangeRateSelector } from "../hooks/useExchangeRateSelector";
import { useInvoicePaymentForm } from "../hooks/useInvoicePaymentForm";
import { usePaymentFormStore } from "../store/paymentFormStore";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import PaymentAmountSection from "../components/PaymentAmountSection";
import ExchangeRateSelector from "../components/ExchangeRateSelector";
import PaymentSidebar from "../components/PaymentSidebar";

export default function InvoicePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const store = usePaymentFormStore();
  const paidToastShown = useRef(false);

  const { invoice, loading, error, paymentSummary, fetchInvoice } = useInvoiceData(id);
  const rateSelector = useExchangeRateSelector();
  const [methods, setMethods] = useState<PaymentMethodOut[]>([]);

  const fetchMethods = useCallback(async () => {
    try {
      const data = await api.getPaymentMethods(true);
      setMethods(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  useEffect(() => {
    if (invoice?.estado_pago === "PAGADA") {
      if (!paidToastShown.current) {
        paidToastShown.current = true;
        toast("Esta factura ya está pagada", "info");
      }
      navigate(`/invoices/${id}`, { replace: true });
    }
  }, [invoice, id, navigate, toast]);

  const paymentForm = useInvoicePaymentForm({
    invoice,
    paymentSummary,
    methods,
    tasaBs: rateSelector.tasaBs,
    id,
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
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
            <PaymentAmountSection
              payInUsd={paymentForm.payInUsd}
              saldoEnMonedaPago={paymentForm.saldoEnMonedaPago}
              saldoPendienteUsd={paymentForm.saldoPendienteUsd}
              saldoPendienteBs={paymentForm.saldoPendienteBs}
              saldoRestanteUsd={paymentForm.saldoRestanteUsd}
              saldoRestanteBs={paymentForm.saldoRestanteBs}
              totalFacturaUsd={paymentForm.totalFacturaUsd}
              totalFacturaBs={paymentForm.totalFacturaBs}
              montoNum={paymentForm.montoNum}
              montoMoraUsd={paymentForm.montoMoraUsd}
              montoMoraBs={paymentForm.montoMoraBs}
              montoBs={paymentForm.montoBs}
              montoUsd={paymentForm.montoUsd}
              tasaBs={rateSelector.tasaBs}
              excedeSaldo={paymentForm.excedeSaldo}
            />
          )}

          {store.selectedMethodId && (
            <ExchangeRateSelector {...rateSelector} />
          )}

          {paymentForm.selectedMethod?.acepta_referencia && (
            <section>
              <label className="mb-2 block text-sm font-semibold tracking-wide text-slate-700 uppercase">
                Referencia
              </label>
              <input
                type="text"
                value={store.referencia}
                onChange={(e) => store.setReferencia(e.target.value)}
                placeholder="Número de referencia"
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-surface px-4 text-sm text-text-main transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </section>
          )}

          <section>
            <label className="mb-2 block text-sm font-semibold tracking-wide text-slate-700 uppercase">
              Comprobantes de pago
            </label>
            <FileUpload
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              maxSize={5 * 1024 * 1024}
              onFilesChange={(files) => {
                store.comprobantes.length === 0 && files.length > 0
                  ? store.addComprobantes(files)
                  : null;
              }}
            />
          </section>

          <section>
            <label className="mb-2 block text-sm font-semibold tracking-wide text-slate-700 uppercase">
              Observaciones
            </label>
            <textarea
              rows={3}
              value={store.observaciones}
              onChange={(e) => store.setObservaciones(e.target.value)}
              placeholder="Notas opcionales sobre este pago..."
              className="w-full resize-none rounded-xl border-2 border-slate-200 bg-surface px-4 py-3 text-sm transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </section>
        </div>

        {/* Columna derecha: Sidebar sticky */}
        <PaymentSidebar
          invoice={invoice}
          paymentSummary={paymentSummary}
          totalFacturaUsd={paymentForm.totalFacturaUsd}
          totalFacturaBs={paymentForm.totalFacturaBs}
          totalPagadoUsd={paymentForm.totalPagadoUsd}
          totalPagadoBs={paymentForm.totalPagadoBs}
          saldoPendienteUsd={paymentForm.saldoPendienteUsd}
          saldoPendienteBs={paymentForm.saldoPendienteBs}
          isValid={paymentForm.isValid}
          submitting={paymentForm.submitting}
          submitError={paymentForm.submitError}
          onSubmit={paymentForm.handleSubmit}
        />
      </div>
    </div>
  );
}
