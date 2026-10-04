import { useRetornableProductos } from "../hooks/useRetornable";
import { ProductosAsociadosTab } from "./ProductosAsociadosTab";

export function ProductosTab() {
  const productos = useRetornableProductos();

  return (
    <ProductosAsociadosTab
      productos={productos.data ?? []}
      loading={productos.loading}
      onRefresh={productos.refetch}
    />
  );
}
