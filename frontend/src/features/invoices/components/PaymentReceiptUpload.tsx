import FileUpload from "@/ui-components/FileUpload";
import { usePaymentFormStore } from "../store/paymentFormStore";

export default function PaymentReceiptUpload() {
  const store = usePaymentFormStore();

  const handleFilesChange = (files: File[]) => {
    if (store.comprobantes.length === 0 && files.length > 0) {
      store.addComprobantes(files);
    }
  };

  return (
    <section>
      <label className="mb-2 block text-sm font-semibold tracking-wide text-slate-700 uppercase">
        Comprobantes de pago
      </label>
      <FileUpload
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        maxSize={5 * 1024 * 1024}
        onFilesChange={handleFilesChange}
      />
    </section>
  );
}
