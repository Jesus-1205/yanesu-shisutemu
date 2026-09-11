import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard, Sparkles, CheckCircle2, Layers } from "lucide-react";
import { api } from "@/services/api";
import type { ComboOut, ComboCreate, ComboUpdate, PaymentMethodOut, ComboGroupEntry } from "@/types/api";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Badge from "@/ui-components/Badge";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency } from "@/lib/utils";

interface FormProductEntry {
  producto_id: number;
  _nombre?: string;
}

interface FormGroup {
  nombre: string;
  min_cantidad: number;
  max_cantidad: number;
  productos: FormProductEntry[];
}

export default function CombosPage() {
  const { toast } = useToast();
  const [combos, setCombos] = useState<ComboOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboOut | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrecio, setFormPrecio] = useState("");
  const [formGroups, setFormGroups] = useState<FormGroup[]>([]);
  const [formMethodIds, setFormMethodIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

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
    setFormName("");
    setFormDesc("");
    setFormPrecio("");
    setFormGroups([]);
    setFormMethodIds([]);
    setModalOpen(true);
  };

  const openEdit = async (combo: ComboOut) => {
    await loadPaymentMethods();
    setEditingCombo(combo);
    setFormName(combo.nombre);
    setFormDesc(combo.descripcion ?? "");
    setFormPrecio(String(combo.precio_total_usd));
    setFormGroups(
      combo.groups.map((g) => ({
        nombre: g.nombre,
        min_cantidad: g.min_cantidad,
        max_cantidad: g.max_cantidad,
        productos: g.products.map((p) => ({
          producto_id: p.producto_id,
          _nombre: p.producto_nombre,
        })),
      }))
    );
    setFormMethodIds(combo.metodo_pago_ids);
    setModalOpen(true);
  };

  const addGroup = () => {
    setFormGroups([...formGroups, { nombre: "", min_cantidad: 0, max_cantidad: 8, productos: [] }]);
  };

  const updateGroup = (idx: number, field: keyof FormGroup, value: unknown) => {
    setFormGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));
  };

  const removeGroup = (idx: number) => {
    setFormGroups((prev) => prev.filter((_, i) => i !== idx));
  };

  const addProductToGroup = (groupIdx: number) => {
    setFormGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? { ...g, productos: [...g.productos, { producto_id: 0 }] } : g
      )
    );
  };

  const updateProductInGroup = (groupIdx: number, prodIdx: number, producto_id: number) => {
    setFormGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, productos: g.productos.map((p, j) => (j === prodIdx ? { ...p, producto_id } : p)) }
          : g
      )
    );
  };

  const removeProductFromGroup = (groupIdx: number, prodIdx: number) => {
    setFormGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx ? { ...g, productos: g.productos.filter((_, j) => j !== prodIdx) } : g
      )
    );
  };

  const toggleMethod = (id: number) => {
    setFormMethodIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleProductSearch = useCallback(async (query: string) => {
    const data = await api.getProducts({ search: query || undefined });
    return data.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  }, []);

  const handleSave = async () => {
    if (!formName.trim()) return;
    if (!formPrecio || Number(formPrecio) <= 0) return;
    if (formGroups.length === 0) return;
    if (formMethodIds.length === 0) return;

    const grupos: ComboGroupEntry[] = formGroups.map((g) => ({
      nombre: g.nombre,
      min_cantidad: g.min_cantidad,
      max_cantidad: g.max_cantidad,
      productos: g.productos.filter((p) => p.producto_id > 0).map((p) => ({ producto_id: p.producto_id })),
    }));

    setSaving(true);
    try {
      if (editingCombo) {
        const data: ComboUpdate = {
          nombre: formName.trim(),
          descripcion: formDesc.trim() || null,
          precio_total_usd: Number(formPrecio),
          grupos,
          metodo_pago_ids: formMethodIds,
        };
        await api.updateCombo(editingCombo.id, data);
        toast("Combo actualizado", "success");
      } else {
        const data: ComboCreate = {
          nombre: formName.trim(),
          descripcion: formDesc.trim() || null,
          precio_total_usd: Number(formPrecio),
          grupos,
          metodo_pago_ids: formMethodIds,
        };
        await api.createCombo(data);
        toast("Combo creado", "success");
      }
      setModalOpen(false);
      await fetchCombos();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar combo",
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
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
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(e.target.value)}
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
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
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
              <Button variant="ghost" size="sm" onClick={addGroup}>
                <Plus className="size-3.5" />
                Agregar Opción
              </Button>
            </div>

            <div className="space-y-3">
              {formGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      label=""
                      value={group.nombre}
                      onChange={(e) => updateGroup(gIdx, "nombre", e.target.value)}
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
                          onChange={(e) => updateGroup(gIdx, "min_cantidad", Number(e.target.value))}
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
                          onChange={(e) => updateGroup(gIdx, "max_cantidad", Number(e.target.value))}
                          className="h-10 w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-xs font-medium text-text-main focus:border-brand-blue focus:outline-none"
                          autoComplete="off"
                          title="Máximo de unidades permitidas"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeGroup(gIdx)}
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
                            onChange={(val) => updateProductInGroup(gIdx, pIdx, val ? Number(val) : 0)}
                            onSearch={handleProductSearch}
                            placeholder="Buscar producto seleccionable..."
                            allowClear
                            initialOptions={prod._nombre ? [{ value: prod.producto_id, label: prod._nombre }] : []}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProductFromGroup(gIdx, pIdx)}
                          className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                          title="Quitar producto"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addProductToGroup(gIdx)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-blue transition-colors hover:bg-brand-blue/10"
                    >
                      <Plus className="size-3.5" />
                      Agregar producto a este grupo
                    </button>
                  </div>
                </div>
              ))}

              {formGroups.length === 0 && (
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
                    {isSelected && <CheckCircle2 className="size-4 text-brand-blue shrink-0" />}
                  </label>
                );
              })}
            </div>
            {formMethodIds.length === 0 && (
              <p className="text-[11px] text-amber-600 font-medium">
                ⚠️ Selecciona al menos un método de pago para habilitar el combo.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={handleSave}
              loading={saving}
              disabled={
                !formName.trim() ||
                !formPrecio ||
                Number(formPrecio) <= 0 ||
                formGroups.length === 0 ||
                formMethodIds.length === 0
              }
            >
              {editingCombo ? "Guardar Cambios" : "Crear Combo"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar combo"
        message={`¿Estás seguro de eliminar el combo "${deleteTarget?.nombre}"?`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
