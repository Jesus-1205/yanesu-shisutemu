import React from "react";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { useCreateProductContext } from "../context/CreateProductContext";
import { n } from "../hooks/useCreateProduct";

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const cardBase = "rounded-lg border border-slate-200 bg-surface p-4 space-y-3";

export const CreateProductPricingFields: React.FC = () => {
  const {
    formData,
    updateField,
    isOperator,
    costoUnitario,
    precioSugeridoUnidad,
    precioSugeridoCaja,
    margin,
  } = useCreateProductContext();

  return (
    <div className={cardBase}>
      <h4 className="text-xs font-semibold tracking-wide text-text-main uppercase">
        {isOperator ? "Precios" : "Precios y Finanzas"}
      </h4>

      <div>
        <label htmlFor="cp-costo-caja" className="mb-1 block text-xs font-medium text-slate-700">
          Costo por caja USD *
        </label>
        <input
          id="cp-costo-caja"
          type="number"
          step="0.01"
          min="0"
          value={formData.precio_costo_caja_usd}
          onChange={(e) =>
            updateField(
              "precio_costo_caja_usd",
              e.target.value === "" ? "" : Number(e.target.value),
            )
          }
          required
          autoComplete="off"
          className={inputBase}
          placeholder="0.00"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-slate-700">Costo por unidad USD</span>
        <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-600">
          <span>${costoUnitario > 0 ? costoUnitario.toFixed(2) : "—"}</span>
          {n(formData.precio_costo_caja_usd) > 0 && n(formData.unidades_por_caja) > 0 && (
            <span className="text-[11px] text-slate-400">
              ${n(formData.precio_costo_caja_usd).toFixed(2)} ÷ {n(formData.unidades_por_caja)} uds
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!isOperator && (
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Precio sugerido unidad USD
            </span>
            <div className="flex h-10 items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm">
              <span className="font-mono font-medium text-blue-700">
                ${precioSugeridoUnidad > 0 ? precioSugeridoUnidad.toFixed(2) : "—"}
              </span>
              <span className="text-[11px] text-blue-500">30% margen obj.</span>
            </div>
          </div>
        )}
        <div>
          <label htmlFor="cp-precio-u" className="mb-1 block text-xs font-medium text-slate-700">
            Precio unidad USD *
          </label>
          <div className="flex gap-2">
            <input
              id="cp-precio-u"
              type="number"
              step="0.01"
              min="0"
              value={formData.precio_unidad_usd}
              onChange={(e) =>
                updateField(
                  "precio_unidad_usd",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              required
              autoComplete="off"
              className={`${inputBase} flex-1`}
              placeholder="0.00"
            />
            {!isOperator && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs whitespace-nowrap"
                onClick={() => updateField("precio_unidad_usd", precioSugeridoUnidad)}
                disabled={precioSugeridoUnidad <= 0}
              >
                Copiar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!isOperator && (
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Precio sugerido caja USD
            </span>
            <div className="flex h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 font-mono text-sm text-blue-700">
              ${precioSugeridoCaja > 0 ? precioSugeridoCaja.toFixed(2) : "—"}
            </div>
          </div>
        )}
        <div>
          <label htmlFor="cp-precio-c" className="mb-1 block text-xs font-medium text-slate-700">
            Precio caja USD *
          </label>
          <div className="flex gap-2">
            <input
              id="cp-precio-c"
              type="number"
              step="0.01"
              min="0"
              value={formData.precio_caja_usd}
              onChange={(e) =>
                updateField(
                  "precio_caja_usd",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              required
              autoComplete="off"
              className={`${inputBase} flex-1`}
              placeholder="0.00"
            />
            {!isOperator && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs whitespace-nowrap"
                onClick={() => updateField("precio_caja_usd", precioSugeridoCaja)}
                disabled={precioSugeridoCaja <= 0}
              >
                Copiar
              </Button>
            )}
          </div>
        </div>
      </div>

      {!isOperator && (
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-700">Margen</span>
          <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
            <span className="font-medium text-slate-500">Ganancia</span>
            <span className="text-xs text-slate-400">
              {margin.margen > 0 ? `${margin.margen.toFixed(1)}%` : "—"}
            </span>
            <Badge variant={margin.color}>{margin.label}</Badge>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProductPricingFields;
