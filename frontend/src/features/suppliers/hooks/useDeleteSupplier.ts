import { useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { Supplier } from "../types";

interface UseDeleteSupplierOptions {
  onSuccess?: () => void;
}

export function useDeleteSupplier(options: UseDeleteSupplierOptions = {}) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSupplier(deleteTarget.id);
      toast(`Proveedor "${deleteTarget.nombre}" eliminado`, "success");
      setDeleteTarget(null);
      options.onSuccess?.();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar proveedor",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  return {
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
    cancelDelete,
  };
}
