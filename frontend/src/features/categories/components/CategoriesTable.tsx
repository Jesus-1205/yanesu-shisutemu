import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
      { key: "nombre", header: "Nombre" },
      {
        key: "descripcion",
        header: "Descripción",
        hideOnMobile: true,
        render: (cat: Category) => cat.descripcion || "—",
      },
      {
        key: "acciones",
        header: "Acciones",
        render: (cat: Category) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cat);
              }}
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
