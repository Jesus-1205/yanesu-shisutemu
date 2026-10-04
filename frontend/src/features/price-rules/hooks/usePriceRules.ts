import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { PriceRuleOut } from "@/types/api";

export function usePriceRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<PriceRuleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPriceRules();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reglas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const deleteRule = async (id: number): Promise<boolean> => {
    setDeleting(true);
    try {
      await api.deletePriceRule(id);
      toast("Regla de precio eliminada", "success");
      await fetchRules();
      return true;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar regla de precio",
        "error"
      );
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const activeRulesCount = rules.filter((r) => r.activo).length;

  return {
    rules,
    loading,
    error,
    deleting,
    activeRulesCount,
    fetchRules,
    deleteRule,
  };
}
