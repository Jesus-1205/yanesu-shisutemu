import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";
import { useToast } from "@/ui-components/Toast";
import type { Column } from "@/ui-components/Table";
import type { Supplier } from "../types";

const exportColumns: Column<Supplier>[] = [
  { key: "nombre", header: "Nombre" },
  { key: "telefono", header: "Teléfono" },
  { key: "email", header: "Email" },
];

export function useExportSuppliers() {
  const { toast } = useToast();

  const handleExportAll = async () => {
    try {
      const allSuppliers = await api.getSuppliers();
      const name = exportToExcel({
        data: allSuppliers,
        columns: exportColumns,
        filename: "Proveedores",
      });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar proveedores", "error");
    }
  };

  return {
    handleExportAll,
  };
}
