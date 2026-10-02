import { useState } from "react";
import { Paperclip } from "lucide-react";
import type { InvoicePaymentOut } from "@/types/api";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import { formatBs, formatUsd } from "@/lib/text";

function ObsCell({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="text-slate-400">—</span>;
  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className={`cursor-pointer text-left text-xs transition-colors hover:text-brand-blue ${
        expanded ? "text-slate-700" : "max-w-[150px] truncate text-slate-500"
      }`}
      title={expanded ? "Click para contraer" : "Click para expandir"}
    >
      {text}
    </button>
  );
}

interface InvoiceLedgerProps {
  payments: InvoicePaymentOut[];
  onViewReceipt?: (paymentId: number, receiptId: number) => void;
}

export default function InvoiceLedger({ payments, onViewReceipt }: InvoiceLedgerProps) {
  if (payments.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-medium text-slate-700">Historial de Pagos</h3>
      <Table
        columns={[
          {
            key: "fecha_pago",
            header: "Fecha",
            render: (p: InvoicePaymentOut) => new Date(p.fecha_pago).toLocaleDateString("es-VE"),
          },
          { key: "metodo_pago_nombre", header: "Método" },
          {
            key: "monto",
            header: "Monto",
            render: (p: InvoicePaymentOut) => (
              <span className="font-mono">
                {p.monto_bs > 0 ? `Bs. ${formatBs(p.monto_bs)}` : formatUsd(p.monto_usd)}
              </span>
            ),
          },
          {
            key: "monto_usd",
            header: "Monto USD",
            hideOnMobile: true,
            render: (p: InvoicePaymentOut) => <span className="font-mono">{formatUsd(p.monto_usd)}</span>,
          },
          {
            key: "monto_bs",
            header: "Monto Bs.",
            hideOnMobile: true,
            render: (p: InvoicePaymentOut) => <span className="font-mono">Bs. {formatBs(p.monto_bs)}</span>,
          },
          {
            key: "tasa_bs",
            header: "Tasa",
            hideOnMobile: true,
            render: (p: InvoicePaymentOut) =>
              p.tasa_bs
                ? <span className="font-mono text-xs">{formatBs(p.tasa_bs)}</span>
                : <span className="text-slate-400">—</span>,
          },
          {
            key: "referencia",
            header: "Referencia",
            hideOnMobile: true,
            render: (p: InvoicePaymentOut) => p.referencia || "—",
          },
          {
            key: "observaciones",
            header: "Obs.",
            hideOnMobile: true,
            render: (p: InvoicePaymentOut) => <ObsCell text={p.observaciones} />,
          },
          {
            key: "comprobantes",
            header: "Comprobante",
            exportable: false,
            render: (p: InvoicePaymentOut) =>
              p.comprobantes.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewReceipt?.(p.id, p.comprobantes[0].id)}
                >
                  <Paperclip className="size-3.5" />
                  Ver
                </Button>
              ) : (
                <span className="text-slate-400">—</span>
              ),
          },
        ]}
        data={payments}
        keyExtractor={(p) => p.id}
        emptyMessage="Sin pagos registrados"
      />
    </div>
  );
}
