import { useCallback, useState } from "react";
import { api } from "@/services/api";

export function useInvoiceImage(invoiceId: number) {
  const [downloading, setDownloading] = useState(false);
  const imageUrl = api.getInvoiceImageUrl(invoiceId);

  const downloadImage = useCallback(async (): Promise<string> => {
    setDownloading(true);
    try {
      return await api.downloadInvoiceImage(invoiceId);
    } finally {
      setDownloading(false);
    }
  }, [invoiceId]);

  return {
    imageUrl,
    downloading,
    downloadImage,
  };
}
