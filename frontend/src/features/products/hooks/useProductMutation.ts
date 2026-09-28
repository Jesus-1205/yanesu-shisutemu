import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { ProductCreate } from "@/types/api";

interface UseProductMutationOptions {
  redirectTo?: string;
}

export function useProductMutation(options?: UseProductMutationOptions) {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectTo = options?.redirectTo ?? "/products";

  const createProduct = async (payload: ProductCreate): Promise<boolean> => {
    setSaving(true);
    try {
      await api.createProduct(payload);
      toast("Producto creado", "success");
      navigate(redirectTo);
      return true;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al crear producto",
        "error",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = async (
    id: number,
    payload: ProductCreate,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.updateProduct(id, payload);
      toast("Producto actualizado", "success");
      navigate(redirectTo);
      return true;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar producto",
        "error",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    createProduct,
    updateProduct,
  };
}
