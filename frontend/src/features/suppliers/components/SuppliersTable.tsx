import { useMemo } from "react";
import { Pencil, Trash2, Building2, ChevronRight } from "lucide-react";
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
      {
        key: "nombre",
        header: "Nombre",
        render: (s: Supplier) => (
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{s.nombre}</p>
            </div>
          </div>
        ),
      },
      {
        key: "telefono",
        header: "Teléfono",
        render: (s: Supplier) => (
          <span className={s.telefono ? "text-xs font-medium text-slate-600" : "text-slate-400 font-mono"}>
            {s.telefono || "—"}
          </span>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (s: Supplier) => (
          <span className={s.email ? "text-xs font-medium text-slate-600" : "text-slate-400 font-mono"}>
            {s.email || "—"}
          </span>
        ),
      },
      {
        key: "detalle",
        header: "",
        className: "text-right w-24 hidden md:table-cell",
        render: () => (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-brand-blue">
            Analítica
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        ),
      },
      {
        key: "acciones",
        header: "Acciones",
        className: "text-right w-24",
        render: (s: Supplier) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Editar proveedor"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(s);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50/80 hover:text-brand-blue"
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
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/80 hover:text-danger"
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
