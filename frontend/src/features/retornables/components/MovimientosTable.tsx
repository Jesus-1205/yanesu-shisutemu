import { Link } from "react-router-dom";
import type { RetornableMovimientoOut } from "@/types/api";
import Spinner from "@/ui-components/Spinner";

interface Props {
  movimientos: RetornableMovimientoOut[];
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

function formatDelta(delta: number) {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function MovimientosTable({ movimientos, loading }: Props) {
  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (movimientos.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        No hay movimientos registrados
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="p-3 font-semibold text-slate-600">Fecha</th>
            <th className="p-3 font-semibold text-slate-600">Present.</th>
            <th className="p-3 font-semibold text-slate-600">Estado</th>
            <th className="p-3 font-semibold text-slate-600 text-right">Delta</th>
            <th className="p-3 font-semibold text-slate-600">Tipo</th>
            <th className="p-3 font-semibold text-slate-600">Detalle</th>
            <th className="p-3 font-semibold text-slate-600">Usuario</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="p-3 font-mono text-xs">{formatDate(m.fecha)}</td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {m.presentacion}
                </span>
              </td>
              <td className="p-3 text-sm">{m.estado}</td>
              <td
                className={`p-3 text-right font-mono font-semibold ${
                  m.delta_botellas > 0
                    ? "text-emerald-600"
                    : m.delta_botellas < 0
                      ? "text-red-600"
                      : "text-slate-400"
                }`}
              >
                {formatDelta(m.delta_botellas)}
              </td>
              <td className="p-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    m.tipo_movimiento === "VENTA"
                      ? "bg-red-100 text-red-700"
                      : m.tipo_movimiento === "COMPRA"
                        ? "bg-emerald-100 text-emerald-700"
                        : m.tipo_movimiento === "REPORTE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {m.tipo_movimiento}
                </span>
              </td>
              <td className="p-3 text-slate-500 text-xs">
                {m.referencia_tipo && m.referencia_id ? (
                  <Link
                    to={m.referencia_tipo === "VENTA" ? `/sales/${m.referencia_id}` : `/invoices/${m.referencia_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {m.referencia_tipo} #{m.referencia_id}
                  </Link>
                ) : (
                  m.observaciones || "—"
                )}
              </td>
              <td className="p-3 text-slate-500 text-xs">{m.usuario_nombre}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
