import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut as Product } from "@/types/api";

export function useProductDetails(id: string | number | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prod = await api.getProduct(Number(id));
      setProduct(prod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar producto");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const prod = await api.getProduct(Number(id));
        if (cancelled) return;
        setProduct(prod);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar producto");
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
}
