import type { ComboOut, PaymentMethodOut } from "@/types/api";
import Table from "@/ui-components/Table";
import { useCombosTableColumns } from "../hooks/useCombosTableColumns";

interface CombosTableProps {
  combos: ComboOut[];
  loading: boolean;
  paymentMethods: PaymentMethodOut[];
  onRowClick?: (combo: ComboOut) => void;
  onEdit: (combo: ComboOut) => void;
  onDelete: (combo: ComboOut) => void;
}

export default function CombosTable({
  combos,
  loading,
  paymentMethods,
  onRowClick,
  onEdit,
  onDelete,
}: CombosTableProps) {
  const columns = useCombosTableColumns({ paymentMethods, onEdit, onDelete });

  return (
    <div className="rounded-xl border border-slate-200 bg-surface shadow-sm">
      <Table
        columns={columns}
        data={combos}
        keyExtractor={(c) => c.id}
        loading={loading}
        onRowClick={onRowClick}
        emptyMessage="No hay combos registrados"
      />
    </div>
  );
}
