import { Pencil, Trash2, Tag, CreditCard } from "lucide-react";
import type { PriceRuleOut } from "@/types/api";
import Table from "@/ui-components/Table";
import Badge from "@/ui-components/Badge";
import { formatCurrency } from "@/lib/utils";

interface PriceRulesTableProps {
  rules: PriceRuleOut[];
  loading: boolean;
  onEdit: (rule: PriceRuleOut) => void;
  onDelete: (rule: PriceRuleOut) => void;
}

export function PriceRulesTable({
  rules,
  loading,
  onEdit,
  onDelete,
}: PriceRulesTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-surface shadow-sm">
      <Table
        columns={[
          {
            key: "nombre",
            header: "Nombre / Detalle",
            className: "min-w-44",
            render: (r: PriceRuleOut) => (
              <div>
                <p className="font-semibold text-text-main">{r.nombre}</p>
                {r.descripcion && (
                  <p className="mt-0.5 text-xs text-slate-500">{r.descripcion}</p>
                )}
              </div>
            ),
          },
          {
            key: "productos",
            header: "Productos y Precios",
            render: (r: PriceRuleOut) => (
              <div className="flex max-w-lg flex-wrap gap-1.5 py-1">
                {r.products.map((p) => (
                  <span
                    key={`${p.producto_id}-${p.tipo_empaque}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                  >
                    <Tag className="size-3 text-brand-blue" />
                    <span className="font-medium text-text-main">{p.producto_nombre}</span>
                    <span className="rounded bg-slate-200/70 px-1 py-0.2 text-[10px] uppercase text-slate-600">
                      {p.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(p.precio_usd)}
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
            render: (r: PriceRuleOut) => (
              <div className="flex flex-wrap gap-1">
                {r.payment_methods.map((pm) => (
                  <span
                    key={pm.metodo_pago_id}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue ring-1 ring-blue-500/10"
                  >
                    <CreditCard className="size-3" />
                    {pm.metodo_pago_nombre}
                  </span>
                ))}
              </div>
            ),
          },
          {
            key: "activo",
            header: "Estado",
            className: "text-center w-24",
            render: (r: PriceRuleOut) => (
              <Badge variant={r.activo ? "success" : "neutral"}>
                {r.activo ? "Activa" : "Inactiva"}
              </Badge>
            ),
          },
          {
            key: "acciones",
            header: "",
            exportable: false,
            className: "text-right w-24",
            render: (r: PriceRuleOut) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onEdit(r)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                  aria-label="Editar regla"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => onDelete(r)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label="Eliminar regla"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={rules}
        keyExtractor={(r) => r.id}
        loading={loading}
        emptyMessage="No hay reglas de precio registradas"
      />
    </div>
  );
}
