interface InvoiceDocumentTypesProps {
  value: "FACTURA" | "NOTA_ENTREGA";
  onChange: (value: "FACTURA" | "NOTA_ENTREGA") => void;
}

export default function InvoiceDocumentTypes({
  value,
  onChange,
}: InvoiceDocumentTypesProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Documento</label>
      <div className="flex overflow-hidden rounded-lg border border-slate-300">
        <button
          type="button"
          onClick={() => onChange("FACTURA")}
          className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
            value === "FACTURA"
              ? "bg-brand-blue text-white"
              : "bg-surface text-slate-600 hover:bg-slate-50"
          }`}
        >
          Factura
        </button>
        <button
          type="button"
          onClick={() => onChange("NOTA_ENTREGA")}
          className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
            value === "NOTA_ENTREGA"
              ? "bg-brand-blue text-white"
              : "bg-surface text-slate-600 hover:bg-slate-50"
          }`}
        >
          Nota de Entrega
        </button>
      </div>
    </div>
  );
}
