import { useEffect } from "react";
import { Plus, CheckCircle2, Trash2 } from "lucide-react";
import type { ComboOut, ComboCreate, ComboUpdate, PaymentMethodOut } from "@/types/api";
import { useComboForm } from "../hooks/useComboForm";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";
import AsyncCombobox from "@/ui-components/AsyncCombobox";

interface ComboFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: ComboCreate | ComboUpdate, isEdit: boolean) => Promise<void>;
  editingCombo: ComboOut | null;
  paymentMethods: PaymentMethodOut[];
}

export default function ComboFormModal({
  open,
  onClose,
  onSave,
  editingCombo,
  paymentMethods,
}: ComboFormModalProps) {
  const form = useComboForm();

  // Reset form when modal opens with/without combo
  useEffect(() => {
    if (open) {
      form.resetForm(editingCombo);
    }
  }, [open, editingCombo, form.resetForm]);

  const handleSubmit = async () => {
    const { valid, payload } = form.validateAndBuildPayload();
    if (!valid || !payload) return;

    form.setSaving(true);
    try {
      await onSave(payload, !!editingCombo);
    } finally {
      form.setSaving(false);
    }
  };

  const isSaveDisabled =
    !form.formName.trim() ||
    !form.formPrecio ||
    Number(form.formPrecio) <= 0 ||
    form.formGroups.length === 0 ||
    form.formMethodIds.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingCombo ? "Editar Combo" : "Nuevo Combo"}
      className="max-w-2xl"
    >
      <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
        <div className="space-y-3">
          <h5 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            1. Datos Principales
          </h5>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Nombre del combo *</label>
              <Input
                label=""
                value={form.formName}
                onChange={(e) => form.setFormName(e.target.value)}
                placeholder="Ej: 8 Latas Mix x $5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Precio total (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.formPrecio}
                  onChange={(e) => form.setFormPrecio(e.target.value)}
                  placeholder="0.00"
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 text-sm font-semibold text-emerald-600 placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Descripción (opcional)</label>
            <Input
              label=""
              value={form.formDesc}
              onChange={(e) => form.setFormDesc(e.target.value)}
              placeholder="Ej: Incluye 8 latas a elección del cliente"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                2. Grupos y Selección de Productos
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Establece cuántos productos de cada grupo debe elegir el cliente.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={form.addGroup}>
              <Plus className="size-3.5" />
              Agregar Opción
            </Button>
          </div>

          <div className="space-y-3">
            {form.formGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    label=""
                    value={group.nombre}
                    onChange={(e) => form.updateGroup(gIdx, "nombre", e.target.value)}
                    placeholder="Nombre del grupo (Ej: Cervezas)"
                    className="flex-1"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex flex-col">
                      <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">Mín.</span>
                      <input
                        type="number"
                        min="0"
                        value={group.min_cantidad}
                        onChange={(e) => form.updateGroup(gIdx, "min_cantidad", Number(e.target.value))}
                        className="h-10 w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-xs font-medium text-text-main focus:border-brand-blue focus:outline-none"
                        autoComplete="off"
                        title="Mínimo de unidades requeridas"
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">Máx.</span>
                      <input
                        type="number"
                        min="1"
                        value={group.max_cantidad}
                        onChange={(e) => form.updateGroup(gIdx, "max_cantidad", Number(e.target.value))}
                        className="h-10 w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-xs font-medium text-text-main focus:border-brand-blue focus:outline-none"
                        autoComplete="off"
                        title="Máximo de unidades permitidas"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => form.removeGroup(gIdx)}
                      className="mt-4 cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {group.productos.map((prod, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <AsyncCombobox
                          value={prod.producto_id > 0 ? prod.producto_id : null}
                          onChange={(val) => form.updateProductInGroup(gIdx, pIdx, val ? Number(val) : 0)}
                          onSearch={form.handleProductSearch}
                          placeholder="Buscar producto seleccionable..."
                          allowClear
                          initialOptions={prod._nombre ? [{ value: prod.producto_id, label: prod._nombre }] : []}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => form.removeProductFromGroup(gIdx, pIdx)}
                        className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                        title="Quitar producto"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => form.addProductToGroup(gIdx)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-blue transition-colors hover:bg-brand-blue/10"
                  >
                    <Plus className="size-3.5" />
                    Agregar producto a este grupo
                  </button>
                </div>
              </div>
            ))}

            {form.formGroups.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                Haz clic en &quot;Agregar Opción&quot; para definir los grupos seleccionables de este combo.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            3. Métodos de Pago Habilitados
          </h5>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 max-h-40 overflow-y-auto">
            {paymentMethods.map((pm) => {
              const isSelected = form.formMethodIds.includes(pm.id);
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
                    onChange={() => form.toggleMethod(pm.id)}
                    autoComplete="off"
                    className="sr-only"
                  />
                  {isSelected && <CheckCircle2 className="size-4 text-brand-blue shrink-0" />}
                </label>
              );
            })}
          </div>
          {form.formMethodIds.length === 0 && (
            <p className="text-[11px] text-amber-600 font-medium">
              ⚠️ Selecciona al menos un método de pago para habilitar el combo.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={form.saving}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            onClick={handleSubmit}
            loading={form.saving}
            disabled={isSaveDisabled}
          >
            {editingCombo ? "Guardar Cambios" : "Crear Combo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
