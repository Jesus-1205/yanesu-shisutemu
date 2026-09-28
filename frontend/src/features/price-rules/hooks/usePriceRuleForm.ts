import { useCallback, useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type {
  PaymentMethodOut,
  PriceRuleCreate,
  PriceRuleOut,
  PriceRuleUpdate,
} from "@/types/api";
import type { FormProductEntry } from "../types";

export function usePriceRuleForm(initialRule?: PriceRuleOut | null) {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [formName, setFormName] = useState(initialRule?.nombre ?? "");
  const [formDesc, setFormDesc] = useState(initialRule?.descripcion ?? "");
  const [formProductEntries, setFormProductEntries] = useState<FormProductEntry[]>(
    initialRule?.products.map((p) => ({
      producto_id: p.producto_id,
      tipo_empaque: p.tipo_empaque as "UNIDAD" | "CAJA",
      precio_usd: p.precio_usd,
      _nombre: p.producto_nombre,
    })) ?? []
  );
  const [formMethodIds, setFormMethodIds] = useState<number[]>(
    initialRule?.payment_methods.map((pm) => pm.metodo_pago_id) ?? []
  );
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback((rule?: PriceRuleOut | null) => {
    if (rule) {
      setFormName(rule.nombre);
      setFormDesc(rule.descripcion ?? "");
      setFormProductEntries(
        rule.products.map((p) => ({
          producto_id: p.producto_id,
          tipo_empaque: p.tipo_empaque as "UNIDAD" | "CAJA",
          precio_usd: p.precio_usd,
          _nombre: p.producto_nombre,
        }))
      );
      setFormMethodIds(rule.payment_methods.map((pm) => pm.metodo_pago_id));
    } else {
      setFormName("");
      setFormDesc("");
      setFormProductEntries([]);
      setFormMethodIds([]);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    setLoadingMethods(true);
    try {
      const methods = await api.getPaymentMethods(true);
      setPaymentMethods(methods);
    } catch {
      toast("Error al cargar métodos de pago", "error");
    } finally {
      setLoadingMethods(false);
    }
  }, [toast]);

  const handleProductSearch = useCallback(async (query: string) => {
    const data = await api.getProducts({ search: query || undefined });
    return data.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  }, []);

  const addProductEntry = () => {
    setFormProductEntries((prev) => [
      ...prev,
      { producto_id: 0, tipo_empaque: "UNIDAD", precio_usd: 0, _nombre: undefined },
    ]);
  };

  const updateProductEntry = (index: number, field: string, value: unknown) => {
    setFormProductEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const removeProductEntry = (index: number) => {
    setFormProductEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMethod = (id: number) => {
    setFormMethodIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const isFormValid =
    formName.trim().length > 0 &&
    formProductEntries.length > 0 &&
    formMethodIds.length > 0 &&
    !formProductEntries.some((e) => e.producto_id === 0 || e.precio_usd <= 0);

  const saveRule = async (editingRuleId?: number): Promise<boolean> => {
    if (!isFormValid) return false;

    setSaving(true);
    try {
      const productos = formProductEntries.map(({ _nombre, ...rest }) => rest);
      if (editingRuleId) {
        const data: PriceRuleUpdate = {
          nombre: formName.trim(),
          descripcion: formDesc.trim() || null,
          productos,
          metodo_pago_ids: formMethodIds,
        };
        await api.updatePriceRule(editingRuleId, data);
        toast("Regla de precio actualizada", "success");
      } else {
        const data: PriceRuleCreate = {
          nombre: formName.trim(),
          descripcion: formDesc.trim() || null,
          productos,
          metodo_pago_ids: formMethodIds,
        };
        await api.createPriceRule(data);
        toast("Regla de precio creada", "success");
      }
      return true;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar regla de precio",
        "error"
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    paymentMethods,
    loadingMethods,
    formName,
    setFormName,
    formDesc,
    setFormDesc,
    formProductEntries,
    formMethodIds,
    saving,
    isFormValid,
    resetForm,
    loadPaymentMethods,
    handleProductSearch,
    addProductEntry,
    updateProductEntry,
    removeProductEntry,
    toggleMethod,
    saveRule,
  };
}
