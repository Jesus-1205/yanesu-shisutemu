import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Bot } from "lucide-react";
import { api } from "@/services/api";
import type { Invoice } from "../types";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Table from "@/ui-components/Table";
import PageHeader from "@/ui-components/PageHeader";
import Modal from "@/ui-components/Modal";
import { useToast } from "@/ui-components/Toast";
import { formatBs, formatUsd } from "@/lib/text";
import { calcIva } from "@/lib/iva";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
        title={`Factura #${invoice.numero_factura}`}
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
      </div>

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
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  d.tipo_empaque === "CAJA"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {d.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                </span>
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
              key: "costo_unitario_bs",
              header: "Bs. / Unid",
              render: (d) => (
                <div className="text-right">
                  <span className="font-mono">Bs. {formatBs(Number(d.costo_unitario_bs))}</span>
                  <div className="text-[10px] text-slate-400">
                    /{d.tipo_empaque === "CAJA" ? "caja" : "und"}
                  </div>
                </div>
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
        />
      </div>

      {invoice.detalles.length > 0 && (() => {
        const baseImponible = invoice.detalles
          .reduce((sum, d) => {
            return Math.round((sum + d.cantidad * Number(d.costo_unitario_bs)) * 100) / 100;
          }, 0);
        const iva = invoice.moneda_principal === "BS" ? calcIva(baseImponible) : 0;
        const exento = invoice.moneda_principal === "USD"
          ? Number(invoice.total_usd)
          : 0;
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
    </div>
  );
}
