import { useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import type { ComboOut, ComboCreate, ComboUpdate } from "@/types/api";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Badge from "@/ui-components/Badge";
import { useCombos } from "../hooks/useCombos";
import CombosTable from "../components/CombosTable";
import ComboFormModal from "../components/ComboFormModal";

export default function CombosPage() {
  const { combos, loading, error, paymentMethods, fetchCombos, loadPaymentMethods, createCombo, updateCombo, deleteCombo } = useCombos();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ComboOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCombos();
    loadPaymentMethods();
  }, [fetchCombos, loadPaymentMethods]);

  const openCreate = async () => {
    await loadPaymentMethods();
    setEditingCombo(null);
    setModalOpen(true);
  };

  const openEdit = async (combo: ComboOut) => {
    await loadPaymentMethods();
    setEditingCombo(combo);
    setModalOpen(true);
  };

  const handleSave = async (payload: ComboCreate | ComboUpdate, isEdit: boolean) => {
    const ok = isEdit && editingCombo
      ? await updateCombo(editingCombo.id, payload as ComboUpdate)
      : await createCombo(payload as ComboCreate);
    if (ok) setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteCombo(deleteTarget.id);
    if (ok) setDeleteTarget(null);
    setDeleting(false);
  };

  const activeCombosCount = combos.filter((c) => c.activo).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Combos y Promociones"
        description="Arma paquetes promocionales con selección dinámica de productos y métodos de pago"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo Combo
          </Button>
        }
      />

      {error && <ErrorBanner onRetry={fetchCombos}>{error}</ErrorBanner>}

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-main">Venta de paquetes y combos</h4>
            <p className="mt-0.5 text-xs text-slate-600">
              Permite agrupar productos con un precio fijo cerrado. En el Punto de Venta (POS) el cajero seleccionará las cantidades de cada grupo.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="info">
            {activeCombosCount} {activeCombosCount === 1 ? "combo activo" : "combos activos"}
          </Badge>
        </div>
      </div>

      <CombosTable
        combos={combos}
        loading={loading}
        paymentMethods={paymentMethods}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <ComboFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingCombo={editingCombo}
        paymentMethods={paymentMethods}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar combo"
        message={`¿Estás seguro de eliminar el combo "${deleteTarget?.nombre}"? Esta acción no se puede deshacer y fallará si hay ventas asociadas.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
