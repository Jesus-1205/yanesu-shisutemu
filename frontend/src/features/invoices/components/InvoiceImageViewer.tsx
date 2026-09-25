import React, { useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/services/api";
import Button from "@/ui-components/Button";
import Modal from "@/ui-components/Modal";
import { useToast } from "@/ui-components/Toast";

export interface InvoiceImageViewerProps {
  invoiceId: number;
  numeroFactura: string;
  imagePath: string | null;
}

export const InvoiceImageViewer: React.FC<InvoiceImageViewerProps> = ({
  invoiceId,
  numeroFactura,
  imagePath,
}) => {
  const { toast } = useToast();
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!imagePath) return null;

  const imageUrl = api.getInvoiceImageUrl(invoiceId);

  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const name = await api.downloadInvoiceImage(invoiceId);
      toast(`Imagen descargada: ${name}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al descargar la imagen", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Imagen de Factura</p>
        <Button
          variant="outline"
          size="sm"
          loading={downloading}
          onClick={handleDownloadImage}
        >
          <Download className="size-4" />
          Descargar
        </Button>
      </div>
      <div
        className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 transition-colors hover:border-brand-blue"
        onClick={() => setImagePreviewOpen(true)}
      >
        <img
          src={imageUrl}
          alt={`Factura #${numeroFactura}`}
          className="max-h-80 w-full bg-slate-50 object-contain"
        />
      </div>

      <Modal
        open={imagePreviewOpen}
        onClose={() => setImagePreviewOpen(false)}
        title="Imagen de Factura"
        className="max-w-3xl"
      >
        <img
          src={imageUrl}
          alt={`Factura #${numeroFactura}`}
          className="w-full rounded-lg object-contain"
        />
      </Modal>
    </div>
  );
};

export default InvoiceImageViewer;
