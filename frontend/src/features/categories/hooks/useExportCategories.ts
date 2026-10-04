import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";
import { useToast } from "@/ui-components/Toast";
import type { Column } from "@/ui-components/Table";
import type { Category } from "../types";

const exportColumns: Column<Category>[] = [
  { key: "nombre", header: "Nombre" },
  { key: "descripcion", header: "Descripción" },
];

export function useExportCategories() {
  const { toast } = useToast();

  const handleExportAll = async () => {
    try {
      const allCategories = await api.getCategories();
      const name = exportToExcel({
        data: allCategories,
        columns: exportColumns,
        filename: "Categorias",
      });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar categorias", "error");
    }
  };

  return {
    handleExportAll,
  };
}
