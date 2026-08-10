import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import type { PriceRuleOut, PriceRuleCreate, PriceRuleUpdate, PaymentMethodOut, PriceRuleProductEntry } from "@/types/api";
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

interface FormProductEntry extends PriceRuleProductEntry {
  _nombre?: string;
}

export default function PriceRulesPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<PriceRuleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRuleOut | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formProductEntries, setFormProductEntries] = useState<FormProductEntry[]>([]);
  const [formMethodIds, setFormMethodIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PriceRuleOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPriceRules();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reglas");
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
    fetchRules();
  }, [fetchRules]);

  const openCreate = async () => {
    await loadPaymentMethods();
    setEditingRule(null);
    setFormName("");
    setFormDesc("");
    setFormProductEntries([]);
    setFormMethodIds([]);
    setModalOpen(true);
  };

  const openEdit = async (rule: PriceRuleOut) => {
    await loadPaymentMethods();
    setEditingRule(rule);
    setFormName(rule.nombre);
    setFormDesc(rule.descripcion ?? "");
    setFormProductEntries(
      rule.products.map((p) => ({
        producto_id: p.producto_id,
        tipo_empaque: p.tipo_empaque as "UNIDAD" | "CAJA",
        precio_usd: p.precio_usd,
        _nombre: p.producto_nombre,
      }))
    );
    setFormMethodIds(rule.payment_methods.map((pm) => pm.metodo_pago_id));
    setModalOpen(true);
  };

  const handleProductSearch = useCallback(async (query: string) => {
    const data = await api.getProducts({ search: query || undefined });
    return data.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  }, []);

  const addProductEntry = () => {
    setFormProductEntries([
      ...formProductEntries,
      { producto_id: 0, tipo_empaque: "UNIDAD", precio_usd: 0, _nombre: undefined },
    ]);
  };

  const updateProductEntry = (index: number, field: string, value: unknown) => {
    setFormProductEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const removeProductEntry = (index: number) => {
    setFormProductEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMethod = (id: number) => {
    setFormMethodIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    if (formProductEntries.length === 0) return;
    if (formMethodIds.length === 0) return;
    if (formProductEntries.some((e) => e.producto_id === 0 || e.precio_usd <= 0)) return;

    setSaving(true);
    try {
      const productos = formProductEntries.map(({ _nombre, ...rest }) => rest);
      if (editingRule) {
        const data: PriceRuleUpdate = {
          nombre: formName.trim(),
          descripcion: formDesc.trim() || null,
          productos,
          metodo_pago_ids: formMethodIds,
        };
        await api.updatePriceRule(editingRule.id, data);
        toast("Regla de precio actualizada", "success");
      } else {
        const data: PriceRuleCreate = {
          nombre: formName.trim(),
          descripcion: formDesc.trim() || null,
          productos,
          metodo_pago_ids: formMethodIds,
        };
        await api.createPriceRule(data);
        toast("Regla de precio creada", "success");
      }
      setModalOpen(false);
      await fetchRules();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar regla de precio",
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
      await api.deletePriceRule(deleteTarget.id);
      toast("Regla de precio eliminada", "success");
      setDeleteTarget(null);
      await fetchRules();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar regla de precio",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reglas de Precio (Divisas)"
        description="Define precios especiales cuando se paga con métodos en divisas"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nueva Regla
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchRules}>
            {error}
          </ErrorBanner>
        </div>
      )}

      <Table
        columns={[
          { key: "id", header: "ID" },
          { key: "nombre", header: "Nombre" },
          {
            key: "productos",
            header: "Productos",
            render: (r: PriceRuleOut) => (
              <span className="text-xs">
                {r.products.map((p) => `${p.producto_nombre} (${p.tipo_empaque}: ${formatCurrency(p.precio_usd)})`).join(", ")}
              </span>
            ),
          },
          {
            key: "metodos",
            header: "Métodos de pago",
            render: (r: PriceRuleOut) => (
              <span className="text-xs">
                {r.payment_methods.map((pm) => pm.metodo_pago_nombre).join(", ")}
              </span>
            ),
          },
          {
            key: "activo",
            header: "Estado",
            render: (r: PriceRuleOut) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                r.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {r.activo ? "Activa" : "Inactiva"}
              </span>
            ),
          },
          {
            key: "acciones",
            header: "Acciones",
            exportable: false,
            render: (r: PriceRuleOut) => (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)}>
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            ),
          },
        ]}
        data={rules}
        keyExtractor={(r) => r.id}
        loading={loading}
        emptyMessage="No hay reglas de precio registradas"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? "Editar Regla de Precio" : "Nueva Regla de Precio"}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la regla"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ej: Divisas Cerveza"
          />
          <Input
            label="Descripción"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Opcional"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-main">Productos con precio divisas</label>
              <Button variant="ghost" size="sm" onClick={addProductEntry}>
                <Plus className="w-3.5 h-3.5" />
                Agregar producto
              </Button>
            </div>
            <div className="space-y-2">
              {formProductEntries.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <AsyncCombobox
                      value={entry.producto_id || null}
                      onChange={(val) => updateProductEntry(idx, "producto_id", val ? Number(val) : 0)}
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
                    onChange={(e) => updateProductEntry(idx, "tipo_empaque", e.target.value)}
                    className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-blue focus:outline-none"
                  >
                    <option value="UNIDAD">Unidad</option>
                    <option value="CAJA">Caja</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={entry.precio_usd || ""}
                    onChange={(e) => updateProductEntry(idx, "precio_usd", Number(e.target.value))}
                    placeholder="$ 0.00"
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeProductEntry(idx)}
                    className="text-danger hover:text-red-700 shrink-0 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {formProductEntries.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  Agrega al menos un producto
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-main mb-2 block">Métodos de pago (divisas)</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
                formProductEntries.length === 0 ||
                formMethodIds.length === 0 ||
                formProductEntries.some((e) => e.producto_id === 0 || e.precio_usd <= 0)
              }
            >
              {editingRule ? "Guardar cambios" : "Crear regla"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar regla de precio"
        message={`¿Eliminar la regla "${deleteTarget?.nombre}"?`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
