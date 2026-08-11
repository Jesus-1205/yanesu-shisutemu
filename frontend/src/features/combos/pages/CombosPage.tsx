import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

  return (
    <div>
      <PageHeader
        title="Combos y Promociones"
        description="Define combos con precios especiales y métodos de pago"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo Combo
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchCombos}>
            {error}
          </ErrorBanner>
        </div>
      )}

      <Table
        columns={[
          { key: "id", header: "ID" },
          { key: "nombre", header: "Nombre" },
          {
            key: "precio_total_usd",
            header: "Precio",
            render: (c: ComboOut) => formatCurrency(c.precio_total_usd),
          },
          {
            key: "grupos",
            header: "Opciones",
            render: (c: ComboOut) => (
              <span className="text-xs block max-w-sm truncate" title={c.groups.map((g) => `${g.nombre} (${g.min_cantidad}-${g.max_cantidad}: ${g.products.length} prods.)`).join(", ")}>
                {c.groups.map((g) => `${g.nombre} (${g.min_cantidad}-${g.max_cantidad}: ${g.products.length} prods.)`).join(", ")}
              </span>
            ),
          },
          {
            key: "metodos",
            header: "Métodos",
            render: (c: ComboOut) => (
              <span className="text-xs block max-w-[120px] truncate" title={c.metodo_pago_ids.map((id) => paymentMethods.find((pm) => pm.id === id)?.nombre ?? `#${id}`).join(", ")}>
                {c.metodo_pago_ids.map((id) => paymentMethods.find((pm) => pm.id === id)?.nombre ?? `#${id}`).join(", ")}
              </span>
            ),
          },
          {
            key: "activo",
            header: "Estado",
            render: (c: ComboOut) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                c.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {c.activo ? "Activo" : "Inactivo"}
              </span>
            ),
          },
          {
            key: "acciones",
            header: "Acciones",
            exportable: false,
            render: (c: ComboOut) => (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}>
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            ),
          },
        ]}
        data={combos}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyMessage="No hay combos registrados"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCombo ? "Editar Combo" : "Nuevo Combo"}
        className="max-w-2xl"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del combo</label>
              <Input
                label=""
                variant="sm"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: 8 Latas Mix x $5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Precio total (USD)</label>
              <Input
                label=""
                variant="sm"
                type="number"
                step="0.01"
                min="0.01"
                value={formPrecio}
                onChange={(e) => setFormPrecio(e.target.value)}
                placeholder="5.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
            <Input
              label=""
              variant="sm"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-text-main">Opciones del combo</label>
              <button
                type="button"
                onClick={addGroup}
                className="flex items-center gap-1 px-2 py-1 text-xs text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar opción
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Cada opción agrupa productos del mismo tipo. Mín. y máx. indican cuántos productos de esa opción puede elegir el cliente.
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {formGroups.map((group, gIdx) => (
                <div key={gIdx} className="border border-slate-200 rounded-lg p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                      label=""
                      variant="sm"
                      value={group.nombre}
                      onChange={(e) => updateGroup(gIdx, "nombre", e.target.value)}
                      placeholder="Nombre de la opción (Ej: Cervezas)"
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex flex-col">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Mín.</span>
                        <input
                          type="number"
                          min="0"
                          value={group.min_cantidad}
                          onChange={(e) => updateGroup(gIdx, "min_cantidad", Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-blue focus:outline-none"
                          title="Cantidad mínima de productos que el cliente debe elegir"
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Máx.</span>
                        <input
                          type="number"
                          min="1"
                          value={group.max_cantidad}
                          onChange={(e) => updateGroup(gIdx, "max_cantidad", Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-blue focus:outline-none"
                          title="Cantidad máxima de productos que el cliente puede elegir"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeGroup(gIdx)}
                        className="text-danger hover:text-red-700 mt-3.5"
                        title="Eliminar opción"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {group.productos.map((prod, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <AsyncCombobox
                            value={prod.producto_id > 0 ? prod.producto_id : null}
                            onChange={(val) => updateProductInGroup(gIdx, pIdx, val ? Number(val) : 0)}
                            onSearch={handleProductSearch}
                            placeholder="Buscar producto..."
                            allowClear
                            initialOptions={prod._nombre ? [{ value: prod.producto_id, label: prod._nombre }] : []}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProductFromGroup(gIdx, pIdx)}
                          className="text-danger hover:text-red-700 shrink-0 mt-1"
                          title="Quitar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addProductToGroup(gIdx)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar producto
                    </button>
                  </div>
                </div>
              ))}
              {formGroups.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  Agrega al menos una opción de productos
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-main mb-1 block">Métodos de pago</label>
            <p className="text-xs text-slate-400 mb-2">
              Métodos de pago con los que se puede comprar este combo.
            </p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((pm) => (
                <label
                  key={pm.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    formMethodIds.includes(pm.id)
                      ? "border-brand-blue bg-blue-50 text-brand-blue font-semibold"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formMethodIds.includes(pm.id)}
                    onChange={() => toggleMethod(pm.id)}
                    className="sr-only"
                  />
                  {pm.nombre}
                </label>
              ))}
            </div>
            <p className={`text-xs mt-1 transition-opacity ${formMethodIds.length > 0 ? "opacity-0" : "text-slate-400 opacity-100"}`}>
              Selecciona al menos un método de pago
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
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
              {editingCombo ? "Guardar cambios" : "Crear combo"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar combo"
        message={`¿Eliminar el combo "${deleteTarget?.nombre}"?`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
