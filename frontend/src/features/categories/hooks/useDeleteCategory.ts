import { useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { Category } from "../types";

interface UseDeleteCategoryOptions {
  onSuccess?: () => void;
}

export function useDeleteCategory(options: UseDeleteCategoryOptions = {}) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCategory(deleteTarget.id);
      toast(`Categoría "${deleteTarget.nombre}" eliminada`, "success");
      setDeleteTarget(null);
      options.onSuccess?.();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar categoría",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return {
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
  };
}
