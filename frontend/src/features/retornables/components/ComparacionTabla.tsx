import type { ComparacionLineaOut } from "@/types/api";

interface Props {
  titulo: string;
  subtitulo?: string;
  lineas: ComparacionLineaOut[];
}

function DifBadge({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-emerald-600 font-semibold">0</span>;
  }
  return (
    <span className={`font-semibold ${value > 0 ? "text-amber-600" : "text-red-600"}`}>
      {value > 0 ? "+" : ""}{value}
    </span>
  );
}

export function ComparacionTabla({ titulo, subtitulo, lineas }: Props) {
  if (lineas.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No hay datos para comparar
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h4 className="text-sm font-bold text-slate-700 mb-1">{titulo}</h4>
      {subtitulo && (
        <p className="text-xs text-slate-400 mb-2">{subtitulo}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-2 text-left font-semibold text-slate-600">Present.</th>
              <th className="p-2 text-left font-semibold text-slate-600">Estado</th>
              <th className="p-2 text-right font-semibold text-slate-600" colSpan={2}>Reporte</th>
              <th className="p-2 text-right font-semibold text-slate-600" colSpan={2}>Comparado</th>
              <th className="p-2 text-right font-semibold text-slate-600" colSpan={2}>Dif</th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400">
              <th />
              <th />
              <th className="p-2 text-right">Cajas</th>
              <th className="p-2 text-right">Botellas</th>
              <th className="p-2 text-right">Cajas</th>
              <th className="p-2 text-right">Botellas</th>
              <th className="p-2 text-right">Cajas</th>
              <th className="p-2 text-right">Botellas</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr
                key={i}
                className={`border-b border-slate-100 ${
                  l.dif_botellas !== 0 || l.dif_cajas !== 0 ? "bg-red-50" : ""
                }`}
              >
                <td className="p-2 font-semibold">{l.presentacion}</td>
                <td className="p-2">{l.estado}</td>
                <td className="p-2 text-right font-mono">
                  {l.estado === "CASILLERO" ? l.reporte_cajas : l.reporte_cajas}
                </td>
                <td className="p-2 text-right font-mono">
                  {l.estado === "CASILLERO" ? "—" : l.reporte_botellas.toLocaleString()}
                </td>
                <td className="p-2 text-right font-mono">
                  {l.comparado_cajas}
                </td>
                <td className="p-2 text-right font-mono">
                  {l.estado === "CASILLERO" ? "—" : l.comparado_botellas.toLocaleString()}
                </td>
                <td className="p-2 text-right font-mono">
                  <DifBadge value={l.dif_cajas} />
                </td>
                <td className="p-2 text-right font-mono">
                  {l.estado === "CASILLERO" ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <DifBadge value={l.dif_botellas} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
