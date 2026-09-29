import { useState, useCallback } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { RetornableProductoCreate, RetornableReporteCreate } from "@/types/api";

export function useSearchProductosSelect() {
  const searchProducts = useCallback(async (query: string) => {
    const result = await api.getProducts({ search: query || undefined, page_size: 10 });
    return result.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  }, []);

  return { searchProducts };
}

export function useAsociarProductoRetornable() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const asociar = useCallback(
    async (payload: RetornableProductoCreate, onSuccess?: () => void) => {
      setLoading(true);
      try {
        await api.asociarRetornableProducto(payload);
        toast("Producto asociado exitosamente", "success");
        onSuccess?.();
        return true;
      } catch (e: unknown) {
        toast(e instanceof Error ? e.message : "Error al asociar", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return { asociar, isAsociando: loading };
}

export function useDesasociarProductoRetornable() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const desasociar = useCallback(
    async (id: number, onSuccess?: () => void) => {
      setLoading(true);
      try {
        await api.desasociarRetornableProducto(id);
        toast("Producto desasociado", "success");
        onSuccess?.();
        return true;
      } catch (e: unknown) {
        toast(e instanceof Error ? e.message : "Error al desasociar", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return { desasociar, isDesasociando: loading };
}

export function useCrearReporteRetornable() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const crearReporte = useCallback(
    async (payload: RetornableReporteCreate, onSuccess?: () => void) => {
      setLoading(true);
      try {
        await api.crearRetornableReporte(payload);
        toast("Reporte creado exitosamente", "success");
        onSuccess?.();
        return true;
      } catch (e: unknown) {
        toast(e instanceof Error ? e.message : "Error al crear reporte", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return { crearReporte, isCreando: loading };
}
