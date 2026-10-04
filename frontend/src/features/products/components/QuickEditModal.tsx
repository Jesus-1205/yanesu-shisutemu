import { useId } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { useQuickEditForm } from "../hooks/useQuickEditForm";

interface QuickEditModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product | null;
  role?: "admin" | "operator";
}

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

const labelBase = "block text-xs font-medium text-slate-700 mb-1";

export default function QuickEditModal({
  open,
  onClose,
  onSaved,
  product,
  role = "admin",
}: QuickEditModalProps) {
  const uid = useId();
  const {
    form,
    setForm,
    saving,
    precioCostoUnitario,
    unitMargin,
    boxMargin,
    handleSubmit,
  } = useQuickEditForm({
    product,
    open,
    onClose,
    onSaved,
  });

  const id = (name: string) => `${uid}-${name}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Producto"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="space-y-4">
          <div>
            <p className="truncate text-sm font-medium text-text-main">
              {product?.nombre ?? "—"}
            </p>
            {product?.codigo_barra && (
              <p className="mt-0.5 font-mono text-xs text-slate-400">
                Código: {product.codigo_barra}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor={id("costo")} className={labelBase}>Costo caja USD</label>
              <input
                id={id("costo")}
                type="number"
                step="0.01"
                min="0.01"
                value={form.precio_costo_caja_usd}
                onChange={(e) => {
                  const raw = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    precio_costo_caja_usd: raw === "" ? "" : e.target.valueAsNumber,
                  }));
                }}
                autoComplete="off"
                className={inputBase}
              />
              <p className="mt-0.5 text-[11px] text-slate-400">
                ${precioCostoUnitario.toFixed(2)} / ud
              </p>
            </div>
            <div>
              <label htmlFor={id("precio-u")} className={labelBase}>Precio unidad USD</label>
              <input
                id={id("precio-u")}
                type="number"
                  step="0.01"
                min="0.01"
                value={form.precio_unidad_usd}
                onChange={(e) => {
                  const raw = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    precio_unidad_usd: raw === "" ? "" : e.target.valueAsNumber,
                  }));
                }}
                autoComplete="off"
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor={id("precio-c")} className={labelBase}>Precio caja USD</label>
              <input
                id={id("precio-c")}
                type="number"
                step="0.01"
                min="0.01"
                value={form.precio_caja_usd}
                onChange={(e) => {
                  const raw = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    precio_caja_usd: raw === "" ? "" : e.target.valueAsNumber,
                  }));
                }}
                autoComplete="off"
                className={inputBase}
              />
            </div>
          </div>

          {role === "admin" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelBase}>Margen unidad</span>
                <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={unitMargin.input}
                    placeholder="0.0"
                    onFocus={unitMargin.onFocus}
                    onChange={(e) => unitMargin.onChange(e.target.value)}
                    onBlur={unitMargin.onBlur}
                    autoComplete="off"
                    className="w-14 bg-transparent text-right font-mono text-sm text-text-main outline-none"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <Badge variant={unitMargin.margin.color}>{unitMargin.margin.label}</Badge>
                </div>
              </div>
              <div>
                <span className={labelBase}>Margen caja</span>
                <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={boxMargin.input}
                    placeholder="0.0"
                    onFocus={boxMargin.onFocus}
                    onChange={(e) => boxMargin.onChange(e.target.value)}
                    onBlur={boxMargin.onBlur}
                    autoComplete="off"
                    className="w-14 bg-transparent text-right font-mono text-sm text-text-main outline-none"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <Badge variant={boxMargin.margin.color}>{boxMargin.margin.label}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <Link
            to={product ? `/products/${product.id}/edit` : "#"}
            onClick={onClose}
            className="text-xs text-brand-blue underline underline-offset-2 transition-colors hover:text-blue-700"
          >
            Edición completa →
          </Link>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" loading={saving}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}