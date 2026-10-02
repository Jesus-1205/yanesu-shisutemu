const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelBase = "block text-xs font-medium text-slate-700 mb-1";

interface InvoiceBasicDetailsProps {
  numeroFactura: string;
  fechaFactura: string;
  fechaLimitePago: string | null;
  onNumeroFacturaChange: (val: string) => void;
  onFechaFacturaChange: (val: string) => void;
  onFechaLimitePagoChange: (val: string | null) => void;
}

export default function InvoiceBasicDetails({
  numeroFactura,
  fechaFactura,
  fechaLimitePago,
  onNumeroFacturaChange,
  onFechaFacturaChange,
  onFechaLimitePagoChange,
}: InvoiceBasicDetailsProps) {
  return (
    <>
      <div>
        <label htmlFor="invoice-info-numero" className={labelBase}>
          Número de Factura
        </label>
        <input
          id="invoice-info-numero"
          value={numeroFactura}
          onChange={(e) => onNumeroFacturaChange(e.target.value)}
          placeholder="Ej: 001-00012345"
          required
          autoComplete="off"
          className={inputBase}
        />
      </div>
      <div>
        <label htmlFor="invoice-info-fecha" className={labelBase}>
          Fecha de Factura
        </label>
        <input
          id="invoice-info-fecha"
          type="date"
          value={fechaFactura}
          onChange={(e) => onFechaFacturaChange(e.target.value)}
          autoComplete="off"
          className={inputBase}
        />
      </div>
      <div>
        <label htmlFor="invoice-info-fecha-limite" className={labelBase}>
          Fecha Límite de Pago <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <input
          id="invoice-info-fecha-limite"
          type="date"
          value={fechaLimitePago || ""}
          onChange={(e) => onFechaLimitePagoChange(e.target.value || null)}
          autoComplete="off"
          className={inputBase}
        />
      </div>
    </>
  );
}
