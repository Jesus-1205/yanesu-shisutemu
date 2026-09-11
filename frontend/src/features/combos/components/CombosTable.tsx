import { CreditCard, Layers, Pencil, Trash2 } from "lucide-react";
import type { ComboOut, PaymentMethodOut } from "@/types/api";
import Table from "@/ui-components/Table";
import Badge from "@/ui-components/Badge";
import { formatCurrency } from "@/lib/utils";

interface CombosTableProps {
  combos: ComboOut[];
  loading: boolean;
  paymentMethods: PaymentMethodOut[];
  onEdit: (combo: ComboOut) => void;
  onDelete: (combo: ComboOut) => void;
}

export default function CombosTable({ combos, loading, paymentMethods, onEdit, onDelete }: CombosTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-surface shadow-sm">
      <Table
        columns={[
          {
            key: "nombre",
            header: "Nombre / Detalle",
            className: "min-w-44",
            render: (c: ComboOut) => (
              <div>
                <p className="font-semibold text-text-main">{c.nombre}</p>
                {c.descripcion && (
                  <p className="mt-0.5 text-xs text-slate-500">{c.descripcion}</p>
                )}
              </div>
            ),
          },
          {
            key: "precio_total_usd",
            header: "Precio Total",
            className: "w-28",
            render: (c: ComboOut) => (
              <span className="font-bold text-emerald-600 text-sm">
                {formatCurrency(c.precio_total_usd)}
              </span>
            ),
          },
          {
            key: "grupos",
            header: "Opciones y Grupos",
            render: (c: ComboOut) => (
              <div className="flex max-w-md flex-wrap gap-1.5 py-1">
                {c.groups.map((g, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                  >
                    <Layers className="size-3 text-brand-blue" />
                    <span className="font-medium text-text-main">{g.nombre}</span>
                    <span className="rounded bg-slate-200/70 px-1 py-0.5 text-[10px] text-slate-600">
                      {g.min_cantidad}–{g.max_cantidad} uds
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({g.products.length} {g.products.length === 1 ? "opción" : "opciones"})
                    </span>
                  </span>
                ))}
              </div>
            ),
          },
          {
            key: "metodos",
            header: "Métodos de Pago",
            hideOnMobile: true,
            render: (c: ComboOut) => (
              <div className="flex flex-wrap gap-1">
                {c.metodo_pago_ids.map((id) => {
                  const method = paymentMethods.find((pm) => pm.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue ring-1 ring-blue-500/10"
                    >
                      <CreditCard className="size-3" />
                      {method ? method.nombre : `#${id}`}
                    </span>
                  );
                })}
              </div>
            ),
          },
          {
            key: "activo",
            header: "Estado",
            className: "text-center w-24",
            render: (c: ComboOut) => (
              <Badge variant={c.activo ? "success" : "neutral"}>
                {c.activo ? "Activo" : "Inactivo"}
              </Badge>
            ),
          },
          {
            key: "acciones",
            header: "",
            exportable: false,
            className: "text-right w-24",
            render: (c: ComboOut) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onEdit(c)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                  aria-label="Editar combo"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => onDelete(c)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label="Eliminar combo"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={combos}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyMessage="No hay combos registrados"
      />
    </div>
  );
}
