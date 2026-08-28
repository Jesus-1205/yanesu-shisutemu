import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, CreditCard, DollarSign, Landmark, Plus, Smartphone } from "lucide-react";
import { api } from "@/services/api";
import type { FacturaOut as Invoice, ExchangeRateOut } from "@/types/api";
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
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

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

  // Tasa BS
  const exchangeRateStore = useExchangeRateStore();
  const [tasaBs, setTasaBs] = useState<number>(0);
  const [tasaBsInput, setTasaBsInput] = useState<string>("");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateOut[]>([]);
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mora
  const [showMoraSection, setShowMoraSection] = useState(false);
  const [totalAPagar, setTotalAPagar] = useState<string>("");

  const selectedMethod = methods.find((m) => m.id === store.selectedMethodId);
  const payInUsd = selectedMethod?.moneda_default === "USD";

  // Saldo pendiente en ambas monedas
  // USD: valor del backend (fuente de verdad)
  // BS: calculado desde USD × tasa, para mantener sincronización
  const saldoPendienteUsd = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.saldo_pendiente_usd ?? invoice.total_usd);
  }, [invoice, paymentSummary]);

  const saldoPendienteBs = useMemo(() => {
    if (!invoice) return 0;
    if (tasaBs > 0) return toCents(saldoPendienteUsd * tasaBs);
    return Number(paymentSummary?.saldo_pendiente_bs ?? invoice.total_bs);
  }, [invoice, paymentSummary, saldoPendienteUsd, tasaBs]);

  // Total factura en ambas monedas
  const totalFacturaUsd = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_factura_usd ?? invoice.total_usd);
  }, [invoice, paymentSummary]);

  const totalFacturaBs = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_factura_bs ?? invoice.total_bs);
  }, [invoice, paymentSummary]);

  // Total pagado en ambas monedas
  const totalPagadoUsd = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_pagado_usd ?? 0);
  }, [invoice, paymentSummary]);

  const totalPagadoBs = useMemo(() => {
    if (!invoice) return 0;
    return Number(paymentSummary?.total_pagado_bs ?? 0);
  }, [invoice, paymentSummary]);

  // Saldo pendiente en la moneda del método de pago
  // Saldo en la moneda del método de pago
  const saldoEnMonedaPago = useMemo(() => {
    if (!selectedMethod) return saldoPendienteUsd;
    if (payInUsd) return saldoPendienteUsd;
    // Si BS=0 pero USD>0, calcular BS equivalente con tasa actual
    if (saldoPendienteBs <= 0 && saldoPendienteUsd > 0 && tasaBs > 0) {
      return toCents(saldoPendienteUsd * tasaBs);
    }
    return saldoPendienteBs;
  }, [selectedMethod, payInUsd, saldoPendienteUsd, saldoPendienteBs, tasaBs]);

  const montoNum = Number(store.monto) || 0;
  const excedeSaldo = toCents(montoNum) > toCents(saldoEnMonedaPago);
  const isValid = montoNum > 0 && store.selectedMethodId !== null && !excedeSaldo;

  // Cálculos de conversión
  // BS→USD se redondea hacia abajo (floor) para no sobre-pagar en USD
  const montoUsd = useMemo(() => {
    if (montoNum <= 0) return 0;
    if (payInUsd) return toCents(montoNum);
    if (tasaBs > 0) return Math.floor((montoNum / tasaBs) * 100) / 100;
    return 0;
  }, [montoNum, payInUsd, tasaBs]);

  const montoBs = useMemo(() => {
    if (montoNum <= 0) return 0;
    if (!payInUsd) return toCents(montoNum);
    if (tasaBs > 0) return toCents(montoNum * tasaBs);
    return 0;
  }, [montoNum, payInUsd, tasaBs]);

  // Saldo restante calculado directo en la moneda del pago (exacto al input del usuario)
  const saldoRestanteEnMonedaPago = useMemo(() => {
    return Math.max(0, toCents(saldoEnMonedaPago - montoNum));
  }, [saldoEnMonedaPago, montoNum]);

  const saldoRestanteUsd = useMemo(() => {
    if (payInUsd) return saldoRestanteEnMonedaPago;
    if (tasaBs > 0) return toCents(saldoRestanteEnMonedaPago / tasaBs);
    return 0;
  }, [payInUsd, saldoRestanteEnMonedaPago, tasaBs]);

  const saldoRestanteBs = useMemo(() => {
    if (!payInUsd) return saldoRestanteEnMonedaPago;
    if (tasaBs > 0) return toCents(saldoRestanteEnMonedaPago * tasaBs);
    return 0;
  }, [payInUsd, saldoRestanteEnMonedaPago, tasaBs]);

  // Mora
  const montoMoraBs = useMemo(() => {
    const parsed = Number(totalAPagar);
    if (!totalAPagar || isNaN(parsed) || parsed <= 0) return 0;
    const diff = toCents(parsed) - montoBs;
    return diff > 0 ? toCents(diff) : 0;
  }, [totalAPagar, montoBs]);

  // Validación de mora
  const totalAPagarNum = useMemo(() => {
    const parsed = Number(totalAPagar);
    if (!totalAPagar || isNaN(parsed) || parsed <= 0) return montoBs;
    return toCents(parsed);
  }, [totalAPagar, montoBs]);

  const excedeTotal = totalAPagarNum > 0 && totalAPagarNum < montoBs;

  // Fetch invoice
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

  // Fetch payment data
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

  // Fetch exchange rates
  const fetchExchangeRates = useCallback(async () => {
    try {
      const ratesData = await api.getRateHistory({ days: 30 });
      if (exchangeRateStore.tasa === 0) {
        await exchangeRateStore.loadTasa();
      }
      const items = ratesData.history ?? [];
      setExchangeRates(items.slice(0, 10));
      const current = exchangeRateStore.tasa > 0
        ? Math.round(exchangeRateStore.tasa * 100) / 100
        : items.length > 0 ? Math.round(Number(items[0].tasa_usd) * 100) / 100 : 0;
      if (current > 0) {
        setTasaBs(current);
        setTasaBsInput(String(current));
      }
    } catch {
      // silently fail
    }
  }, [exchangeRateStore]);

  useEffect(() => {
    fetchInvoice();
    fetchPaymentData();
  }, [fetchInvoice, fetchPaymentData]);

  useEffect(() => {
    fetchExchangeRates();
  }, [fetchExchangeRates]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowRateDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset totalAPagar when montoBs changes
  useEffect(() => {
    if (!showMoraSection) {
      setTotalAPagar("");
    }
  }, [montoBs, showMoraSection]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting || !invoice) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.registerInvoicePayment(
        invoice.id,
        {
          metodo_pago_id: store.selectedMethodId!,
          monto_usd: montoUsd,
          monto_bs: montoBs,
          tasa_bs: tasaBs > 0 ? tasaBs : null,
          monto_mora: montoMoraBs,
          referencia: store.referencia.trim() || null,
          observaciones: store.observaciones.trim() || null,
        },
        store.comprobantes.length > 0 ? store.comprobantes : undefined,
      );
      toast(`Pago de ${payInUsd ? formatUsd(montoNum) : `Bs. ${formatBs(montoNum)}`} registrado`, "success");
      navigate(`/invoices/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar pago");
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, invoice, store, montoUsd, montoBs, montoNum, montoMoraBs, tasaBs, payInUsd, toast, navigate, id]);

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
        {/* Columna izquierda: Formulario */}
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

          {/* Monto a pagar */}
          {store.selectedMethodId && (
            <section>
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Monto a pagar
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Saldo pendiente:{" "}
                <span className="font-mono font-medium text-slate-700">
                  {payInUsd ? formatUsd(saldoEnMonedaPago) : `Bs. ${formatBs(saldoEnMonedaPago)}`}
                </span>
                <span className="text-slate-400 ml-1">
                  ({formatUsd(saldoPendienteUsd)} / Bs. {formatBs(saldoPendienteBs)})
                </span>
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-slate-500 font-mono font-semibold">
                  {payInUsd ? "$" : "Bs."}
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

              {/* Quedaría por pagar - ambos montos */}
              {montoNum > 0 && !excedeSaldo && (
                <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium mb-1">Quedaría por pagar</p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-green-700">
                      {formatUsd(saldoRestanteUsd)}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono font-bold text-sm text-green-700">
                      Bs. {formatBs(saldoRestanteBs)}
                    </span>
                  </div>
                </div>
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

              {/* Conversión de moneda - siempre muestra ambos */}
              {tasaBs > 0 && montoNum > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-700">
                      {payInUsd ? formatUsd(montoNum) : `Bs. ${formatBs(montoNum)}`}
                    </span>
                    <span className="text-amber-400">→</span>
                    <span className="text-amber-800 font-bold font-mono">
                      {payInUsd ? `Bs. ${formatBs(montoBs)}` : formatUsd(montoUsd)}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1">
                    Tasa BCV: {formatBs(tasaBs)}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Tasa de cambio */}
          {store.selectedMethodId && (
            <section>
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Tasa de cambio (BS/USD)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Usa la tasa BCV actual o selecciona una reciente
              </p>
              <div className="relative" ref={dropdownRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tasaBsInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTasaBsInput(val);
                        const num = Number(val);
                        if (!isNaN(num) && num > 0) setTasaBs(Math.round(num * 100) / 100);
                      }}
                      className="w-full h-11 rounded-xl border-2 border-slate-200 bg-surface pl-4 pr-10 text-sm font-mono text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                      placeholder="Ej: 791.32"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      Bs./USD
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRateDropdown(!showRateDropdown)}
                    className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-surface hover:border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                    title="Ver tasas recientes"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                {showRateDropdown && exchangeRates.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {exchangeRates.map((rate) => (
                      <button
                        key={rate.id}
                        type="button"
                        onClick={() => {
                          const rounded = Math.round(Number(rate.tasa_usd) * 100) / 100;
                          setTasaBs(rounded);
                          setTasaBsInput(String(rounded));
                          setShowRateDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex justify-between items-center cursor-pointer"
                      >
                        <span className="font-mono font-medium text-text-main">
                          {formatBs(Number(rate.tasa_usd))}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(rate.fecha_registro).toLocaleDateString("es-VE")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Mora - hidden por defecto */}
          {store.selectedMethodId && tasaBs > 0 && montoNum > 0 && (
            <section>
              {!showMoraSection ? (
                <button
                  type="button"
                  onClick={() => setShowMoraSection(true)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Agregar mora (opcional)
                </button>
              ) : (
                <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Mora (opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoraSection(false);
                        setTotalAPagar("");
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Ocultar
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Si el proveedor cobra recargo por pago tardío, ingrésalo aquí. No afecta el total original de la factura.
                  </p>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Monto calculado: <span className="font-mono font-medium text-slate-700">Bs. {formatBs(montoBs)}</span>
                    </p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono font-semibold">
                        Bs.
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min={montoBs}
                        value={totalAPagar}
                        onChange={(e) => setTotalAPagar(e.target.value)}
                        className="w-full h-11 rounded-xl border-2 border-slate-200 bg-surface pl-10 pr-4 text-sm font-mono text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                        placeholder={`Mínimo: ${formatBs(montoBs)}`}
                      />
                    </div>
                    {montoMoraBs > 0 && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium">
                        Mora: <span className="font-mono">Bs. {formatBs(montoMoraBs)}</span>
                      </p>
                    )}
                    {excedeTotal && (
                      <p className="text-xs text-red-500 mt-1.5">El total no puede ser menor al monto del pago</p>
                    )}
                  </div>
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

        {/* Columna derecha: Sidebar sticky */}
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

              {/* Total en ambas monedas */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total</span>
                  <div className="text-right">
                    <div className="font-bold font-mono text-sm text-text-main">{formatUsd(totalFacturaUsd)}</div>
                    <div className="font-mono text-xs text-slate-400">Bs. {formatBs(totalFacturaBs)}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-600">Pagado</span>
                  <div className="text-right">
                    <div className="font-bold font-mono text-sm text-green-700">{formatUsd(totalPagadoUsd)}</div>
                    <div className="font-mono text-xs text-green-600">Bs. {formatBs(totalPagadoBs)}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-red-600 font-medium">Pendiente</span>
                  <div className="text-right">
                    <div className="font-bold font-mono text-sm text-red-700">{formatUsd(saldoPendienteUsd)}</div>
                    <div className="font-mono text-xs text-red-600">Bs. {formatBs(saldoPendienteBs)}</div>
                  </div>
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
