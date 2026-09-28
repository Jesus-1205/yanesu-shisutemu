import { useEffect, useState } from "react";
import type { PaymentMethod, CreatePaymentMethodData } from "../types";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";

interface PaymentMethodFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreatePaymentMethodData) => void;
  initialData?: PaymentMethod | null;
  loading?: boolean;
}

export function PaymentMethodFormModal({
  open,
  onClose,
  onSave,
  initialData = null,
  loading = false,
}: PaymentMethodFormModalProps) {
  const [formName, setFormName] = useState("");
  const [formMoneda, setFormMoneda] = useState<"USD" | "VES">("VES");
  const [formAceptaRef, setFormAceptaRef] = useState(false);
  const [formActivo, setFormActivo] = useState(true);

  useEffect(() => {
    if (initialData) {
      setFormName(initialData.nombre);
      setFormMoneda(initialData.moneda_default);
      setFormAceptaRef(initialData.acepta_referencia);
      setFormActivo(initialData.activo);
    } else {
      setFormName("");
      setFormMoneda("VES");
      setFormAceptaRef(false);
      setFormActivo(true);
    }
  }, [initialData, open]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim()) return;

    onSave({
      nombre: formName.trim(),
      moneda_default: formMoneda,
      acepta_referencia: formAceptaRef,
      activo: formActivo,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Editar Método de Pago" : "Nuevo Método de Pago"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del método"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Ej: TRANSFERENCIA"
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-text-main">
            Moneda default
          </label>
          <select
            value={formMoneda}
            onChange={(e) => setFormMoneda(e.target.value as "USD" | "VES")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          >
            <option value="VES">VES (Bolívares)</option>
            <option value="USD">USD (Dólares)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-main">
          <input
            type="checkbox"
            checked={formAceptaRef}
            onChange={(e) => setFormAceptaRef(e.target.checked)}
            autoComplete="off"
            className="rounded border-slate-300"
          />
          Acepta referencia (ej: pago móvil)
        </label>
        <label className="flex items-center gap-2 text-sm text-text-main">
          <input
            type="checkbox"
            checked={formActivo}
            onChange={(e) => setFormActivo(e.target.checked)}
            autoComplete="off"
            className="rounded border-slate-300"
          />
          Activo
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            type="submit"
            loading={loading}
            disabled={!formName.trim()}
          >
            {initialData ? "Guardar cambios" : "Crear método"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
