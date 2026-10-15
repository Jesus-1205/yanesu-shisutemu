import { useMemo } from "react";
import { Pencil, Trash2, FolderTree, ChevronRight } from "lucide-react";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import type { Category } from "../types";

interface CategoriesTableProps {
  categories: Category[];
  loading: boolean;
  onRowClick?: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoriesTable({
  categories,
  loading,
  onRowClick,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  const columns: Column<Category>[] = useMemo(
    () => [
      {
        key: "nombre",
        header: "Nombre",
        render: (cat: Category) => (
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
              <FolderTree className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{cat.nombre}</p>
            </div>
          </div>
        ),
      },
      {
        key: "descripcion",
        header: "Descripción",
        hideOnMobile: true,
        render: (cat: Category) => (
          <span className={cat.descripcion ? "text-slate-600 text-xs" : "text-slate-400 font-mono"}>
            {cat.descripcion || "—"}
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
        render: (cat: Category) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cat);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50/80 hover:text-brand-blue"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(cat);
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
      data={categories}
      keyExtractor={(c) => c.id}
      loading={loading}
      emptyMessage="No hay categorías registradas"
      onRowClick={onRowClick}
      className="!rounded-none !border-0 !shadow-none"
    />
  );
}
