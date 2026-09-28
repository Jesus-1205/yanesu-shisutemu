import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { PaymentMethod, CreatePaymentMethodData, UpdatePaymentMethodData } from "../types";

export function usePaymentMethods() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPaymentMethods();
      setMethods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar métodos de pago");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const createMethod = async (data: CreatePaymentMethodData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.createPaymentMethod(data);
      toast("Método de pago creado", "success");
      await fetchMethods();
      return true;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar método de pago",
        "error"
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateMethod = async (id: number, data: UpdatePaymentMethodData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.updatePaymentMethod(id, data);
      toast("Método de pago actualizado", "success");
      await fetchMethods();
      return true;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar método de pago",
        "error"
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteMethod = async (id: number): Promise<boolean> => {
    setDeleting(true);
    try {
      await api.deletePaymentMethod(id);
      toast("Método de pago eliminado", "success");
      await fetchMethods();
      return true;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar método de pago",
        "error"
      );
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    methods,
    loading,
    error,
    saving,
    deleting,
    fetchMethods,
    createMethod,
    updateMethod,
    deleteMethod,
  };
}
