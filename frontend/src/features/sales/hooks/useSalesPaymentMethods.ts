import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { PaymentMethodOut } from "@/types/api";

export function useSalesPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPaymentMethods(true);
      setMethods(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar métodos de pago");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  return { methods, loading, error, fetchMethods };
}
