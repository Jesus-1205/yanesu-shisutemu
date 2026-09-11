import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard, Sparkles, Layers } from "lucide-react";
import { api } from "@/services/api";
import type { ComboOut, ComboCreate, ComboUpdate, PaymentMethodOut } from "@/types/api";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Badge from "@/ui-components/Badge";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency } from "@/lib/utils";
import ComboFormModal from "../components/ComboFormModal";

export default function CombosPage() {
  const { toast } = useToast();
  const [combos, setCombos] = useState<ComboOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboOut | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<ComboOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCombos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCombos();
      setCombos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar combos");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const methods = await api.getPaymentMethods(true);
      setPaymentMethods(methods);
    } catch {
      toast("Error al cargar métodos de pago", "error");
    }
  }, [toast]);

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
    try {
      if (isEdit && editingCombo) {
        await api.updateCombo(editingCombo.id, payload as ComboUpdate);
        toast("Combo actualizado", "success");
      } else {
        await api.createCombo(payload as ComboCreate);
        toast("Combo creado", "success");
      }
      setModalOpen(false);
      await fetchCombos();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al guardar combo", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCombo(deleteTarget.id);
      toast("Combo eliminado", "success");
      setDeleteTarget(null);
      await fetchCombos();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar combo",
        "error",
      );
    } finally {
      setDeleting(false);
    }
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

      {error && (
        <ErrorBanner onRetry={fetchCombos}>
          {error}
        </ErrorBanner>
      )}

      {/* Hero card informativa */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-main">
              Venta de paquetes y combos
            </h4>
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

      <div className="rounded-xl border border-slate-200 bg-surface shadow-sm">
        <Table
          columns={[
            {
              key: "nombre",
              header: "Nombre / Detalle",
              className: "min-w-44",
              render: (c: ComboOut) => (
                <div>
                  <p className="font-semibold text-text-main">{c.nombre}</p>
                  {c.descripcion && (
                    <p className="mt-0.5 text-xs text-slate-500">{c.descripcion}</p>
                  )}
                </div>
              ),
            },
            {
              key: "precio_total_usd",
              header: "Precio Total",
              className: "w-28",
              render: (c: ComboOut) => (
                <span className="font-bold text-emerald-600 text-sm">
                  {formatCurrency(c.precio_total_usd)}
                </span>
              ),
            },
            {
              key: "grupos",
              header: "Opciones y Grupos",
              render: (c: ComboOut) => (
                <div className="flex max-w-md flex-wrap gap-1.5 py-1">
                  {c.groups.map((g, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                    >
                      <Layers className="size-3 text-brand-blue" />
                      <span className="font-medium text-text-main">{g.nombre}</span>
                      <span className="rounded bg-slate-200/70 px-1 py-0.5 text-[10px] text-slate-600">
                        {g.min_cantidad}–{g.max_cantidad} uds
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({g.products.length} {g.products.length === 1 ? "opción" : "opciones"})
                      </span>
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: "metodos",
              header: "Métodos de Pago",
              hideOnMobile: true,
              render: (c: ComboOut) => (
                <div className="flex flex-wrap gap-1">
                  {c.metodo_pago_ids.map((id) => {
                    const method = paymentMethods.find((pm) => pm.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue ring-1 ring-blue-500/10"
                      >
                        <CreditCard className="size-3" />
                        {method ? method.nombre : `#${id}`}
                      </span>
                    );
                  })}
                </div>
              ),
            },
            {
              key: "activo",
              header: "Estado",
              className: "text-center w-24",
              render: (c: ComboOut) => (
                <Badge variant={c.activo ? "success" : "neutral"}>
                  {c.activo ? "Activo" : "Inactivo"}
                </Badge>
              ),
            },
            {
              key: "acciones",
              header: "",
              exportable: false,
              className: "text-right w-24",
              render: (c: ComboOut) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                    aria-label="Editar combo"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Eliminar combo"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={combos}
          keyExtractor={(c) => c.id}
          loading={loading}
          emptyMessage="No hay combos registrados"
        />
      </div>

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
