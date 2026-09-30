import { useState } from "react";
import { api } from "@/services/api";
import type { CategoryUpdate, CategoryOut } from "@/types/api";

interface UseUpdateCategoryOptions {
  onSuccess?: (category: CategoryOut) => void;
}

export function useUpdateCategory(options: UseUpdateCategoryOptions = {}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCategory = async (
    id: number,
    data: CategoryUpdate,
  ): Promise<CategoryOut | null> => {
    setSaving(true);
    setError(null);
    try {
      const category = await api.updateCategory(id, {
        nombre: data.nombre !== undefined ? data.nombre.trim() : undefined,
        descripcion:
          data.descripcion !== undefined
            ? data.descripcion?.trim() || null
            : undefined,
      });
      options.onSuccess?.(category);
      return category;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar categoría";
      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const clearError = () => setError(null);

  return {
    saving,
    error,
    updateCategory,
    clearError,
    setError,
  };
}
