import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { PaymentMethodOut, InvoicePaymentSummary } from "@/types/api";
import type { FacturaOut as Invoice } from "@/types/api";
import Button from "@/ui-components/Button";
import Modal from "@/ui-components/Modal";
import Select from "@/ui-components/Select";
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
  const tasaBs = Number(invoice.tasa_bs) || 1;

  const saldoPendienteFactura = isBs
    ? Number(paymentSummary?.saldo_pendiente_bs ?? invoice.total_bs)
    : Number(paymentSummary?.saldo_pendiente_usd ?? invoice.total_usd);
  const totalFactura = isBs
    ? Number(paymentSummary?.total_factura_bs ?? invoice.total_bs)
    : Number(paymentSummary?.total_factura_usd ?? invoice.total_usd);
  const totalPagado = isBs
    ? Number(paymentSummary?.total_pagado_bs ?? 0)
    : Number(paymentSummary?.total_pagado_usd ?? 0);

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);
  const payInUsd = selectedMethod?.moneda_default === "USD";

  const saldoEnMonedaPago = useMemo(() => {
    if (!selectedMethod) return saldoPendienteFactura;
    if (isBs && payInUsd) return saldoPendienteFactura / tasaBs;
    if (!isBs && !payInUsd) return saldoPendienteFactura * tasaBs;
    return saldoPendienteFactura;
  }, [isBs, payInUsd, saldoPendienteFactura, tasaBs, selectedMethod]);

  const formatPay = payInUsd ? formatUsd : formatBs;
  const payPrefix = payInUsd ? "$" : "Bs.";

  useEffect(() => {
    if (open) {
      setMonto(String(Math.round(saldoPendienteFactura * 100) / 100));
      setSelectedMethodId(null);
      setReferencia("");
      setComprobantes([]);
      setObservaciones("");
      api.getPaymentMethods().then((data) => {
        const active = Array.isArray(data) ? data.filter((m: PaymentMethodOut) => m.activo) : [];
        setMethods(active);
      }).catch(() => {});
    }
  }, [open, saldoPendienteFactura]);

  const montoNum = Number(monto) || 0;
  const excedeSaldo = Math.round(montoNum * 100) / 100 > Math.round(saldoEnMonedaPago * 100) / 100;
  const isValid = montoNum > 0 && selectedMethodId !== null && !excedeSaldo;

  const handleConfirm = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await api.registerInvoicePayment(
        invoice.id,
        {
          metodo_pago_id: selectedMethodId!,
          monto_usd: payInUsd ? toCents(montoNum) : 0,
          monto_bs: payInUsd ? 0 : toCents(montoNum),
          referencia: referencia.trim() || null,
          observaciones: observaciones.trim() || null,
        },
        comprobantes.length > 0 ? comprobantes : undefined,
      );
      toast(`Pago de ${formatPay(montoNum)} registrado`, "success");
      onSuccess();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al registrar pago", "error");
    } finally {
      setSaving(false);
    }
  }, [isValid, saving, invoice.id, selectedMethodId, montoNum, payInUsd, referencia, observaciones, comprobantes, formatPay, toast, onSuccess, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Registrar Pago" className="max-w-md">
      <div className="space-y-5">
        {/* Resumen de la factura */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-500">Factura #{invoice.numero_factura}</p>
              <p className="text-sm font-medium text-text-main">{invoice.supplier?.nombre}</p>
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total</span>
              <span className="font-bold font-mono text-sm text-text-main">{isBs ? `Bs. ${formatBs(totalFactura)}` : formatUsd(totalFactura)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-600">Pagado</span>
              <span className="font-bold font-mono text-sm text-green-700">{isBs ? `Bs. ${formatBs(totalPagado)}` : formatUsd(totalPagado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-600">Pendiente</span>
              <span className="font-bold font-mono text-sm text-red-700">{isBs ? `Bs. ${formatBs(saldoPendienteFactura)}` : formatUsd(saldoPendienteFactura)}</span>
            </div>
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <Select
            value={selectedMethodId ?? ""}
            onChange={(e) => {
              setSelectedMethodId(e.target.value ? Number(e.target.value) : null);
              setMonto("");
            }}
            options={[
              { value: "", label: "Seleccionar método..." },
              ...methods.map((m) => ({
                value: String(m.id),
                label: `${m.nombre} (${m.moneda_default})`,
              })),
            ]}
          />
        </div>

        {/* Monto a pagar */}
        {selectedMethodId && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Monto a pagar
              <span className="ml-1 text-slate-400 font-normal">
                (saldo: {formatPay(saldoEnMonedaPago)})
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono">{payPrefix}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={saldoEnMonedaPago}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-surface pl-10 pr-3 text-sm text-text-main font-mono outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            {excedeSaldo && (
              <p className="text-xs text-red-500 mt-1">El monto excede el saldo pendiente</p>
            )}
            {montoNum > 0 && !excedeSaldo && (
              <p className="text-xs text-slate-500 mt-1">
                Quedaría por pagar: <span className="font-mono font-medium text-slate-700">{formatPay(Math.round((saldoEnMonedaPago - montoNum) * 100) / 100)}</span>
              </p>
            )}
            {/* Botones rápidos */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setMonto(String(Math.round(saldoEnMonedaPago * 100) / 100))}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Pagar todo
              </button>
              <button
                type="button"
                onClick={() => setMonto(String(Math.round(saldoEnMonedaPago / 2 * 100) / 100))}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Mitad
              </button>
              <button
                type="button"
                onClick={() => setMonto("")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Otro
              </button>
            </div>
          </div>
        )}

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
