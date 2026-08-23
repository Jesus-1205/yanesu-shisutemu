import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { PaymentMethodOut } from "@/types/api";
import type { FacturaOut as Invoice } from "@/types/api";
import Button from "@/ui-components/Button";
import Drawer from "@/ui-components/Drawer";
import { useToast } from "@/ui-components/Toast";
import { formatBs } from "@/lib/text";
import { toCents } from "@/lib/money";

interface PaymentDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export default function PaymentDrawer({ open, onClose, invoice, onSuccess }: PaymentDrawerProps) {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethodOut[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobantes, setComprobantes] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  const isBs = invoice.moneda_principal === "BS";
  const saldoPendiente = isBs ? invoice.total_bs : invoice.total_usd;
  const prefix = isBs ? "Bs." : "$";

  useEffect(() => {
    if (open) {
      setMonto(String(saldoPendiente));
      setSelectedMethodId(null);
      setReferencia("");
      setComprobantes([]);
      setObservaciones("");
      api.getPaymentMethods().then((data) => {
        const active = Array.isArray(data) ? data.filter((m: PaymentMethodOut) => m.activo) : [];
        setMethods(active);
      }).catch(() => {});
    }
  }, [open, saldoPendiente]);

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);
  const montoNum = Number(monto) || 0;
  const excedeSaldo = montoNum > saldoPendiente + 0.01;
  const isValid = montoNum > 0 && selectedMethodId !== null && !excedeSaldo;

  const handleConfirm = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await api.registerInvoicePayment(
        invoice.id,
        {
          metodo_pago_id: selectedMethodId!,
          monto_usd: isBs ? 0 : toCents(montoNum),
          monto_bs: isBs ? toCents(montoNum) : 0,
          referencia: referencia.trim() || null,
          observaciones: observaciones.trim() || null,
        },
        comprobantes.length > 0 ? comprobantes : undefined,
      );
      toast(`Pago de ${prefix} ${formatBs(montoNum)} registrado`, "success");
      onSuccess();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al registrar pago", "error");
    } finally {
      setSaving(false);
    }
  }, [isValid, saving, invoice.id, selectedMethodId, montoNum, isBs, referencia, observaciones, comprobantes, prefix, toast, onSuccess, onClose]);

  return (
    <Drawer open={open} onClose={onClose} title="Registrar Pago">
      <div className="space-y-5">
        <div className="bg-slate-50 rounded-xl p-3 space-y-1">
          <p className="text-xs text-slate-500">Factura #{invoice.numero_factura}</p>
          <p className="text-sm font-medium">{invoice.supplier?.nombre}</p>
          <div className="flex justify-between mt-2 text-xs">
            <span>Total: <strong>{prefix} {formatBs(isBs ? invoice.total_bs : invoice.total_usd)}</strong></span>
            <span className="text-green-600">Pagado: <strong>{prefix} {formatBs(isBs ? invoice.total_bs - saldoPendiente : invoice.total_usd - saldoPendiente)}</strong></span>
            <span className="text-red-600">Saldo: <strong>{prefix} {formatBs(saldoPendiente)}</strong></span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Monto a pagar</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
          {excedeSaldo && (
            <p className="text-xs text-red-500 mt-1">El monto excede el saldo pendiente</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">Método de pago</label>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethodId(m.id)}
                className={`rounded-lg border-2 px-3 py-2 text-center transition-all cursor-pointer ${
                  selectedMethodId === m.id
                    ? "border-brand-blue bg-blue-50 text-brand-blue font-semibold"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-xs">{m.nombre}</div>
                <div className="text-[10px] opacity-70">{m.moneda_default}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedMethod?.acepta_referencia && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Referencia</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Número de referencia"
              className="w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Comprobante de pago</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => setComprobantes(Array.from(e.target.files || []))}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones</label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm resize-none outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
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
