import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Bot, DollarSign, Paperclip } from "lucide-react";
import { api } from "@/services/api";
import type { Invoice } from "../types";
import type { InvoicePaymentOut, InvoicePaymentSummary } from "@/types/api";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Table from "@/ui-components/Table";
import PageHeader from "@/ui-components/PageHeader";
import Modal from "@/ui-components/Modal";
import { useToast } from "@/ui-components/Toast";
import { formatBs, formatUsd } from "@/lib/text";
import { calcularResumenFiscal } from "@/lib/iva";
import PaymentDrawer from "../components/PaymentDrawer";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [payments, setPayments] = useState<InvoicePaymentOut[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<InvoicePaymentSummary | null>(null);
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoice(Number(id));
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar factura");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      const result = await api.getInvoicePayments(Number(id));
      setPayments(result.pagos);
      setPaymentSummary(result.resumen);
    } catch {
      // silently fail
    }
  }, [id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (searchParams.get("action") === "pay" && invoice && invoice.estado_pago !== "PAGADA") {
      setPaymentDrawerOpen(true);
    }
  }, [searchParams, invoice]);

  const handleDownloadImage = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const name = await api.downloadInvoiceImage(invoice.id);
      toast(`Imagen descargada: ${name}`, "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al descargar la imagen",
        "error",
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Detalle de Factura"
          actions={
            <Button variant="ghost" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          }
        />
        <div className="mt-4">
          <ErrorBanner onRetry={fetchInvoice}>{error}</ErrorBanner>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div>
      <PageHeader
        title={`${invoice.tipo_documento === "NOTA_ENTREGA" ? "Nota" : "Factura"} #${invoice.numero_factura}`}
        description={invoice.supplier?.nombre || "Proveedor desconocido"}
        actions={
          <div className="flex items-center gap-2">
            {invoice.procesada_por_ia && (
              <Button variant="outline" onClick={() => setAiModalOpen(true)}>
                <Bot className="w-4 h-4" />
                Resultado IA
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Tipo</p>
          <p className="text-sm font-medium mt-1">
            {invoice.tipo_documento === "FACTURA" ? "Factura" : "Nota de Entrega"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Proveedor</p>
          <p className="text-sm font-medium mt-1">{invoice.supplier?.nombre || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Fecha</p>
          <p className="text-sm font-medium mt-1">
            {new Date(invoice.fecha_factura).toLocaleDateString("es-VE")}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Límite de Pago</p>
          {invoice.fecha_limite_pago ? (() => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const limite = new Date(invoice.fecha_limite_pago + "T00:00:00");
            const diffMs = limite.getTime() - hoy.getTime();
            const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const esPagada = invoice.estado_pago === "PAGADA";
            return (
              <div className="mt-1">
                <p className="text-sm font-medium">
                  {limite.toLocaleDateString("es-VE")}
                </p>
                {!esPagada && (
                  <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    diffDias < 0
                      ? "bg-red-100 text-red-700"
                      : diffDias === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {diffDias < 0
                      ? `Vencida hace ${Math.abs(diffDias)} día${Math.abs(diffDias) !== 1 ? "s" : ""}`
                      : diffDias === 0
                        ? "Vence hoy"
                        : `${diffDias} día${diffDias !== 1 ? "s" : ""} restante${diffDias !== 1 ? "s" : ""}`
                    }
                  </span>
                )}
              </div>
            );
          })() : (
            <p className="text-sm text-slate-400 mt-1">Sin definir</p>
          )}
        </div>
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
            Total USD
            <Badge variant="info" className="ml-2">{invoice.moneda_principal === "USD" ? "Principal" : "Auto-calc"}</Badge>
          </p>
          <p className="text-sm font-bold mt-1 font-mono">
            {formatUsd(Number(invoice.total_usd))}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
            Total Bs.
            <Badge variant="warning" className="ml-2">{invoice.moneda_principal === "BS" ? "Principal" : "Auto-calc"}</Badge>
          </p>
          <p className="text-sm font-bold mt-1 font-mono">
            Bs. {formatBs(Number(invoice.total_bs))}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Tasa BCV</p>
          <p className="text-sm font-bold mt-1 font-mono">
            {Number(invoice.tasa_bs) > 0 ? formatBs(Number(invoice.tasa_bs)) : "—"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">IVA</p>
          <p className="text-sm font-medium mt-1">
            {invoice.aplica_iva ? "Con IVA" : "Sin IVA"}
          </p>
        </div>
      </div>

      {/* Panel de Estado de Pago */}
      {paymentSummary && (
        <div className="mb-6 p-4 rounded-xl bg-surface border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Estado de Pago</h3>
            {invoice.estado_pago !== "PAGADA" && (
              <Button variant="accent" size="sm" onClick={() => setPaymentDrawerOpen(true)}>
                <DollarSign className="w-4 h-4" />
                Registrar Pago
              </Button>
            )}
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{Math.round(paymentSummary.porcentaje_pagado)}% pagado</span>
              <span>{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.saldo_pendiente_bs)}` : formatUsd(paymentSummary.saldo_pendiente_usd)} pendiente</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  invoice.estado_pago === "PAGADA" ? "bg-green-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(paymentSummary.porcentaje_pagado, 100)}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-slate-500">Total</p>
              <p className="font-bold font-mono mt-0.5">{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.total_factura_bs)}` : formatUsd(paymentSummary.total_factura_usd)}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-green-600">Pagado</p>
              <p className="font-bold font-mono text-green-700 mt-0.5">{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.total_pagado_bs)}` : formatUsd(paymentSummary.total_pagado_usd)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-red-600">Saldo</p>
              <p className="font-bold font-mono text-red-700 mt-0.5">{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.saldo_pendiente_bs)}` : formatUsd(paymentSummary.saldo_pendiente_usd)}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-slate-500">Estado</p>
              <Badge
                variant={
                  invoice.estado_pago === "PAGADA" ? "success"
                  : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "warning"
                  : "danger"
                }
                className="mt-1"
              >
                {invoice.estado_pago === "PAGADA" ? "Pagada" : invoice.estado_pago === "PARCIALMENTE_PAGADA" ? "Parcial" : "Pendiente"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Pagos */}
      {payments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Historial de Pagos</h3>
          <Table
            columns={[
              {
                key: "fecha_pago",
                header: "Fecha",
                render: (p: InvoicePaymentOut) => new Date(p.fecha_pago).toLocaleDateString("es-VE"),
              },
              {
                key: "metodo_pago_nombre",
                header: "Método",
              },
              {
                key: "monto_usd",
                header: "Monto USD",
                hideOnMobile: true,
                render: (p: InvoicePaymentOut) => (
                  <span className="font-mono">{formatUsd(p.monto_usd)}</span>
                ),
              },
              {
                key: "monto_bs",
                header: "Monto Bs.",
                hideOnMobile: true,
                render: (p: InvoicePaymentOut) => (
                  <span className="font-mono">Bs. {formatBs(p.monto_bs)}</span>
                ),
              },
              {
                key: "referencia",
                header: "Referencia",
                hideOnMobile: true,
                render: (p: InvoicePaymentOut) => p.referencia || "—",
              },
              {
                key: "comprobantes",
                header: "Comprobante",
                exportable: false,
                render: (p: InvoicePaymentOut) =>
                  p.comprobantes.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => window.open(api.getPaymentReceiptUrl(invoice.id, p.id, p.comprobantes[0].id), "_blank")}>
                      <Paperclip className="w-3.5 h-3.5" />
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
      )}

      {invoice.image_path && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Imagen de Factura</p>
            <Button
              variant="outline"
              size="sm"
              loading={downloading}
              onClick={handleDownloadImage}
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
          </div>
          <a
            href={api.getInvoiceImageUrl(invoice.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-slate-200 hover:border-brand-blue transition-colors"
          >
            <img
              src={api.getInvoiceImageUrl(invoice.id)}
              alt={`Factura #${invoice.numero_factura}`}
              className="max-h-80 w-full object-contain bg-slate-50"
            />
          </a>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Productos</h3>
        <Table
          columns={[
            { key: "producto", header: "Producto", render: (d) => d.product?.nombre || "—" },
            {
              key: "tipo_empaque",
              header: "Tipo",
              render: (d) => (
                <div className="flex flex-col items-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    d.tipo_empaque === "CAJA"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {d.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                  </span>
                  {d.tipo_empaque === "CAJA" && d.product?.unidades_por_caja && d.product.unidades_por_caja > 1 && (
                    <span className="text-[10px] text-slate-400 mt-0.5">{d.product.unidades_por_caja} unds/caja</span>
                  )}
                  {d.tipo_iva === "EXENTO" && (
                    <span className="text-[10px] text-orange-600 font-semibold mt-0.5">Exento</span>
                  )}
                </div>
              ),
            },
            { key: "cantidad", header: "Cant" },
            {
              key: "costo_unitario_usd",
              header: "$ / Unid",
              render: (d) => (
                <div className="text-right">
                  <span className="font-mono">{formatUsd(Number(d.costo_unitario_usd))}</span>
                  <div className="text-[10px] text-slate-400">
                    /{d.tipo_empaque === "CAJA" ? "caja" : "und"}
                  </div>
                </div>
              ),
            },
            {
              key: "costo_unidad_usd",
              header: "$ / Und",
              hideOnMobile: true,
              render: (d) => {
                if (d.tipo_empaque === "CAJA" && d.product?.unidades_por_caja && d.product.unidades_por_caja > 1) {
                  const costoUnitario = Number(d.costo_unitario_usd) / d.product.unidades_por_caja;
                  return <span className="font-mono text-xs text-slate-500">{formatUsd(costoUnitario)}</span>;
                }
                return <span className="text-slate-300">—</span>;
              },
            },
            {
              key: "costo_unitario_bs",
              header: "Bs. / Unid",
              hideOnMobile: true,
              render: (d) => (
                <span className="font-mono">Bs. {formatBs(Number(d.costo_unitario_bs))}</span>
              ),
            },
            {
              key: "subtotal_usd",
              header: "Subtotal USD",
              render: (d) => (
                <span className="font-mono">{formatUsd(d.cantidad * Number(d.costo_unitario_usd))}</span>
              ),
            },
            {
              key: "subtotal_bs",
              header: "Subtotal Bs.",
              render: (d) => (
                <span className="font-mono">Bs. {formatBs(d.cantidad * Number(d.costo_unitario_bs))}</span>
              ),
            },
          ]}
          data={invoice.detalles}
          keyExtractor={(d) => d.id}
          loading={false}
          emptyMessage="Sin productos"
          footer={invoice.detalles.length > 0 ? (() => {
            let totalCajas = 0;
            let totalUnidades = 0;
            for (const d of invoice.detalles) {
              if (d.tipo_empaque === "CAJA") {
                totalCajas += d.cantidad;
                totalUnidades += d.cantidad * (d.product?.unidades_por_caja || 1);
              } else {
                totalUnidades += d.cantidad;
              }
            }
            return (
              <tr className="bg-slate-100/70 border-t-2 border-slate-200 font-semibold text-text-main">
                <td className="px-4 py-3.5" colSpan={2}>Totales</td>
                <td className="px-4 py-3.5 text-right tabular-nums text-xs">
                  {totalCajas > 0 && <div>{totalCajas} cajas</div>}
                  <div>{totalUnidades} unds</div>
                </td>
                <td />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="px-4 py-3.5 text-right tabular-nums">
                  {formatUsd(invoice.detalles.reduce((acc, d) => acc + d.cantidad * Number(d.costo_unitario_usd), 0))}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums">
                  Bs. {formatBs(invoice.detalles.reduce((acc, d) => acc + d.cantidad * Number(d.costo_unitario_bs), 0))}
                </td>
              </tr>
            );
          })() : undefined}
        />
      </div>

      {/* Sección de Obsequios */}
      {invoice.obsequios && invoice.obsequios.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-purple-200 bg-purple-50/50 p-5">
          <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide mb-3">
            Obsequios / Cortesías ({invoice.obsequios.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-purple-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50 border-b border-purple-200 text-purple-700">
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2">Producto</th>
                  <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-2">Tipo</th>
                  <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-2">Cant</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2">Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {invoice.obsequios.map((o) => (
                  <tr key={o.id} className="bg-purple-50/30">
                    <td className="px-4 py-2 text-text-main font-medium">{o.product?.nombre || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {o.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{o.cantidad}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{o.justificacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-purple-400 mt-2">
            Los obsequios actualizan el stock sin afectar el total de la factura.
          </p>
        </div>
      )}

      {invoice.detalles.length > 0 && (() => {
        const resumen = calcularResumenFiscal(
          invoice.detalles.map(d => ({
            subtotal_usd: d.cantidad * Number(d.costo_unitario_usd),
            subtotal_bs: d.cantidad * Number(d.costo_unitario_bs),
            tipo_iva: d.tipo_iva ?? "GRAVADO",
          })),
          invoice.moneda_principal,
          invoice.aplica_iva,
        );
        const exento = invoice.moneda_principal === "USD"
          ? Number(invoice.total_usd)
          : resumen.exento;
        const baseImponible = resumen.base_imponible;
        const iva = resumen.iva;
        const totalUsd = invoice.moneda_principal === "USD"
          ? Number(invoice.total_usd)
          : 0;
        const totalBs = invoice.moneda_principal === "BS"
          ? Math.round((baseImponible + iva) * 100) / 100
          : 0;

        return (
          <div className="p-4 rounded-xl bg-surface border border-slate-200 mb-6">
            <h3 className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Resumen Fiscal y Total</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Exento</span>
                <span className="font-mono font-medium">{formatUsd(exento)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Base imponible</span>
                <span className="font-mono font-medium">
                  {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(baseImponible)}` : formatUsd(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IVA (16%)</span>
                <span className="font-mono font-medium">
                  {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(iva)}` : formatUsd(0)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-700 font-bold">Total USD</span>
                  <span className="font-mono font-bold">{formatUsd(totalUsd || exento)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-700 font-bold">Total Bs.</span>
                  <span className="font-mono font-bold">Bs. {formatBs(totalBs)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {invoice.observaciones && (
        <div className="p-4 rounded-xl bg-surface border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Observaciones</p>
          <p className="text-sm mt-1 text-slate-700">{invoice.observaciones}</p>
        </div>
      )}

      <Modal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="Información escaneada por IA"
        className="max-w-lg"
      >
        {(() => {
          const raw = invoice.raw_json_ia as Record<string, unknown> | null | undefined;
          if (!raw) return <p className="text-sm text-slate-500">No hay datos disponibles.</p>;

          const meta = (raw.metadata || {}) as Record<string, unknown>;
          const prov = (meta.proveedor || {}) as Record<string, unknown>;
          const prods = ((raw.productos || {}) as Record<string, unknown>).productos as Array<Record<string, unknown>> | undefined;

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Moneda</p>
                  <p className="font-medium">{String(meta.moneda || "—")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Proveedor</p>
                  <p className="font-medium">{String(prov.nombre || "—")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Fecha Factura</p>
                  <p className="font-medium">{String(meta.fecha_factura || "—")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">N° Factura</p>
                  <p className="font-medium">{String(meta.numero_factura || "—")}</p>
                </div>
              </div>

              {prods && prods.length > 0 && (
                <>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Productos</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="pb-2 font-medium text-slate-500">Producto</th>
                        <th className="pb-2 font-medium text-slate-500 text-right">Cantidad</th>
                        <th className="pb-2 font-medium text-slate-500 text-right">Precio Unit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prods.map((p, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-b-0">
                          <td className="py-2">{String(p.nombre || "—")}</td>
                          <td className="py-2 text-right">{String(p.cantidad || "—")}</td>
                          <td className="py-2 text-right font-mono">{formatBs(Number(p.precio_unitario || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      <PaymentDrawer
        open={paymentDrawerOpen}
        onClose={() => setPaymentDrawerOpen(false)}
        invoice={invoice}
        onSuccess={() => {
          fetchPayments();
          fetchInvoice();
        }}
      />
    </div>
  );
}
