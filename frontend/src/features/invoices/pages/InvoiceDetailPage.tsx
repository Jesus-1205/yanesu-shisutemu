import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Download } from "lucide-react";
import { api } from "@/services/api";
import { calcularResumenFiscal } from "@/lib/iva";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import PageHeader from "@/ui-components/PageHeader";
import Modal from "@/ui-components/Modal";
import { useToast } from "@/ui-components/Toast";
import { useInvoiceData } from "../hooks/useInvoiceData";
import InvoiceMetaBar from "../components/InvoiceMetaBar";
import InvoiceFinancialCards from "../components/InvoiceFinancialCards";
import InvoicePaymentStatus from "../components/InvoicePaymentStatus";
import InvoiceLedger from "../components/InvoiceLedger";
import InvoiceFiscalSummary from "../components/InvoiceFiscalSummary";
import InvoiceAIModalContent from "../components/InvoiceAIModalContent";
import InvoiceLineItemsTable from "../components/InvoiceLineItemsTable";
import InvoiceObsequiosSection from "../components/InvoiceObsequiosSection";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { invoice, loading, error, payments, paymentSummary, fetchInvoice } = useInvoiceData(id);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadImage = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const name = await api.downloadInvoiceImage(invoice.id);
      toast(`Imagen descargada: ${name}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al descargar la imagen", "error");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (error) {
    return (
      <div>
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
      </div>
    );
  }

  if (!invoice) return null;

  const resumen = invoice.detalles.length > 0
    ? calcularResumenFiscal(
        invoice.detalles.map(d => ({
          subtotal_usd: d.cantidad * Number(d.costo_unitario_usd),
          subtotal_bs: d.cantidad * Number(d.costo_unitario_bs),
          tipo_iva: d.tipo_iva ?? "GRAVADO",
        })),
        invoice.moneda_principal,
        invoice.aplica_iva,
      )
    : null;

  const totalPrincipal = resumen?.total ?? 0;
  const nTasa = Number(invoice.tasa_bs);
  const totalSecundario = nTasa > 0
    ? (invoice.moneda_principal === "BS"
      ? Math.round((totalPrincipal / nTasa) * 100) / 100
      : Math.round((totalPrincipal * nTasa) * 100) / 100)
    : 0;

  return (
    <div>
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

      <InvoiceLedger invoice={invoice} payments={payments} />

      {invoice.image_path && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Imagen de Factura</p>
            <Button variant="outline" size="sm" loading={downloading} onClick={handleDownloadImage}>
              <Download className="size-4" />
              Descargar
            </Button>
          </div>
          <div
            className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 transition-colors hover:border-brand-blue"
            onClick={() => setImagePreviewOpen(true)}
          >
            <img
              src={api.getInvoiceImageUrl(invoice.id)}
              alt={`Factura #${invoice.numero_factura}`}
              className="max-h-80 w-full bg-slate-50 object-contain"
            />
          </div>
        </div>
      )}

      <Modal open={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)} title="Imagen de Factura" className="max-w-3xl">
        <img
          src={api.getInvoiceImageUrl(invoice.id)}
          alt={`Factura #${invoice.numero_factura}`}
          className="w-full rounded-lg object-contain"
        />
      </Modal>

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

      <Modal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="Información escaneada por IA"
        className="max-w-lg"
      >
        <InvoiceAIModalContent invoice={invoice} />
      </Modal>
    </div>
  );
}
