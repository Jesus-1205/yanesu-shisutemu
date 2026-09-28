import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut as Product } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { useProductsStore } from "../stores/useProductsStore";

export function useCatalogMutations(
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const deleteTarget = useProductsStore((s) => s.deleteTarget);
  const requestDelete = useProductsStore((s) => s.requestDelete);
  const cancelDelete = useProductsStore((s) => s.cancelDelete);

  const handleToggleFavorite = useCallback(
    async (product: Product) => {
      try {
        const updated = await api.toggleProductFavorite(product.id);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? { ...p, es_favorito: updated.es_favorito }
              : p,
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
    const target = useProductsStore.getState().deleteTarget;
    if (!target) return;
    setDeleting(true);
    try {
      await api.deleteProduct(target.id);
      setProducts((prev) => prev.filter((p) => p.id !== target.id));
      toast(`Producto "${target.nombre}" eliminado`, "success");
      useProductsStore.getState().cancelDelete();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar producto",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }, [setProducts, toast]);

  return {
    deleteTarget,
    deleting,
    requestDelete,
    cancelDelete,
    handleToggleFavorite,
    handleDelete,
  };
}

export type UseCatalogMutationsReturn = ReturnType<typeof useCatalogMutations>;
