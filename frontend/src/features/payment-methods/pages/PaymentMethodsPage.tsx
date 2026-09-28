import { useState } from "react";
import { Plus } from "lucide-react";
import type { PaymentMethod, CreatePaymentMethodData } from "../types";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { PaymentMethodsTable } from "../components/PaymentMethodsTable";
import { PaymentMethodFormModal } from "../components/PaymentMethodFormModal";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import ErrorBanner from "@/ui-components/ErrorBanner";

export default function PaymentMethodsPage() {
  const {
    methods,
    loading,
    error,
    saving,
    deleting,
    fetchMethods,
    createMethod,
    updateMethod,
    deleteMethod,
  } = usePaymentMethods();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);

  const openCreate = () => {
    setEditingMethod(null);
    setModalOpen(true);
  };

  const openEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setModalOpen(true);
  };

  const handleSave = async (data: CreatePaymentMethodData) => {
    const success = editingMethod
      ? await updateMethod(editingMethod.id, data)
      : await createMethod(data);
    if (success) {
      setModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteMethod(deleteTarget.id);
    if (success) {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Métodos de Pago"
        description="Administra los métodos de pago disponibles en el POS"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo Método
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchMethods}>{error}</ErrorBanner>
        </div>
      )}

      <PaymentMethodsTable
        methods={methods}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <PaymentMethodFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingMethod}
        loading={saving}
      />

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
