import { ScanLine, Loader2 } from "lucide-react";
import FileUpload from "@/ui-components/FileUpload";
import ImagePreview from "@/ui-components/ImagePreview";

interface InvoiceFilesSectionProps {
  invoiceFiles: File[];
  aiState: "idle" | "analyzing" | "reviewing";
  aiLoading: boolean;
  onFilesChange: (files: File[]) => void;
  onAnalyzeImage: () => void;
}

export default function InvoiceFilesSection({
  invoiceFiles,
  aiState,
  aiLoading,
  onFilesChange,
  onAnalyzeImage,
}: InvoiceFilesSectionProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">
        Archivos de Factura (imagen o PDF)
      </label>
      <FileUpload
        accept="image/*,.pdf"
        maxSize={10 * 1024 * 1024}
        onFilesChange={onFilesChange}
      />
      {invoiceFiles.length > 0 && invoiceFiles[0].type.startsWith("image/") && (
        <div className="mt-2">
          <ImagePreview file={invoiceFiles[0]} />
        </div>
      )}
      {invoiceFiles.length > 0 && aiState === "idle" && (
        <button
          type="button"
          onClick={onAnalyzeImage}
          disabled={aiLoading}
          className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue/90 disabled:opacity-50"
        >
          {aiLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanLine className="size-4" />
          )}
          {aiLoading ? "Analizando..." : "Leer con IA"}
        </button>
      )}
    </div>
  );
}
