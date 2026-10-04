import type { SupplierOut } from "@/types/api";
import AsyncCombobox from "@/ui-components/AsyncCombobox";

interface InvoiceSupplierFieldProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onSearch: (query: string) => Promise<Array<{ value: number; label: string }>>;
  onOpenNewSupplierModal: () => void;
  initialSupplier: SupplierOut | null;
}

export default function InvoiceSupplierField({
  value,
  onChange,
  onSearch,
  onOpenNewSupplierModal,
  initialSupplier,
}: InvoiceSupplierFieldProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <AsyncCombobox
          label="Proveedor"
          value={value}
          onChange={(val) => onChange(val as number | null)}
          onSearch={onSearch}
          placeholder="Buscar proveedor..."
          allowClear={false}
          initialOptions={initialSupplier ? [{ value: initialSupplier.id, label: initialSupplier.nombre }] : []}
        />
      </div>
      <button
        type="button"
        onClick={onOpenNewSupplierModal}
        className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-surface px-3 text-sm text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
        title="Crear nuevo proveedor"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8v8" />
        </svg>
        <span className="hidden sm:inline">Nuevo</span>
      </button>
    </div>
  );
}
