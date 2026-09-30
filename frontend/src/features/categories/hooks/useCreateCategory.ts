import { useState } from "react";
import { api } from "@/services/api";
import type { CategoryCreate, CategoryOut } from "@/types/api";

interface UseCreateCategoryOptions {
  onSuccess?: (category: CategoryOut) => void;
}

export function useCreateCategory(options: UseCreateCategoryOptions = {}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCategory = async (
    data: CategoryCreate,
  ): Promise<CategoryOut | null> => {
    setSaving(true);
    setError(null);
    try {
      const category = await api.createCategory({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
      });
      options.onSuccess?.(category);
      return category;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al crear categoría";
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
    createCategory,
    clearError,
    setError,
  };
}
