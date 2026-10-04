import type { FacturaOut as Invoice } from "@/types/api";
import Button from "@/ui-components/Button";
import Drawer from "@/ui-components/Drawer";
import { usePaymentDrawer } from "../hooks/usePaymentDrawer";
import PaymentDrawerSummary from "./PaymentDrawerSummary";
import PaymentDrawerMethodGrid from "./PaymentDrawerMethodGrid";

interface PaymentDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export default function PaymentDrawer({ open, onClose, invoice, onSuccess }: PaymentDrawerProps) {
  const {
    methods,
    selectedMethodId,
    setSelectedMethodId,
    monto,
    setMonto,
    referencia,
    setReferencia,
    setComprobantes,
    observaciones,
    setObservaciones,
    saving,
    isBs,
    saldoPendiente,
    prefix,
    selectedMethod,
    excedeSaldo,
    isValid,
    handleConfirm,
  } = usePaymentDrawer({
    open,
    onClose,
    invoice,
    onSuccess,
  });

  return (
    <Drawer open={open} onClose={onClose} title="Registrar Pago">
      <div className="space-y-5">
        <PaymentDrawerSummary
          invoice={invoice}
          isBs={isBs}
          prefix={prefix}
          saldoPendiente={saldoPendiente}
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Monto a pagar</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
          {excedeSaldo && (
            <p className="mt-1 text-xs text-red-500">El monto excede el saldo pendiente</p>
          )}
        </div>

        <PaymentDrawerMethodGrid
          methods={methods}
          selectedMethodId={selectedMethodId}
          onSelectMethod={setSelectedMethodId}
        />

        {selectedMethod?.acepta_referencia && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Referencia</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Número de referencia"
              className="h-10 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Comprobante de pago</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => setComprobantes(Array.from(e.target.files || []))}
            className="w-full cursor-pointer text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-blue/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-blue hover:file:bg-brand-blue/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Observaciones</label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full resize-none rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="accent"
            onClick={handleConfirm}
            loading={saving}
            disabled={!isValid}
          >
            Registrar Pago
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
