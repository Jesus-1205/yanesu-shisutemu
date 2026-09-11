import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { ComboOut, ComboCreate, ComboUpdate, PaymentMethodOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

interface UseCombosCatalogReturn {
  combos: ComboOut[];
  loading: boolean;
  error: string | null;
  paymentMethods: PaymentMethodOut[];
  fetchCombos: () => Promise<void>;
  loadPaymentMethods: () => Promise<void>;
  createCombo: (payload: ComboCreate) => Promise<boolean>;
  updateCombo: (id: number, payload: ComboUpdate) => Promise<boolean>;
  deleteCombo: (id: number) => Promise<boolean>;
}

export function useCombos(): UseCombosCatalogReturn {
  const { toast } = useToast();
  const [combos, setCombos] = useState<ComboOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);

  const fetchCombos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCombos();
      setCombos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar combos");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const methods = await api.getPaymentMethods(true);
      setPaymentMethods(methods);
    } catch {
      toast("Error al cargar métodos de pago", "error");
    }
  }, [toast]);

  const createCombo = useCallback(async (payload: ComboCreate): Promise<boolean> => {
    try {
      await api.createCombo(payload);
      toast("Combo creado", "success");
      await fetchCombos();
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al crear combo", "error");
      return false;
    }
  }, [fetchCombos, toast]);

  const updateCombo = useCallback(async (id: number, payload: ComboUpdate): Promise<boolean> => {
    try {
      await api.updateCombo(id, payload);
      toast("Combo actualizado", "success");
      await fetchCombos();
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al actualizar combo", "error");
      return false;
    }
  }, [fetchCombos, toast]);

  const deleteCombo = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.deleteCombo(id);
      toast("Combo eliminado", "success");
      await fetchCombos();
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al eliminar combo", "error");
      return false;
    }
  }, [fetchCombos, toast]);

  return {
    combos,
    loading,
    error,
    paymentMethods,
    fetchCombos,
    loadPaymentMethods,
    createCombo,
    updateCombo,
    deleteCombo,
  };
}
