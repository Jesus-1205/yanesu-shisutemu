import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CreditCard, DollarSign, Landmark, Smartphone } from "lucide-react";
import { api } from "@/services/api";
import type { FacturaOut as Invoice } from "@/types/api";
import type { PaymentMethodOut, InvoicePaymentSummary } from "@/types/api";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import PageHeader from "@/ui-components/PageHeader";
import FileUpload from "@/ui-components/FileUpload";
import { useToast } from "@/ui-components/Toast";
import { formatBs, formatUsd } from "@/lib/text";
import { toCents } from "@/lib/money";
import { usePaymentFormStore } from "../store/paymentFormStore";

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  "transferencia": Landmark,
  "tarjeta": CreditCard,
  "pago movil": Smartphone,
  "pago móvil": Smartphone,
  "efectivo": DollarSign,
};

function getMethodIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(METHOD_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return CreditCard;
}

export default function InvoicePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const store = usePaymentFormStore();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<InvoicePaymentSummary | null>(null);
  const [methods, setMethods] = useState<PaymentMethodOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const paidToastShown = useRef(false);

  const isBs = invoice?.moneda_principal === "BS";
  const tasaBs = Number(invoice?.tasa_bs) || 1;

  const saldoPendiente = useMemo(() => {
    if (!invoice) return 0;
    return isBs
      ? Number(paymentSummary?.saldo_pendiente_bs ?? invoice.total_bs)
      : Number(paymentSummary?.saldo_pendiente_usd ?? invoice.total_usd);
  }, [invoice, paymentSummary, isBs]);

  const totalFactura = useMemo(() => {
    if (!invoice) return 0;
    return isBs
      ? Number(paymentSummary?.total_factura_bs ?? invoice.total_bs)
      : Number(paymentSummary?.total_factura_usd ?? invoice.total_usd);
  }, [invoice, paymentSummary, isBs]);

  const totalPagado = useMemo(() => {
    if (!invoice) return 0;
    return isBs
      ? Number(paymentSummary?.total_pagado_bs ?? 0)
      : Number(paymentSummary?.total_pagado_usd ?? 0);
  }, [invoice, paymentSummary, isBs]);

  const selectedMethod = methods.find((m) => m.id === store.selectedMethodId);
  const payInUsd = selectedMethod?.moneda_default === "USD";

  const saldoEnMonedaPago = useMemo(() => {
    if (!selectedMethod) return saldoPendiente;
    if (isBs && payInUsd) return saldoPendiente / tasaBs;
    if (!isBs && !payInUsd) return saldoPendiente * tasaBs;
    return saldoPendiente;
  }, [isBs, payInUsd, saldoPendiente, tasaBs, selectedMethod]);

  const formatPay = payInUsd ? formatUsd : formatBs;
  const payPrefix = payInUsd ? "$" : "Bs.";

  const montoNum = Number(store.monto) || 0;
  const excedeSaldo = toCents(montoNum) > toCents(saldoEnMonedaPago);
  const isValid = montoNum > 0 && store.selectedMethodId !== null && !excedeSaldo;

  const montoConvertido = useMemo(() => {
    if (!selectedMethod || montoNum <= 0) return null;
    if (isBs && payInUsd) return toCents(montoNum * tasaBs);
    if (!isBs && !payInUsd) return toCents(montoNum / tasaBs);
    return null;
  }, [isBs, payInUsd, montoNum, tasaBs, selectedMethod]);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoice(Number(id));
      setInvoice(data);
      if (data.estado_pago === "PAGADA") {
        if (!paidToastShown.current) {
          paidToastShown.current = true;
          toast("Esta factura ya está pagada", "info");
        }
        navigate(`/invoices/${id}`, { replace: true });
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar factura");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  const fetchPaymentData = useCallback(async () => {
    if (!id) return;
    try {
      const [methodsData, paymentsData] = await Promise.all([
        api.getPaymentMethods(),
        api.getInvoicePayments(Number(id)),
      ]);
      setMethods(Array.isArray(methodsData) ? methodsData.filter((m) => m.activo) : []);
      setPaymentSummary(paymentsData.resumen);
    } catch {
      // silently fail
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
    fetchPaymentData();
  }, [fetchInvoice, fetchPaymentData]);

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting || !invoice) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.registerInvoicePayment(
        invoice.id,
        {
          metodo_pago_id: store.selectedMethodId!,
          monto_usd: payInUsd ? toCents(montoNum) : 0,
          monto_bs: payInUsd ? 0 : toCents(montoNum),
          referencia: store.referencia.trim() || null,
          observaciones: store.observaciones.trim() || null,
        },
        store.comprobantes.length > 0 ? store.comprobantes : undefined,
      );
      toast(`Pago de ${formatPay(montoNum)} registrado`, "success");
      navigate(`/invoices/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar pago");
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, invoice, store, payInUsd, montoNum, formatPay, toast, navigate, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div>
        <PageHeader
          title="Registrar Pago"
          actions={
            <Button variant="ghost" onClick={() => navigate(`/invoices/${id}`)}>
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          }
        />
        <div className="mt-4">
          <ErrorBanner onRetry={fetchInvoice}>{error || "Factura no encontrada"}</ErrorBanner>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Registrar Pago"
        description={`Factura #${invoice.numero_factura} — ${invoice.supplier?.nombre || "Proveedor"}`}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/invoices/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl">
        {/* ─── Columna izquierda: Formulario ──────────────────────── */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Método de pago */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Método de pago
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {methods.map((method) => {
                const Icon = getMethodIcon(method.nombre);
                const selected = store.selectedMethodId === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => store.setMethod(method.id)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer text-center
                      ${selected
                        ? "border-brand-blue bg-blue-50 ring-2 ring-brand-blue/20"
                        : "border-slate-200 bg-surface hover:border-slate-300 hover:bg-slate-50"
                      }
                    `}
                  >
                    <Icon className={`w-6 h-6 ${selected ? "text-brand-blue" : "text-slate-400"}`} />
                    <span className={`text-sm font-medium ${selected ? "text-brand-blue" : "text-text-main"}`}>
                      {method.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      {method.moneda_default === "USD" ? "USD" : "VES"}
                      {method.acepta_referencia && " · Ref."}
                    </span>
                  </button>
                );
              })}
              {methods.length === 0 && (
                <p className="col-span-full text-sm text-slate-400 py-4 text-center">
                  No hay métodos de pago activos
                </p>
              )}
            </div>
          </section>

          {/* Monto */}
          {store.selectedMethodId && (
            <section>
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Monto a pagar
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Saldo pendiente: <span className="font-mono font-medium text-slate-700">{formatPay(saldoEnMonedaPago)}</span>
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-slate-500 font-mono font-semibold">
                  {payPrefix}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={toCents(saldoEnMonedaPago)}
                  value={store.monto}
                  onChange={(e) => store.setMonto(e.target.value)}
                  className="w-full h-14 rounded-xl border-2 border-slate-200 bg-surface pl-12 pr-4 text-xl font-mono font-semibold text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="0.00"
                />
              </div>
              {excedeSaldo && (
                <p className="text-xs text-red-500 mt-1.5">El monto excede el saldo pendiente</p>
              )}
              {montoNum > 0 && !excedeSaldo && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Quedaría por pagar:{" "}
                  <span className="font-mono font-medium text-slate-700">
                    {formatPay(Math.max(0, toCents(saldoEnMonedaPago - montoNum)))}
                  </span>
                </p>
              )}

              {/* Botones rápidos */}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => store.setMonto(String(toCents(saldoEnMonedaPago)))}
                  className="flex-1 h-10 px-4 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Pagar todo
                </button>
                <button
                  type="button"
                  onClick={() => store.setMonto(String(toCents(saldoEnMonedaPago / 2)))}
                  className="flex-1 h-10 px-4 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Mitad
                </button>
                <button
                  type="button"
                  onClick={() => store.setMonto("")}
                  className="h-10 px-4 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Otro
                </button>
              </div>

              {/* Conversión de moneda */}
              {montoConvertido !== null && montoNum > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-amber-700 font-medium">
                      {payPrefix}{formatPay(montoNum)}
                    </span>
                    <span className="text-amber-400">→</span>
                    <span className="text-amber-800 font-bold font-mono">
                      {payInUsd ? `Bs. ${formatBs(montoConvertido)}` : formatUsd(montoConvertido)}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1">
                    Tasa BCV: {formatBs(tasaBs)}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Referencia */}
          {selectedMethod?.acepta_referencia && (
            <section>
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                Referencia
              </label>
              <input
                type="text"
                value={store.referencia}
                onChange={(e) => store.setReferencia(e.target.value)}
                placeholder="Número de referencia"
                className="w-full h-11 rounded-xl border-2 border-slate-200 bg-surface px-4 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </section>
          )}

          {/* Comprobantes */}
          <section>
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Comprobantes de pago
            </label>
            <FileUpload
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              maxSize={5 * 1024 * 1024}
              onFilesChange={(files) => {
                store.comprobantes.length === 0 && files.length > 0
                  ? store.addComprobantes(files)
                  : null;
              }}
            />
          </section>

          {/* Observaciones */}
          <section>
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Observaciones
            </label>
            <textarea
              rows={3}
              value={store.observaciones}
              onChange={(e) => store.setObservaciones(e.target.value)}
              placeholder="Notas opcionales sobre este pago..."
              className="w-full rounded-xl border-2 border-slate-200 bg-surface px-4 py-3 text-sm resize-none outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </section>
        </div>

        {/* ─── Columna derecha: Sidebar sticky ────────────────────── */}
        <div className="lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Resumen de factura */}
            <div className="rounded-xl border border-slate-200 bg-surface p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500">Factura</p>
                <p className="text-sm font-bold text-text-main">#{invoice.numero_factura}</p>
                <p className="text-xs text-slate-500 mt-0.5">{invoice.supplier?.nombre}</p>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    invoice.estado_pago === "PAGADA" ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(paymentSummary?.porcentaje_pagado ?? 0, 100)}%` }}
                />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold font-mono text-sm text-text-main">
                    {isBs ? `Bs. ${formatBs(totalFactura)}` : formatUsd(totalFactura)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-600">Pagado</span>
                  <span className="font-bold font-mono text-sm text-green-700">
                    {isBs ? `Bs. ${formatBs(totalPagado)}` : formatUsd(totalPagado)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-red-600 font-medium">Pendiente</span>
                  <span className="font-bold font-mono text-sm text-red-700">
                    {isBs ? `Bs. ${formatBs(saldoPendiente)}` : formatUsd(saldoPendiente)}
                  </span>
                </div>
              </div>

              <Badge
                variant={
                  invoice.estado_pago === "PAGADA" ? "success"
                  : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "warning"
                  : "danger"
                }
                className="w-full justify-center"
              >
                {invoice.estado_pago === "PAGADA" ? "Pagada"
                  : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "Parcial"
                  : "Pendiente"}
              </Badge>
            </div>

            {/* Acciones */}
            <div className="space-y-2">
              {submitError && (
                <ErrorBanner>{submitError}</ErrorBanner>
              )}
              <Button
                variant="accent"
                className="w-full h-12 text-base"
                disabled={!isValid || submitting}
                onClick={handleSubmit}
                loading={submitting}
              >
                <DollarSign className="w-5 h-5" />
                Registrar Pago
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
