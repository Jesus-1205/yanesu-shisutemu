import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { PaymentMethodOut, InvoicePaymentSummary } from "@/types/api";
import type { FacturaOut as Invoice } from "@/types/api";
import Button from "@/ui-components/Button";
import Modal from "@/ui-components/Modal";
import { useToast } from "@/ui-components/Toast";
import { formatBs, formatUsd } from "@/lib/text";
import { toCents } from "@/lib/money";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  paymentSummary: InvoicePaymentSummary | null;
  onSuccess: () => void;
}

export default function PaymentModal({ open, onClose, invoice, paymentSummary, onSuccess }: PaymentModalProps) {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethodOut[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobantes, setComprobantes] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  const isBs = invoice.moneda_principal === "BS";
  const saldoPendiente = isBs
    ? Number(paymentSummary?.saldo_pendiente_bs ?? invoice.total_bs)
    : Number(paymentSummary?.saldo_pendiente_usd ?? invoice.total_usd);
  const totalFactura = isBs
    ? Number(paymentSummary?.total_factura_bs ?? invoice.total_bs)
    : Number(paymentSummary?.total_factura_usd ?? invoice.total_usd);
  const totalPagado = isBs
    ? Number(paymentSummary?.total_pagado_bs ?? 0)
    : Number(paymentSummary?.total_pagado_usd ?? 0);
  const prefix = isBs ? "Bs." : "$";
  const formatFn = isBs ? formatBs : formatUsd;

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
  const excedeSaldo = Math.round(montoNum * 100) / 100 > saldoPendiente;
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
      toast(`Pago de ${prefix} ${formatFn(montoNum)} registrado`, "success");
      onSuccess();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al registrar pago", "error");
    } finally {
      setSaving(false);
    }
  }, [isValid, saving, invoice.id, selectedMethodId, montoNum, isBs, referencia, observaciones, comprobantes, prefix, formatFn, toast, onSuccess, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Registrar Pago" className="max-w-md">
      <div className="space-y-5">
        {/* Resumen de la factura */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-500">Factura #{invoice.numero_factura}</p>
              <p className="text-sm font-medium text-text-main">{invoice.supplier?.nombre}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-200">
            <div>
              <p className="text-slate-500">Total</p>
              <p className="font-bold font-mono text-sm text-text-main">{prefix} {formatFn(totalFactura)}</p>
            </div>
            <div>
              <p className="text-green-600">Pagado</p>
              <p className="font-bold font-mono text-sm text-green-700">{prefix} {formatFn(totalPagado)}</p>
            </div>
            <div>
              <p className="text-red-600">Pendiente</p>
              <p className="font-bold font-mono text-sm text-red-700">{prefix} {formatFn(saldoPendiente)}</p>
            </div>
          </div>
        </div>

        {/* Monto a pagar */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Monto a pagar</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono">{prefix}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max={saldoPendiente}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 bg-surface pl-10 pr-3 text-sm text-text-main font-mono outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
          {excedeSaldo && (
            <p className="text-xs text-red-500 mt-1">El monto excede el saldo pendiente</p>
          )}
          {/* Botones rápidos */}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setMonto(String(saldoPendiente))}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Pagar todo
            </button>
            <button
              type="button"
              onClick={() => setMonto(String(Math.round(saldoPendiente / 2 * 100) / 100))}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Mitad
            </button>
            {saldoPendiente > 0 && (
              <button
                type="button"
                onClick={() => setMonto("")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Otro
              </button>
            )}
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">Método de pago</label>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethodId(m.id)}
                className={`rounded-lg border-2 px-3 py-2.5 text-center transition-all cursor-pointer ${
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

        {/* Referencia */}
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

        {/* Comprobante de pago */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Comprobante de pago</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            multiple
            onChange={(e) => setComprobantes(Array.from(e.target.files || []))}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Máx. 5MB por archivo • JPG, PNG, WebP, GIF o PDF
            {comprobantes.length > 0 && ` • ${comprobantes.length} archivo${comprobantes.length > 1 ? "s" : ""} seleccionado${comprobantes.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones</label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm resize-none outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        {/* Acciones */}
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
    </Modal>
  );
}
