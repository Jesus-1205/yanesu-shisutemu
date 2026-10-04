import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { Sale } from "../types";
import { useToast } from "@/ui-components/Toast";

export function useSaleDetail(id?: string | number) {
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getSale(Number(id))
      .then(setSale)
      .catch(() => toast("Error al cargar venta", "error"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  return { sale, loading };
}
