import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut as Product } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

export function useCatalogMutations(
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = useCallback((product: Product) => {
    setDeleteTarget(product);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleToggleFavorite = useCallback(
    async (product: Product) => {
      try {
        const updated = await api.toggleProductFavorite(product.id);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, es_favorito: updated.es_favorito } : p,
          ),
        );
        toast(
          updated.es_favorito
            ? `"${product.nombre}" agregado a favoritos`
            : `"${product.nombre}" removido de favoritos`,
          "success",
        );
      } catch {
        toast("Error al actualizar favorito", "error");
      }
    },
    [setProducts, toast],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast(`Producto "${deleteTarget.nombre}" eliminado`, "success");
      setDeleteTarget(null);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar producto",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, setProducts, toast]);

  return {
    deleteTarget,
    requestDelete,
    cancelDelete,
    deleting,
    handleToggleFavorite,
    handleDelete,
  };
}

export type UseCatalogMutationsReturn = ReturnType<typeof useCatalogMutations>;
