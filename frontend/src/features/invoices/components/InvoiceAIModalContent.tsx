import { formatBs } from "@/lib/text";
import type { Invoice } from "../types";

interface InvoiceAIModalContentProps {
  invoice: Invoice;
}

export default function InvoiceAIModalContent({ invoice }: InvoiceAIModalContentProps) {
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
}
