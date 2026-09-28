import { Pencil, Trash2 } from "lucide-react";
import type { PaymentMethod } from "../types";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";

interface PaymentMethodsTableProps {
  methods: PaymentMethod[];
  loading: boolean;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
}

export function PaymentMethodsTable({
  methods,
  loading,
  onEdit,
  onDelete,
}: PaymentMethodsTableProps) {
  return (
    <Table
      columns={[
        { key: "nombre", header: "Nombre" },
        {
          key: "moneda_default",
          header: "Moneda",
          render: (m: PaymentMethod) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                m.moneda_default === "USD"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {m.moneda_default}
            </span>
          ),
        },
        {
          key: "acepta_referencia",
          header: "Referencia",
          render: (m: PaymentMethod) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                m.acepta_referencia
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {m.acepta_referencia ? "Sí" : "No"}
            </span>
          ),
        },
        {
          key: "activo",
          header: "Estado",
          render: (m: PaymentMethod) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                m.activo
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {m.activo ? "Activo" : "Inactivo"}
            </span>
          ),
        },
        {
          key: "acciones",
          header: "Acciones",
          exportable: false,
          render: (m: PaymentMethod) => (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(m)}
                aria-label={`Editar ${m.nombre}`}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(m)}
                aria-label={`Eliminar ${m.nombre}`}
              >
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          ),
        },
      ]}
      data={methods}
      keyExtractor={(m) => m.id}
      loading={loading}
      emptyMessage="No hay métodos de pago registrados"
    />
  );
}
