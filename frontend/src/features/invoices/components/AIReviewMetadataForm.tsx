import type { SupplierOut } from "@/types/api";
import AsyncCombobox from "@/ui-components/AsyncCombobox";

interface AIReviewMetadataFormProps {
  analysisProveedorNombre?: string;
  proveedorId: number | null;
  setProveedorId: (id: number | null) => void;
  setProveedorNombre: (nombre: string) => void;
  suppliers: SupplierOut[];
  onOpenSupplierModal: () => void;
  numeroFactura: string;
  setNumeroFactura: (val: string) => void;
  fechaFactura: string;
  setFechaFactura: (val: string) => void;
  fechaLimitePago: string;
  setFechaLimitePago: (val: string) => void;
  tipoDocumento: "FACTURA" | "NOTA_ENTREGA";
  setTipoDocumento: (val: "FACTURA" | "NOTA_ENTREGA") => void;
  moneda: "USD" | "BS";
  setMoneda: (val: "USD" | "BS") => void;
}

const inputBase = "h-9 rounded-lg border border-slate-300 bg-surface px-2 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelSmall = "text-[10px] font-medium text-slate-500 uppercase mb-1 block";

export default function AIReviewMetadataForm({
  analysisProveedorNombre,
  proveedorId,
  setProveedorId,
  setProveedorNombre,
  suppliers,
  onOpenSupplierModal,
  numeroFactura,
  setNumeroFactura,
  fechaFactura,
  setFechaFactura,
  fechaLimitePago,
  setFechaLimitePago,
  tipoDocumento,
  setTipoDocumento,
  moneda,
  setMoneda,
}: AIReviewMetadataFormProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <div className="col-span-2 md:col-span-3">
        <label className={labelSmall}>Proveedor</label>
        {analysisProveedorNombre && (
          <p className="mb-1 text-xs font-medium text-slate-600" title={analysisProveedorNombre}>
            {analysisProveedorNombre}
          </p>
        )}
        <div className="flex gap-1.5">
          <AsyncCombobox
            value={proveedorId}
            onChange={(val) => {
              if (val) {
                setProveedorId(val as number);
                const found = suppliers.find((s) => s.id === val);
                if (found) setProveedorNombre(found.nombre);
              } else {
                setProveedorId(null);
              }
            }}
            onSearch={async (q) => {
              const { api } = await import("@/services/api");
              const data = await api.getSuppliers({ search: q || undefined });
              return data.map((s) => ({ value: s.id, label: s.nombre }));
            }}
            initialOptions={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
            placeholder="Buscar proveedor..."
            allowClear
            className="flex-1"
          />
          <button
            type="button"
            onClick={onOpenSupplierModal}
            className="h-9 shrink-0 cursor-pointer rounded-lg border border-dashed border-slate-300 bg-surface px-2 text-xs text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
            title="Crear nuevo proveedor"
          >
            + Nuevo
          </button>
        </div>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className={labelSmall}>N° Factura</label>
        <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className={inputBase} />
      </div>
      <div className="col-span-1 md:col-span-1">
        <label className={labelSmall}>Fecha</label>
        <input type="date" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} className={inputBase} />
      </div>
      <div className="col-span-1 md:col-span-1">
        <label className={labelSmall}>Fecha Límite</label>
        <input type="date" value={fechaLimitePago} onChange={(e) => setFechaLimitePago(e.target.value)} className={inputBase} />
      </div>
      <div className="col-span-1 md:col-span-2">
        <label className={labelSmall}>Tipo</label>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => setTipoDocumento("FACTURA")}
            className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
              tipoDocumento === "FACTURA" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            Factura
          </button>
          <button
            type="button"
            onClick={() => setTipoDocumento("NOTA_ENTREGA")}
            className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
              tipoDocumento === "NOTA_ENTREGA" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            N. Entrega
          </button>
        </div>
      </div>
      <div className="col-span-1 md:col-span-1">
        <label className={labelSmall}>Moneda</label>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => setMoneda("USD")}
            className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
              moneda === "USD" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            USD
          </button>
          <button
            type="button"
            onClick={() => setMoneda("BS")}
            className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
              moneda === "BS" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            Bs.
          </button>
        </div>
      </div>
    </div>
  );
}
