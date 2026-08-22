import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import type { PaymentMethod } from "../types";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useToast } from "@/ui-components/Toast";

export default function PaymentMethodsPage() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formName, setFormName] = useState("");
  const [formMoneda, setFormMoneda] = useState<"USD" | "VES">("VES");
  const [formAceptaRef, setFormAceptaRef] = useState(false);
  const [formActivo, setFormActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPaymentMethods();
      setMethods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar métodos de pago");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const openCreate = () => {
    setEditingMethod(null);
    setFormName("");
    setFormMoneda("VES");
    setFormAceptaRef(false);
    setFormActivo(true);
    setModalOpen(true);
  };

  const openEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormName(method.nombre);
    setFormMoneda(method.moneda_default);
    setFormAceptaRef(method.acepta_referencia);
    setFormActivo(method.activo);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingMethod) {
        await api.updatePaymentMethod(editingMethod.id, {
          nombre: formName.trim(),
          moneda_default: formMoneda,
          acepta_referencia: formAceptaRef,
          activo: formActivo,
        });
        toast("Método de pago actualizado", "success");
      } else {
        await api.createPaymentMethod({
          nombre: formName.trim(),
          moneda_default: formMoneda,
          acepta_referencia: formAceptaRef,
          activo: formActivo,
        });
        toast("Método de pago creado", "success");
      }
      setModalOpen(false);
      await fetchMethods();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar método de pago",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePaymentMethod(deleteTarget.id);
      toast("Método de pago eliminado", "success");
      setDeleteTarget(null);
      await fetchMethods();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar método de pago",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Métodos de Pago"
        description="Administra los métodos de pago disponibles en el POS"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo Método
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchMethods}>
            {error}
          </ErrorBanner>
        </div>
      )}

      <Table
        columns={[
          { key: "nombre", header: "Nombre" },
          {
            key: "moneda_default",
            header: "Moneda",
            render: (m: PaymentMethod) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                m.moneda_default === "USD" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {m.moneda_default}
              </span>
            ),
          },
          {
            key: "acepta_referencia",
            header: "Referencia",
            render: (m: PaymentMethod) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                m.acepta_referencia ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
              }`}>
                {m.acepta_referencia ? "Sí" : "No"}
              </span>
            ),
          },
          {
            key: "activo",
            header: "Estado",
            render: (m: PaymentMethod) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                m.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {m.activo ? "Activo" : "Inactivo"}
              </span>
            ),
          },
          {
            key: "acciones",
            header: "Acciones",
            exportable: false,
            render: (m: PaymentMethod) => (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(m)}>
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            ),
          },
        ]}
        data={methods}
        keyExtractor={(m) => m.id}
        loading={loading}
        emptyMessage="No hay métodos de pago registrados"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMethod ? "Editar Método de Pago" : "Nuevo Método de Pago"}
      >
        <div className="space-y-4">
          <Input
            label="Nombre del método"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ej: TRANSFERENCIA"
          />
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Moneda default</label>
            <select
              value={formMoneda}
              onChange={(e) => setFormMoneda(e.target.value as "USD" | "VES")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={handleSave}
              loading={saving}
              disabled={!formName.trim()}
            >
              {editingMethod ? "Guardar cambios" : "Crear método"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar método de pago"
        message={`¿Eliminar el método "${deleteTarget?.nombre}"? No se podrá eliminar si tiene ventas asociadas.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}