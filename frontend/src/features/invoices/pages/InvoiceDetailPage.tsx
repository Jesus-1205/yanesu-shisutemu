import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot } from "lucide-react";
import { api } from "@/services/api";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import PageHeader from "@/ui-components/PageHeader";
import { useInvoiceData } from "../hooks/useInvoiceData";
import InvoiceMetaBar from "../components/InvoiceMetaBar";
import InvoiceFinancialCards from "../components/InvoiceFinancialCards";
import InvoicePaymentStatus from "../components/InvoicePaymentStatus";
import InvoiceLedger from "../components/InvoiceLedger";
import InvoiceFiscalSummary from "../components/InvoiceFiscalSummary";
import InvoiceLineItemsTable from "../components/InvoiceLineItemsTable";
import InvoiceObsequiosSection from "../components/InvoiceObsequiosSection";
import InvoiceImageViewer from "../components/InvoiceImageViewer";
import InvoiceAIModal from "../components/InvoiceAIModal";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const {
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
  } = useInvoiceData(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Detalle de Factura"
          actions={
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              Volver
            </Button>
          }
        />
        <div className="mt-4">
          <ErrorBanner onRetry={fetchInvoice}>{error}</ErrorBanner>
        </div>
      </>
    );
  }

  if (!invoice) return null;

  return (
    <>
      <PageHeader
        title={`${invoice.tipo_documento === "NOTA_ENTREGA" ? "Nota" : "Factura"} #${invoice.numero_factura}`}
        description={invoice.supplier?.nombre || "Proveedor desconocido"}
        actions={
          <div className="flex items-center gap-2">
            {invoice.procesada_por_ia && (
              <Button variant="outline" onClick={() => setAiModalOpen(true)}>
                <Bot className="size-4" />
                Resultado IA
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              Volver
            </Button>
          </div>
        }
      />

      <InvoiceMetaBar invoice={invoice} />

      <InvoiceFinancialCards
        invoice={invoice}
        totalPrincipal={totalPrincipal}
        totalSecundario={totalSecundario}
      />

      {paymentSummary && (
        <InvoicePaymentStatus
          invoice={invoice}
          paymentSummary={paymentSummary}
          invoiceId={id!}
        />
      )}

      <InvoiceLedger
        payments={payments}
        onViewReceipt={(paymentId, receiptId) => {
          window.open(api.getPaymentReceiptUrl(invoice.id, paymentId, receiptId), "_blank");
        }}
      />

      <InvoiceImageViewer
        invoiceId={invoice.id}
        numeroFactura={invoice.numero_factura}
        imagePath={invoice.image_path}
      />

      <InvoiceLineItemsTable
        invoice={invoice}
        totalPrincipal={totalPrincipal}
        totalSecundario={totalSecundario}
        nTasa={nTasa}
      />

      <InvoiceObsequiosSection obsequios={invoice.obsequios} />

      {resumen && (
        <InvoiceFiscalSummary
          invoice={invoice}
          resumen={resumen}
          totalPrincipal={totalPrincipal}
          totalSecundario={totalSecundario}
        />
      )}

      {invoice.observaciones && (
        <div className="rounded-xl border border-slate-200 bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Observaciones</p>
          <p className="mt-1 text-sm text-slate-700">{invoice.observaciones}</p>
        </div>
      )}

      <InvoiceAIModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        invoice={invoice}
      />
    </>
  );
}
