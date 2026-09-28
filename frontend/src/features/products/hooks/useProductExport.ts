import { useCallback, useMemo } from "react";
import { api } from "@/services/api";
import type { ProductOut as Product, SupplierOut } from "@/types/api";
import type { Column } from "@/ui-components/Table";
import { useToast } from "@/ui-components/Toast";
import { exportToExcel } from "@/lib/exportToExcel";

const EXPORT_PAGE_SIZE = 200;

export function useProductExport(suppliers: SupplierOut[]) {
  const { toast } = useToast();

  const exportColumns: Column<Product>[] = useMemo(
    () => [
      { key: "codigo_barra", header: "Código de Barra" },
      { key: "nombre", header: "Nombre" },
      {
        key: "categorias",
        header: "Categorías",
        render: (p: Product) => p.categories.map((c) => c.nombre).join(", "),
      },
      {
        key: "unidades_por_caja",
        header: "Unidades/Caja",
        exportValue: (p: Product) => p.unidades_por_caja,
      },
      {
        key: "stock_unidades",
        header: "Stock (uds)",
        exportValue: (p: Product) => p.stock_unidades,
      },
      {
        key: "stock_minimo",
        header: "Stock Mínimo",
        exportValue: (p: Product) => p.stock_minimo,
      },
      {
        key: "precio_costo_caja_usd",
        header: "Costo Caja USD",
        exportValue: (p: Product) => Number(p.precio_costo_caja_usd),
      },
      {
        key: "precio_costo_usd",
        header: "Costo Unidad USD",
        exportValue: (p: Product) => Number(p.precio_costo_usd),
      },
      {
        key: "precio_unidad_usd",
        header: "Precio Unidad USD",
        exportValue: (p: Product) => Number(p.precio_unidad_usd),
      },
      {
        key: "precio_caja_usd",
        header: "Precio Caja USD",
        exportValue: (p: Product) => Number(p.precio_caja_usd),
      },
      {
        key: "proveedor_id",
        header: "Proveedor",
        render: (p: Product) =>
          suppliers.find((s) => s.id === p.proveedor_id)?.nombre || "—",
      },
      { key: "tipo_iva", header: "Tipo IVA" },
    ],
    [suppliers],
  );

  const handleExportAll = useCallback(async () => {
    try {
      const allProducts: Product[] = [];
      let currentPage = 1;
      let pages = 1;
      do {
        const result = await api.getProducts({
          page: currentPage,
          page_size: EXPORT_PAGE_SIZE,
        });
        allProducts.push(...result.items);
        pages = result.pages;
        currentPage += 1;
      } while (currentPage <= pages);
      const name = exportToExcel({
        data: allProducts,
        columns: exportColumns,
        filename: "Productos",
      });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar productos", "error");
    }
  }, [exportColumns, toast]);

  return { exportColumns, handleExportAll };
}

export type UseProductExportReturn = ReturnType<typeof useProductExport>;
