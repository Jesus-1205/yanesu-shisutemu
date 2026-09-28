import { useState } from "react";
import { Plus } from "lucide-react";
import type { PriceRuleOut } from "@/types/api";
import { usePriceRules } from "../hooks/usePriceRules";
import { PriceRulesHero } from "../components/PriceRulesHero";
import { PriceRulesTable } from "../components/PriceRulesTable";
import { PriceRuleFormModal } from "../components/PriceRuleFormModal";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import ErrorBanner from "@/ui-components/ErrorBanner";

export default function PriceRulesPage() {
  const {
    rules,
    loading,
    error,
    deleting,
    activeRulesCount,
    fetchRules,
    deleteRule,
  } = usePriceRules();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRuleOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PriceRuleOut | null>(null);

  const openCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEdit = (rule: PriceRuleOut) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteRule(deleteTarget.id);
    if (success) {
      setDeleteTarget(null);
    }
  };

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

      <PriceRulesHero activeRulesCount={activeRulesCount} />

      <PriceRulesTable
        rules={rules}
        loading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <PriceRuleFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchRules}
        initialRule={editingRule}
      />

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
