import { useEffect } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import type { PriceRuleOut } from "@/types/api";
import { usePriceRuleForm } from "../hooks/usePriceRuleForm";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";
import AsyncCombobox from "@/ui-components/AsyncCombobox";

interface PriceRuleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  initialRule?: PriceRuleOut | null;
}

export function PriceRuleFormModal({
  open,
  onClose,
  onSaved,
  initialRule = null,
}: PriceRuleFormModalProps) {
  const {
    paymentMethods,
    formName,
    setFormName,
    formDesc,
    setFormDesc,
    formProductEntries,
    formMethodIds,
    saving,
    isFormValid,
    resetForm,
    loadPaymentMethods,
    handleProductSearch,
    addProductEntry,
    updateProductEntry,
    removeProductEntry,
    toggleMethod,
    saveRule,
  } = usePriceRuleForm(initialRule);

  useEffect(() => {
    if (open) {
      loadPaymentMethods();
      resetForm(initialRule);
    }
  }, [open, initialRule, loadPaymentMethods, resetForm]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const success = await saveRule(initialRule?.id);
    if (success) {
      onClose();
      await onSaved();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialRule ? "Editar Regla de Precio" : "Nueva Regla de Precio"}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3">
          <h5 className="text-xs font-bold tracking-wider uppercase text-slate-500">
            1. Datos Principales
          </h5>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre de la regla *
              </label>
              <Input
                label=""
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Oferta Divisas Cerveza"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Descripción (opcional)
              </label>
              <Input
                label=""
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Ej: Precio preferencial en efectivo USD"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold tracking-wider uppercase text-slate-500">
              2. Productos y Tarifas Especiales
            </h5>
            <Button variant="ghost" size="sm" type="button" onClick={addProductEntry}>
              <Plus className="size-3.5" />
              Agregar Producto
            </Button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {formProductEntries.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <AsyncCombobox
                    value={entry.producto_id > 0 ? entry.producto_id : null}
                    onChange={(val) =>
                      updateProductEntry(idx, "producto_id", val ? Number(val) : 0)
                    }
                    onSearch={handleProductSearch}
                    placeholder="Buscar producto..."
                    allowClear
                    initialOptions={
                      entry._nombre
                        ? [{ value: entry.producto_id, label: entry._nombre }]
                        : []
                    }
                  />
                </div>
                <select
                  value={entry.tipo_empaque}
                  onChange={(e) =>
                    updateProductEntry(idx, "tipo_empaque", e.target.value)
                  }
                  className="h-10 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-blue focus:outline-none"
                >
                  <option value="UNIDAD">Unidad</option>
                  <option value="CAJA">Caja</option>
                </select>
                <div className="relative w-24">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={entry.precio_usd || ""}
                    onChange={(e) =>
                      updateProductEntry(idx, "precio_usd", Number(e.target.value))
                    }
                    placeholder="0.00"
                    autoComplete="off"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2.5 text-right text-xs font-medium text-text-main placeholder:text-slate-400 focus:border-brand-blue focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeProductEntry(idx)}
                  className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                  title="Quitar producto"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {formProductEntries.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                Haz clic en &quot;Agregar Producto&quot; para definir las tarifas de esta regla.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-xs font-bold tracking-wider uppercase text-slate-500">
            3. Métodos de Pago Aplicables
          </h5>
          <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">
            {paymentMethods.map((pm) => {
              const isSelected = formMethodIds.includes(pm.id);
              return (
                <label
                  key={pm.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs transition-all ${
                    isSelected
                      ? "border-brand-blue bg-blue-50/70 font-semibold text-brand-blue shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="truncate">{pm.nombre}</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMethod(pm.id)}
                    autoComplete="off"
                    className="sr-only"
                  />
                  {isSelected && (
                    <CheckCircle2 className="size-4 shrink-0 text-brand-blue" />
                  )}
                </label>
              );
            })}
          </div>
          {formMethodIds.length === 0 && (
            <p className="text-[11px] font-medium text-amber-600">
              ⚠️ Selecciona al menos un método de pago en divisas para activar la regla.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            type="submit"
            loading={saving}
            disabled={!isFormValid}
          >
            {initialRule ? "Guardar Cambios" : "Crear Regla"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
