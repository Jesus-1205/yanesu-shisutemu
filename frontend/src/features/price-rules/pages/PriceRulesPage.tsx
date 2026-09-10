import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tag, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
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
import Badge from "@/ui-components/Badge";
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

  const activeRulesCount = rules.filter((r) => r.activo).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reglas de Precio (Divisas)"
        description="Establece tarifas y precios fijos especiales al pagar en divisas o métodos específicos"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="size-4" />
            Nueva Regla
          </Button>
        }
      />

      {error && (
        <ErrorBanner onRetry={fetchRules}>
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
              Precios dinámicos por divisa
            </h4>
            <p className="mt-0.5 text-xs text-slate-600">
              Estas reglas se activan automáticamente en el Punto de Venta al cobrar con métodos de pago en divisas seleccionados.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="info">
            {activeRulesCount} {activeRulesCount === 1 ? "regla activa" : "reglas activas"}
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
              render: (r: PriceRuleOut) => (
                <div>
                  <p className="font-semibold text-text-main">{r.nombre}</p>
                  {r.descripcion && (
                    <p className="mt-0.5 text-xs text-slate-500">{r.descripcion}</p>
                  )}
                </div>
              ),
            },
            {
              key: "productos",
              header: "Productos y Precios",
              render: (r: PriceRuleOut) => (
                <div className="flex max-w-lg flex-wrap gap-1.5 py-1">
                  {r.products.map((p) => (
                    <span
                      key={`${p.producto_id}-${p.tipo_empaque}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                    >
                      <Tag className="size-3 text-brand-blue" />
                      <span className="font-medium text-text-main">{p.producto_nombre}</span>
                      <span className="rounded bg-slate-200/70 px-1 py-0.2 text-[10px] text-slate-600 uppercase">
                        {p.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                      </span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(p.precio_usd)}
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
              render: (r: PriceRuleOut) => (
                <div className="flex flex-wrap gap-1">
                  {r.payment_methods.map((pm) => (
                    <span
                      key={pm.metodo_pago_id}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue ring-1 ring-blue-500/10"
                    >
                      <CreditCard className="size-3" />
                      {pm.metodo_pago_nombre}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: "activo",
              header: "Estado",
              className: "text-center w-24",
              render: (r: PriceRuleOut) => (
                <Badge variant={r.activo ? "success" : "neutral"}>
                  {r.activo ? "Activa" : "Inactiva"}
                </Badge>
              ),
            },
            {
              key: "acciones",
              header: "",
              exportable: false,
              className: "text-right w-24",
              render: (r: PriceRuleOut) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(r)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                    aria-label="Editar regla"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Eliminar regla"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={rules}
          keyExtractor={(r) => r.id}
          loading={loading}
          emptyMessage="No hay reglas de precio registradas"
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRule ? "Editar Regla de Precio" : "Nueva Regla de Precio"}
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <h5 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              1. Datos Principales
            </h5>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nombre de la regla *</label>
                <Input
                  label=""
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Oferta Divisas Cerveza"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Descripción (opcional)</label>
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
              <h5 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                2. Productos y Tarifas Especiales
              </h5>
              <Button variant="ghost" size="sm" onClick={addProductEntry}>
                <Plus className="size-3.5" />
                Agregar Producto
              </Button>
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {formProductEntries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                  <div className="min-w-0 flex-1">
                    <AsyncCombobox
                      value={entry.producto_id > 0 ? entry.producto_id : null}
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
                    className="h-10 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-blue focus:outline-none"
                  >
                    <option value="UNIDAD">Unidad</option>
                    <option value="CAJA">Caja</option>
                  </select>
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={entry.precio_usd || ""}
                      onChange={(e) => updateProductEntry(idx, "precio_usd", Number(e.target.value))}
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
            <h5 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              3. Métodos de Pago Aplicables
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
                ⚠️ Selecciona al menos un método de pago en divisas para activar la regla.
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
                formProductEntries.length === 0 ||
                formMethodIds.length === 0 ||
                formProductEntries.some((e) => e.producto_id === 0 || e.precio_usd <= 0)
              }
            >
              {editingRule ? "Guardar Cambios" : "Crear Regla"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar regla de precio"
        message={`¿Estás seguro de eliminar la regla "${deleteTarget?.nombre}"?`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}

