import React from "react";
import { ArrowRight } from "lucide-react";
import Button from "@/ui-components/Button";
import InvoiceCard from "./InvoiceCard";
import type { FacturaListOut } from "@/types/api";

export interface ComprasHubPendingInvoicesProps {
  invoices: FacturaListOut[];
  onViewAll: () => void;
  onViewInvoice: (id: number) => void;
  onPayInvoice?: (id: number) => void;
}

export const ComprasHubPendingInvoices: React.FC<ComprasHubPendingInvoicesProps> = ({
  invoices,
  onViewAll,
  onViewInvoice,
  onPayInvoice,
}) => {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-main">Facturas Próximas a Vencer</h2>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          Ver todas
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-surface p-8 text-center">
          <p className="text-sm text-slate-500">No hay facturas pendientes por vencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onView={() => onViewInvoice(inv.id)}
              onPay={
                inv.estado_pago !== "PAGADA" && onPayInvoice
                  ? () => onPayInvoice(inv.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ComprasHubPendingInvoices;
