import type { UseProductFormReturn } from "../hooks/useProductForm";
import { n } from "../hooks/useProductForm";
import Select from "@/ui-components/Select";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelBase = "block text-xs font-medium text-slate-700 mb-1";
const cardBase = "rounded-xl border border-slate-200 bg-surface p-5 space-y-4";

interface ProductFormPricingProps {
  formAPI: UseProductFormReturn;
  isOperator: boolean;
  fieldId: (name: string) => string;
}

export function ProductFormPricing({
  formAPI,
  isOperator,
  fieldId,
}: ProductFormPricingProps) {
  const {
    form,
    setField,
    numChange,
    precioCostoUnitario,
    unitMargin,
    boxMargin,
    precioSugerido,
    precioSugeridoCaja,
  } = formAPI;

  return (
    <div className={cardBase}>
      <h3 className="text-sm font-semibold tracking-wide text-text-main uppercase">
        {isOperator ? "Precios" : "Precios y Finanzas"}
      </h3>
      <div>
        <label htmlFor={fieldId("costo-caja")} className={labelBase}>
          Costo por caja USD
        </label>
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
          <label htmlFor={fieldId("precio-u")} className={labelBase}>
            Precio unidad USD
          </label>
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
          <label htmlFor={fieldId("precio-c")} className={labelBase}>
            Precio caja USD
          </label>
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
  );
}
