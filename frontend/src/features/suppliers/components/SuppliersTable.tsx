import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import type { Supplier } from "../types";

interface SuppliersTableProps {
  suppliers: Supplier[];
  loading: boolean;
  onRowClick?: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

export default function SuppliersTable({
  suppliers,
  loading,
  onRowClick,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  const columns: Column<Supplier>[] = useMemo(
    () => [
      { key: "nombre", header: "Nombre" },
      { key: "telefono", header: "Teléfono", render: (s: Supplier) => s.telefono || "—" },
      { key: "email", header: "Email", render: (s: Supplier) => s.email || "—" },
      {
        key: "acciones",
        header: "Acciones",
        render: (s: Supplier) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Editar proveedor"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(s);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Eliminar proveedor"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s);
              }}
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  return (
    <Table
      columns={columns}
      data={suppliers}
      keyExtractor={(s) => s.id}
      loading={loading}
      emptyMessage="No hay proveedores registrados"
      onRowClick={onRowClick}
      className="!rounded-none !border-0 !shadow-none"
    />
  );
}
