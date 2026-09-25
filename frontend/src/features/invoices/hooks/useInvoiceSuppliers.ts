import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { SupplierOut } from "@/types/api";

export function useInvoiceSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getSuppliers()
      .then((data) => {
        if (isMounted) {
          setSuppliers(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { suppliers, loading };
}
