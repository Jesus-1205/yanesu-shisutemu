import { useState } from "react";
import type { RetornableReporteOut } from "@/types/api";
import { useRetornableDetalleReporte } from "../hooks/useRetornable";
import Modal from "@/ui-components/Modal";
import Spinner from "@/ui-components/Spinner";

interface Props {
  reportes: RetornableReporteOut[];
  loading: boolean;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportesTable({ reportes, loading }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detalle, loading: loadingDetalle } = useRetornableDetalleReporte(selectedId);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (reportes.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        No hay reportes registrados
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="p-3 font-semibold text-slate-600">Fecha</th>
              <th className="p-3 font-semibold text-slate-600">Realizado por</th>
              <th className="p-3 font-semibold text-slate-600">Observaciones</th>
              <th className="p-3 font-semibold text-slate-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {reportes.map((r) => (
              <tr
                key={r.id}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedId(r.id)}
              >
                <td className="p-3 font-mono text-sm">{formatDate(r.fecha)}</td>
                <td className="p-3">{r.realizado_por}</td>
                <td className="p-3 text-slate-500 max-w-[200px] truncate">
                  {r.observaciones || "—"}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      r.es_actual
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.es_actual ? "Actual" : "Anterior"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={detalle ? `Reporte #${detalle.reporte.id} — ${formatDate(detalle.reporte.fecha)}` : "Detalle del reporte"}
        className="max-w-2xl"
      >
        {loadingDetalle ? (
          <div className="py-10 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : detalle ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              <strong>Realizado por:</strong> {detalle.reporte.realizado_por}
              {detalle.reporte.observaciones && (
                <>
                  <br />
                  <strong>Observaciones:</strong> {detalle.reporte.observaciones}
                </>
              )}
            </div>

            {detalle.reporte_anterior_id && (
              <div className="text-xs text-slate-400">
                Comparado con reporte #{detalle.reporte_anterior_id} del{" "}
                {detalle.reporte_anterior_fecha
                  ? formatDate(detalle.reporte_anterior_fecha)
                  : "—"}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-2 text-left font-semibold text-slate-600">Present.</th>
                    <th className="p-2 text-left font-semibold text-slate-600">Estado</th>
                    <th className="p-2 text-right font-semibold text-slate-600">Cajas</th>
                    <th className="p-2 text-right font-semibold text-slate-600">Botellas</th>
                    <th className="p-2 text-right font-semibold text-slate-600">Botellas dif</th>
                    <th className="p-2 text-right font-semibold text-slate-600">Cajas dif</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.detalles.map((d, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 ${
                        d.dif_botellas !== 0 ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="p-2 font-semibold">{d.presentacion}</td>
                      <td className="p-2">{d.estado}</td>
                      <td className="p-2 text-right font-mono">{d.cantidad_cajas}</td>
                      <td className="p-2 text-right font-mono">
                        {d.estado === "CASILLERO" ? "—" : d.cantidad_botellas.toLocaleString()}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-semibold ${
                          d.dif_botellas === 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {d.dif_botellas === 0
                          ? "0"
                          : `${d.dif_botellas > 0 ? "+" : ""}${d.dif_botellas}`}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-semibold ${
                          d.dif_cajas === 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {d.dif_cajas === 0
                          ? "0"
                          : `${d.dif_cajas > 0 ? "+" : ""}${d.dif_cajas}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
