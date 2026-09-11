import { useState, useId } from "react";
import { Plus } from "lucide-react";
import type { CategoryOut, SupplierOut } from "@/types/api";
import type { ProductFormData } from "../types";
import type { useProductForm } from "../hooks/useProductForm";
import Select from "@/ui-components/Select";
import Combobox from "@/ui-components/Combobox";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";
import { n } from "../hooks/useProductForm";

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

const labelBase = "block text-xs font-medium text-slate-700 mb-1";
const cardBase = "rounded-xl border border-slate-200 bg-surface p-5 space-y-4";

interface ProductFormProps {
  form: ProductFormData;
  setField: ReturnType<typeof useProductForm>["setField"];
  setForm: ReturnType<typeof useProductForm>["setForm"];
  numChange: ReturnType<typeof useProductForm>["numChange"];
  categories: CategoryOut[];
  suppliers: SupplierOut[];
  precioCostoUnitario: number;
  unitMargin: ReturnType<typeof useProductForm>["unitMargin"];
  boxMargin: ReturnType<typeof useProductForm>["boxMargin"];
  precioSugerido: number;
  precioSugeridoCaja: number;
  onCategoryCreated: (cat: CategoryOut) => void;
  onSupplierCreated: (sup: SupplierOut) => void;
  isOperator: boolean;
  saving: boolean;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function ProductForm({
  form,
  setField,
  setForm,
  numChange,
  categories,
  suppliers,
  precioCostoUnitario,
  unitMargin,
  boxMargin,
  precioSugerido,
  precioSugeridoCaja,
  onCategoryCreated,
  onSupplierCreated,
  isOperator,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const uid = useId();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const fieldId = (name: string) => `${uid}-${name}`;

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.nombre }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.nombre }));

  const handleCategoryCreated = (cat: CategoryOut) => {
    onCategoryCreated(cat);
    setCategoryModalOpen(false);
  };

  const handleSupplierCreated = (sup: SupplierOut) => {
    onSupplierCreated(sup);
    setSupplierModalOpen(false);
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardBase}>
          <h3 className="text-sm font-semibold tracking-wide text-text-main uppercase">
            Información General
          </h3>
          <div>
            <label htmlFor={fieldId("nombre")} className={labelBase}>Nombre</label>
            <input
              id={fieldId("nombre")}
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              placeholder="ej: Ron Santa Teresa Añejo"
              required
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor={fieldId("codigo")} className={labelBase}>Código de barra</label>
            <input
              id={fieldId("codigo")}
              value={form.codigo_barra}
              onChange={(e) => setField("codigo_barra", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Opcional"
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelBase}>Categorías</label>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="cursor-pointer text-brand-blue transition-colors hover:text-blue-800"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <MultiSelectTags
              selected={form.categoria_ids}
              options={categoryOptions}
              onChange={(ids) => setField("categoria_ids", ids)}
              placeholder="Seleccionar categorías..."
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelBase}>Proveedor</label>
              <button
                type="button"
                onClick={() => setSupplierModalOpen(true)}
                className="cursor-pointer text-brand-blue transition-colors hover:text-blue-800"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Combobox
              value={form.proveedor_id}
              options={supplierOptions}
              onChange={(val) => setField("proveedor_id", val as number | null)}
              placeholder="Buscar proveedor..."
              clearLabel="Sin proveedor"
            />
          </div>
          {!isOperator && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor={fieldId("stock-cajas")} className={labelBase}>Stock cajas</label>
                <input
                  id={fieldId("stock-cajas")}
                  type="number"
                  min="0"
                  value={form.stock_cajas}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      stock_cajas: raw === "" ? "" : e.target.valueAsNumber,
                    }));
                  }}
                  autoComplete="off"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor={fieldId("stock")} className={labelBase}>Stock unidades</label>
                <input
                  id={fieldId("stock")}
                  type="number"
                  min="0"
                  value={form.stock_unidades}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      stock_unidades: raw === "" ? "" : e.target.valueAsNumber,
                    }));
                  }}
                  autoComplete="off"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor={fieldId("stock-min")} className={labelBase}>Stock mínimo</label>
                <input
                  id={fieldId("stock-min")}
                  type="number"
                  min="0"
                  value={form.stock_minimo}
                  onChange={numChange("stock_minimo")}
                  autoComplete="off"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor={fieldId("uds-caja")} className={labelBase}>Unidades/caja</label>
                <input
                  id={fieldId("uds-caja")}
                  type="number"
                  min="1"
                  value={form.unidades_por_caja}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setField("unidades_por_caja", raw === "" ? "" : e.target.valueAsNumber);
                  }}
                  autoComplete="off"
                  className={inputBase}
                />
              </div>
            </div>
          )}
          {isOperator && (
            <div>
              <label htmlFor={fieldId("uds-caja")} className={labelBase}>Unidades/caja</label>
              <input
                id={fieldId("uds-caja")}
                type="number"
                min="1"
                value={form.unidades_por_caja}
                onChange={(e) => {
                  const raw = e.target.value;
                  setField("unidades_por_caja", raw === "" ? "" : e.target.valueAsNumber);
                }}
                autoComplete="off"
                className={inputBase}
              />
            </div>
          )}
        </div>

        <div className={cardBase}>
          <h3 className="text-sm font-semibold tracking-wide text-text-main uppercase">
            {isOperator ? "Precios" : "Precios y Finanzas"}
          </h3>
          <div>
            <label htmlFor={fieldId("costo-caja")} className={labelBase}>Costo por caja USD</label>
            <input
              id={fieldId("costo-caja")}
              type="number"
              step="0.01"
              min="0"
              value={form.precio_costo_caja_usd}
              onChange={numChange("precio_costo_caja_usd")}
              required
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <span className={labelBase}>Costo por unidad USD</span>
            <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-600">
              ${precioCostoUnitario.toFixed(2)}
              <span className="ml-auto text-[11px] text-slate-400">
                {n(form.precio_costo_caja_usd) > 0 && n(form.unidades_por_caja) > 0
                  ? `${n(form.precio_costo_caja_usd).toFixed(2)} ÷ ${n(form.unidades_por_caja)} uds`
                  : "—"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!isOperator && (
              <div>
                <span className={labelBase}>Precio sugerido unidad USD</span>
                <div className="flex h-10 items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm">
                  <span className="font-mono font-medium text-blue-700">
                    ${precioSugerido.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-blue-500">30% margen obj.</span>
                </div>
              </div>
            )}
            <div>
              <label htmlFor={fieldId("precio-u")} className={labelBase}>Precio unidad USD</label>
              <div className="flex gap-2">
                <input
                  id={fieldId("precio-u")}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.precio_unidad_usd}
                  onChange={numChange("precio_unidad_usd")}
                  required
                  autoComplete="off"
                  className={`${inputBase} flex-1`}
                />
                {!isOperator && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs whitespace-nowrap"
                    onClick={() => setField("precio_unidad_usd", precioSugerido)}
                    disabled={precioSugerido <= 0}
                  >
                    Copiar
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!isOperator && (
              <div>
                <span className={labelBase}>Precio sugerido caja USD</span>
                <div className="flex h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 font-mono text-sm text-blue-700">
                  ${precioSugeridoCaja.toFixed(2)}
                </div>
              </div>
            )}
            <div>
              <label htmlFor={fieldId("precio-c")} className={labelBase}>Precio caja USD</label>
              <div className="flex gap-2">
                <input
                  id={fieldId("precio-c")}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.precio_caja_usd}
                  onChange={numChange("precio_caja_usd")}
                  required
                  autoComplete="off"
                  className={`${inputBase} flex-1`}
                />
                {!isOperator && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs whitespace-nowrap"
                    onClick={() => setField("precio_caja_usd", precioSugeridoCaja)}
                    disabled={precioSugeridoCaja <= 0}
                  >
                    Copiar
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div>
            <Select
              label="Tipo de IVA"
              value={form.tipo_iva}
              onChange={(e) => setField("tipo_iva", e.target.value as "GRAVADO" | "EXENTO")}
              options={[
                { value: "GRAVADO", label: "Gravado" },
                { value: "EXENTO", label: "Exento" },
              ]}
            />
          </div>
          {!isOperator && (
            <div className="grid grid-cols-2 gap-4">
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
                    className="w-16 bg-transparent text-right font-mono text-sm text-text-main outline-none"
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
                    className="w-16 bg-transparent text-right font-mono text-sm text-text-main outline-none"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <Badge variant={boxMargin.margin.color}>{boxMargin.margin.label}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" loading={saving}>
          {submitLabel}
        </Button>
      </div>

      <CreateCategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={handleCategoryCreated}
      />
      <CreateSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
      />
    </form>
  );
}
