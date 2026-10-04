import { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import type { Product } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { useMarginInput } from "./useMarginInput";

export interface FormState {
  stock_unidades: number | "";
  precio_costo_caja_usd: number | "";
  precio_unidad_usd: number | "";
  precio_caja_usd: number | "";
}

export function calcCostoUnitario(costoCaja: number, udsPorCaja: number): number {
  return costoCaja > 0 && udsPorCaja > 0 ? Math.round((costoCaja / udsPorCaja) * 100) / 100 : 0;
}

export const n = (v: number | ""): number => (v === "" ? 0 : v);

export interface UseQuickEditFormProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function useQuickEditForm({
  product,
  open,
  onClose,
  onSaved,
}: UseQuickEditFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({
    stock_unidades: product?.stock_unidades ?? 0,
    precio_costo_caja_usd: Math.round(Number(product?.precio_costo_caja_usd) * 100) / 100 || 0,
    precio_unidad_usd: Math.round(Number(product?.precio_unidad_usd) * 100) / 100 || 0,
    precio_caja_usd: Math.round(Number(product?.precio_caja_usd) * 100) / 100 || 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    setForm({
      stock_unidades: product.stock_unidades,
      precio_costo_caja_usd: Math.round(Number(product.precio_costo_caja_usd) * 100) / 100 || 0,
      precio_unidad_usd: Math.round(Number(product.precio_unidad_usd) * 100) / 100 || 0,
      precio_caja_usd: Math.round(Number(product.precio_caja_usd) * 100) / 100 || 0,
    });
  }, [product, open]);

  const udsPorCaja = product?.unidades_por_caja ?? 1;

  const precioCostoUnitario = useMemo(
    () => calcCostoUnitario(n(form.precio_costo_caja_usd), udsPorCaja),
    [form.precio_costo_caja_usd, udsPorCaja],
  );

  const unitMargin = useMarginInput(
    precioCostoUnitario,
    n(form.precio_unidad_usd),
    (p) => setForm((prev) => ({ ...prev, precio_unidad_usd: p })),
  );

  const boxMargin = useMarginInput(
    n(form.precio_costo_caja_usd),
    n(form.precio_caja_usd),
    (p) => setForm((prev) => ({ ...prev, precio_caja_usd: p })),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      const costo = n(form.precio_costo_caja_usd);
      if (Math.abs(costo - Number(product.precio_costo_caja_usd)) > 0.01)
        payload.precio_costo_caja_usd = costo;
      const pu = n(form.precio_unidad_usd);
      if (Math.abs(pu - Number(product.precio_unidad_usd)) > 0.01)
        payload.precio_unidad_usd = pu;
      const pc = n(form.precio_caja_usd);
      if (Math.abs(pc - Number(product.precio_caja_usd)) > 0.01)
        payload.precio_caja_usd = pc;
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      await api.updateProduct(product.id, payload);
      toast("Producto actualizado", "success");
      onSaved();
      onClose();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar producto",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setForm,
    saving,
    precioCostoUnitario,
    unitMargin,
    boxMargin,
    handleSubmit,
  };
}
