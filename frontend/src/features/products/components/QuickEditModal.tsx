import { useState, useEffect, useMemo, useId } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import type { Product } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { useToast } from "@/ui-components/Toast";
import { useMarginInput } from "../hooks/useMarginInput";

interface QuickEditModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product | null;
  role?: "admin" | "operator";
}

interface FormState {
  stock_unidades: number | "";
  precio_costo_caja_usd: number | "";
  precio_unidad_usd: number | "";
  precio_caja_usd: number | "";
}

function calcCostoUnitario(costoCaja: number, udsPorCaja: number): number {
  return costoCaja > 0 && udsPorCaja > 0 ? Math.round((costoCaja / udsPorCaja) * 100) / 100 : 0;
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
  const { toast } = useToast();
  const uid = useId();
  const [form, setForm] = useState<FormState>({
    stock_unidades: product?.stock_unidades ?? 0,
    precio_costo_caja_usd: Math.round(Number(product?.precio_costo_caja_usd) * 100) / 100 || 0,
    precio_unidad_usd: Math.round(Number(product?.precio_unidad_usd) * 100) / 100 || 0,
    precio_caja_usd: Math.round(Number(product?.precio_caja_usd) * 100) / 100 || 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    setForm({
      stock_unidades: product.stock_unidades,
      precio_costo_caja_usd: Math.round(Number(product.precio_costo_caja_usd) * 100) / 100 || 0,
      precio_unidad_usd: Math.round(Number(product.precio_unidad_usd) * 100) / 100 || 0,
      precio_caja_usd: Math.round(Number(product.precio_caja_usd) * 100) / 100 || 0,
    });
  }, [product, open]);

  const n = (v: number | ""): number => (v === "" ? 0 : v);

  const udsPorCaja = product?.unidades_por_caja ?? 1;

  const precioCostoUnitario = useMemo(
    () => calcCostoUnitario(n(form.precio_costo_caja_usd), udsPorCaja),
    [form.precio_costo_caja_usd, udsPorCaja],
  );

  const unitMargin = useMarginInput(
    precioCostoUnitario,
    n(form.precio_unidad_usd),
    (p) => setForm((prev) => ({ ...prev, precio_unidad_usd: p })),
  );

  const boxMargin = useMarginInput(
    n(form.precio_costo_caja_usd),
    n(form.precio_caja_usd),
    (p) => setForm((prev) => ({ ...prev, precio_caja_usd: p })),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      const costo = n(form.precio_costo_caja_usd);
      if (Math.abs(costo - Number(product.precio_costo_caja_usd)) > 0.01)
        payload.precio_costo_caja_usd = costo;
      const pu = n(form.precio_unidad_usd);
      if (Math.abs(pu - Number(product.precio_unidad_usd)) > 0.01)
        payload.precio_unidad_usd = pu;
      const pc = n(form.precio_caja_usd);
      if (Math.abs(pc - Number(product.precio_caja_usd)) > 0.01)
        payload.precio_caja_usd = pc;
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      await api.updateProduct(product.id, payload);
      toast("Producto actualizado", "success");
      onSaved();
      onClose();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar producto",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

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
            <p className="text-sm font-medium text-text-main truncate">
              {product?.nombre ?? "—"}
            </p>
            {product?.codigo_barra && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Código: {product.codigo_barra}
              </p>
            )}
          </div>

          <div className="grid gap-3 grid-cols-3">
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
                className={inputBase}
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
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
                className={inputBase}
              />
            </div>
          </div>

          {role === "admin" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelBase}>Margen unidad</span>
                <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={unitMargin.input}
                    placeholder="0.0"
                    onFocus={unitMargin.onFocus}
                    onChange={(e) => unitMargin.onChange(e.target.value)}
                    onBlur={unitMargin.onBlur}
                    className="w-14 bg-transparent text-sm text-text-main outline-none text-right font-mono"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <Badge variant={unitMargin.margin.color}>{unitMargin.margin.label}</Badge>
                </div>
              </div>
              <div>
                <span className={labelBase}>Margen caja</span>
                <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={boxMargin.input}
                    placeholder="0.0"
                    onFocus={boxMargin.onFocus}
                    onChange={(e) => boxMargin.onChange(e.target.value)}
                    onBlur={boxMargin.onBlur}
                    className="w-14 bg-transparent text-sm text-text-main outline-none text-right font-mono"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <Badge variant={boxMargin.margin.color}>{boxMargin.margin.label}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <Link
            to={product ? `/products/${product.id}/edit` : "#"}
            onClick={onClose}
            className="text-xs text-brand-blue hover:text-blue-700 underline underline-offset-2 transition-colors"
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
