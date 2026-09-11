import type { ObsequioFacturaOut } from "@/types/api";

interface InvoiceObsequiosSectionProps {
  obsequios: ObsequioFacturaOut[] | undefined;
}

export default function InvoiceObsequiosSection({ obsequios }: InvoiceObsequiosSectionProps) {
  if (!obsequios || obsequios.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border-2 border-purple-200 bg-purple-50/50 p-5">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-purple-800 uppercase">
        Obsequios / Cortesías ({obsequios.length})
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
            {obsequios.map((o) => {
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
  );
}
