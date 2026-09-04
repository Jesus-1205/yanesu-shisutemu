import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { formatDateVE, todayInCaracas } from "@/lib/utils";
import { calcularResumenFiscal } from "@/lib/iva";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [payments, setPayments] = useState<InvoicePaymentOut[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<InvoicePaymentSummary | null>(null);

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
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
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

  const resumen = invoice.detalles.length > 0
    ? calcularResumenFiscal(
        invoice.detalles.map(d => ({
          subtotal_usd: d.cantidad * Number(d.costo_unitario_usd),
          subtotal_bs: d.cantidad * Number(d.costo_unitario_bs),
          tipo_iva: d.tipo_iva ?? "GRAVADO",
        })),
        invoice.moneda_principal,
        invoice.aplica_iva,
      )
    : null;

  const totalPrincipal = resumen?.total ?? 0;
  const nTasa = Number(invoice.tasa_bs);
  const totalSecundario = nTasa > 0
    ? (invoice.moneda_principal === "BS"
      ? Math.round((totalPrincipal / nTasa) * 100) / 100
      : Math.round((totalPrincipal * nTasa) * 100) / 100)
    : 0;

  return (
    <div>
      <PageHeader
        title={`${invoice.tipo_documento === "NOTA_ENTREGA" ? "Nota" : "Factura"} #${invoice.numero_factura}`}
        description={invoice.supplier?.nombre || "Proveedor desconocido"}
        actions={
          <div className="flex items-center gap-2">
            {invoice.procesada_por_ia && (
              <Button variant="outline" onClick={() => setAiModalOpen(true)}>
                <Bot className="size-4" />
                Resultado IA
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              Volver
            </Button>
          </div>
        }
      />

      {/* ─── Metadata compacta ───────────────────────────────────────── */}
      <div className="mb-6 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span className="font-medium text-slate-800">
            {invoice.tipo_documento === "FACTURA" ? "Factura" : "Nota de Entrega"}
          </span>
          <span className="text-slate-300">•</span>
          <span>{formatDateVE(invoice.fecha_factura)}</span>
          <span className="text-slate-300">•</span>
          <span>{invoice.supplier?.nombre || "—"}</span>
          {invoice.aplica_iva && (
            <>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">IVA 16%</span>
            </>
          )}
        </div>
        {invoice.fecha_limite_pago && (() => {
          const hoy = todayInCaracas();
          const limite = new Date(invoice.fecha_limite_pago + "T00:00:00");
          const diffMs = limite.getTime() - hoy.getTime();
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const esPagada = invoice.estado_pago === "PAGADA";
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Límite de pago:</span>
              <span className="font-medium">{limite.toLocaleDateString("es-VE")}</span>
              {!esPagada && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  diffDias < 0
                    ? "bg-red-100 text-red-700"
                    : diffDias <= 3
                      ? "bg-orange-100 text-orange-700"
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
        })()}
      </div>

      {/* ─── Cards financieras ─────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {invoice.moneda_principal === "BS" ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-surface p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Total Bs.
                <span className="ml-2 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">PRINCIPAL</span>
              </p>
              <p className="mt-1 font-mono text-lg font-bold">
                Bs. {formatBs(totalPrincipal)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-surface p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Total USD
                <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">AUTO-CALC</span>
              </p>
              <p className="mt-1 font-mono text-lg font-bold">
                {formatUsd(totalSecundario)}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-surface p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Total USD
                <span className="ml-2 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">PRINCIPAL</span>
              </p>
              <p className="mt-1 font-mono text-lg font-bold">
                {formatUsd(totalPrincipal)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-surface p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Total Bs.
                <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">AUTO-CALC</span>
              </p>
              <p className="mt-1 font-mono text-lg font-bold">
                Bs. {formatBs(totalSecundario)}
              </p>
            </div>
          </>
        )}
        {nTasa > 0 && (
          <div className="rounded-xl border border-slate-200 bg-surface p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Tasa BCV</p>
            <p className="mt-1 font-mono text-lg font-bold">
              {formatBs(nTasa)}
            </p>
          </div>
        )}
      </div>

      {/* Panel de Estado de Pago */}
      {paymentSummary && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Estado de Pago</h3>
            {invoice.estado_pago !== "PAGADA" && (
              <Button variant="accent" size="sm" onClick={() => navigate(`/invoices/${id}/pay`)}>
                <DollarSign className="size-4" />
                Registrar Pago
              </Button>
            )}
          </div>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{Math.round(paymentSummary.porcentaje_pagado)}% pagado</span>
              <span>{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.saldo_pendiente_bs)}` : formatUsd(paymentSummary.saldo_pendiente_usd)} pendiente</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  invoice.estado_pago === "PAGADA" ? "bg-green-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(paymentSummary.porcentaje_pagado, 100)}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-slate-500">Total</p>
              <p className="mt-0.5 font-mono font-bold">{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.total_factura_bs)}` : formatUsd(paymentSummary.total_factura_usd)}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-3">
              <p className="text-green-600">Pagado</p>
              <p className="mt-0.5 font-mono font-bold text-green-700">{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.total_pagado_bs)}` : formatUsd(paymentSummary.total_pagado_usd)}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="text-red-600">Saldo</p>
              <p className="mt-0.5 font-mono font-bold text-red-700">{invoice.moneda_principal === "BS" ? `Bs. ${formatBs(paymentSummary.saldo_pendiente_bs)}` : formatUsd(paymentSummary.saldo_pendiente_usd)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
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
          {(Math.abs(paymentSummary.diferencia_cambiaria_bs) >= 1 || paymentSummary.total_mora_bs > 0) && (
            <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              {Math.abs(paymentSummary.diferencia_cambiaria_bs) >= 1 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-medium text-amber-600">Diferencia cambiaria</p>
                  <p className="mt-0.5 font-mono font-bold text-amber-700">Bs. {formatBs(paymentSummary.diferencia_cambiaria_bs)}</p>
                  <p className="mt-1 text-[10px] text-amber-500">Por cambio de tasa BCV</p>
                </div>
              )}
              {paymentSummary.total_mora_bs > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="font-medium text-orange-600">Mora</p>
                  <p className="mt-0.5 font-mono font-bold text-orange-700">Bs. {formatBs(paymentSummary.total_mora_bs)}</p>
                  {nTasa > 0 && (
                    <p className="mt-0.5 font-mono text-xs text-orange-500">{formatUsd(paymentSummary.total_mora_bs / nTasa)}</p>
                  )}
                  <p className="mt-1 text-[10px] text-orange-400">Recargo por pago tardío</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Historial de Pagos */}
      {payments.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-slate-700">Historial de Pagos</h3>
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
                key: "tasa_bs",
                header: "Tasa",
                hideOnMobile: true,
                render: (p: InvoicePaymentOut) => (
                  p.tasa_bs ? <span className="font-mono text-xs">{formatBs(p.tasa_bs)}</span> : <span className="text-slate-400">—</span>
                ),
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
                render: (p: InvoicePaymentOut) => (
                  <ObsCell text={p.observaciones} />
                ),
              },
              {
                key: "comprobantes",
                header: "Comprobante",
                exportable: false,
                render: (p: InvoicePaymentOut) =>
                  p.comprobantes.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => window.open(api.getPaymentReceiptUrl(invoice.id, p.id, p.comprobantes[0].id), "_blank")}>
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
      )}

      {invoice.image_path && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Imagen de Factura</p>
            <Button
              variant="outline"
              size="sm"
              loading={downloading}
              onClick={handleDownloadImage}
            >
              <Download className="size-4" />
              Descargar
            </Button>
          </div>
          <div
            className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 transition-colors hover:border-brand-blue"
            onClick={() => setImagePreviewOpen(true)}
          >
            <img
              src={api.getInvoiceImageUrl(invoice.id)}
              alt={`Factura #${invoice.numero_factura}`}
              className="max-h-80 w-full bg-slate-50 object-contain"
            />
          </div>
        </div>
      )}

      <Modal open={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)} title="Imagen de Factura" className="max-w-3xl">
        <img
          src={api.getInvoiceImageUrl(invoice.id)}
          alt={`Factura #${invoice.numero_factura}`}
          className="w-full rounded-lg object-contain"
        />
      </Modal>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-slate-700">Productos</h3>
        <Table
          columns={[
            { key: "producto", header: "Producto", render: (d) => d.product?.nombre || "—" },
            {
              key: "tipo_empaque",
              header: "Tipo",
              render: (d) => (
                <div className="flex flex-col items-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    d.tipo_empaque === "CAJA"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {d.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                  </span>
                  {d.tipo_empaque === "CAJA" && d.product?.unidades_por_caja && d.product.unidades_por_caja > 1 && (
                    <span className="mt-0.5 text-[10px] text-slate-400">{d.product.unidades_por_caja} unds/caja</span>
                  )}
                  {d.tipo_iva === "EXENTO" && (
                    <span className="mt-0.5 text-[10px] font-semibold text-orange-600">Exento</span>
                  )}
                </div>
              ),
            },
            { key: "cantidad", header: "Cant" },
            {
              key: "costo_caja_usd",
              header: "$ / Caja",
              render: (d) => {
                if (d.tipo_empaque !== "CAJA") return <span className="text-slate-300">—</span>;
                return (
                  <div className="text-right">
                    <span className="font-mono text-sm font-semibold">{formatUsd(Number(d.costo_unitario_usd))}</span>
                  </div>
                );
              },
            },
            {
              key: "costo_unidad_usd",
              header: "$ / Und",
              hideOnMobile: true,
              render: (d) => {
                if (d.tipo_empaque === "CAJA" && d.product?.unidades_por_caja && d.product.unidades_por_caja > 1) {
                  const costoUnitario = Number(d.costo_unitario_usd) / d.product.unidades_por_caja;
                  return <span className="font-mono text-xs text-slate-400">{invoice.moneda_principal === "BS" && "≈ "}{formatUsd(costoUnitario)}</span>;
                }
                if (d.tipo_empaque === "UNIDAD") {
                  return <span className={`font-mono ${invoice.moneda_principal === "BS" ? "text-xs text-slate-400" : "text-sm font-semibold"}`}>{invoice.moneda_principal === "BS" && "≈ "}{formatUsd(Number(d.costo_unitario_usd))}</span>;
                }
                return <span className="text-slate-300">—</span>;
              },
            },
            {
              key: "costo_unitario_bs",
              header: "Bs. / Unid",
              hideOnMobile: true,
              render: (d) => (
                <span className={`font-mono ${invoice.moneda_principal === "BS" ? "text-sm font-semibold" : "text-xs"}`}>{invoice.moneda_principal !== "BS" && "≈ "}Bs. {formatBs(Number(d.costo_unitario_bs))}</span>
              ),
            },
            {
              key: "subtotal_usd",
              header: "Subtotal USD",
              render: (d) => (
                <span className={`font-mono ${invoice.moneda_principal !== "BS" ? "font-semibold" : ""}`}>{formatUsd(d.cantidad * Number(d.costo_unitario_usd))}</span>
              ),
            },
            {
              key: "subtotal_bs",
              header: "Subtotal Bs.",
              render: (d) => {
                const subUsd = d.cantidad * Number(d.costo_unitario_usd);
                const subBs = invoice.moneda_principal !== "BS" && nTasa > 0
                  ? Math.round(subUsd * nTasa * 100) / 100
                  : d.cantidad * Number(d.costo_unitario_bs);
                return (
                  <span className={`font-mono ${invoice.moneda_principal === "BS" ? "font-semibold" : ""}`}>Bs. {formatBs(subBs)}</span>
                );
              },
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
              <tr className="border-t-2 border-slate-200 bg-slate-100/70 font-semibold text-text-main">
                <td className="px-4 py-3.5" colSpan={2}>Totales</td>
                <td className="px-4 py-3.5 text-right text-xs tabular-nums">
                  {totalCajas > 0 && <div>{totalCajas} cajas</div>}
                  <div>{totalUnidades} unds</div>
                </td>
                <td />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="px-4 py-3.5 text-right tabular-nums">
                  <span className={invoice.moneda_principal !== "BS" ? "font-semibold" : ""}>
                    {formatUsd(invoice.moneda_principal === "BS" ? totalSecundario : totalPrincipal)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums">
                  <span className={invoice.moneda_principal === "BS" ? "font-semibold" : ""}>
                    Bs. {formatBs(invoice.moneda_principal === "BS" ? totalPrincipal : totalSecundario)}
                  </span>
                </td>
              </tr>
            );
          })() : undefined}
        />
      </div>

      {/* Sección de Obsequios */}
      {invoice.obsequios && invoice.obsequios.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-purple-200 bg-purple-50/50 p-5">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-purple-800 uppercase">
            Obsequios / Cortesías ({invoice.obsequios.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-purple-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-200 bg-purple-50 text-purple-700">
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase">Producto</th>
                  <th className="px-4 py-2 text-center text-xs font-medium tracking-wider uppercase">Tipo</th>
                  <th className="px-4 py-2 text-right text-xs font-medium tracking-wider uppercase">Cant</th>
                  <th className="px-4 py-2 text-right text-xs font-medium tracking-wider uppercase">Unds/Caja</th>
                  <th className="px-4 py-2 text-right text-xs font-medium tracking-wider uppercase">Total Unds</th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase">Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {invoice.obsequios.map((o) => {
                  const undsCaja = o.product?.unidades_por_caja ?? 1;
                  const totalUnds = o.tipo_empaque === "CAJA" ? o.cantidad * undsCaja : o.cantidad;
                  return (
                    <tr key={o.id} className="bg-purple-50/30">
                      <td className="px-4 py-2 font-medium text-text-main">{o.product?.nombre || "—"}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {o.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{o.cantidad}</td>
                      <td className="px-4 py-2 text-right text-slate-500 tabular-nums">
                        {o.tipo_empaque === "CAJA" ? undsCaja : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">{totalUnds}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{o.justificacion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-purple-400">
            Los obsequios actualizan el stock sin afectar el total de la factura.
          </p>
        </div>
      )}

      {resumen && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-surface p-4">
            <h3 className="mb-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Resumen Fiscal y Total</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Exento</span>
                <span className="font-mono font-medium">
                  {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(resumen.exento)}` : formatUsd(resumen.exento)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Base imponible</span>
                <span className="font-mono font-medium">
                  {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(resumen.base_imponible)}` : formatUsd(resumen.base_imponible)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IVA (16%)</span>
                <span className="font-mono font-medium">
                  {invoice.moneda_principal === "BS" ? `Bs. ${formatBs(resumen.iva)}` : formatUsd(resumen.iva)}
                </span>
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">Total USD</span>
                  <span className="font-mono font-bold">
                    {invoice.moneda_principal === "BS"
                      ? formatUsd(totalSecundario)
                      : formatUsd(totalPrincipal)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="font-bold text-slate-700">Total Bs.</span>
                  <span className="font-mono font-bold">
                    {invoice.moneda_principal === "BS"
                      ? `Bs. ${formatBs(totalPrincipal)}`
                      : `Bs. ${formatBs(totalSecundario)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
      )}

      {invoice.observaciones && (
        <div className="rounded-xl border border-slate-200 bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Observaciones</p>
          <p className="mt-1 text-sm text-slate-700">{invoice.observaciones}</p>
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
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Productos</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="pb-2 font-medium text-slate-500">Producto</th>
                        <th className="pb-2 text-right font-medium text-slate-500">Cantidad</th>
                        <th className="pb-2 text-right font-medium text-slate-500">Precio Unit.</th>
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
    </div>
  );
}

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