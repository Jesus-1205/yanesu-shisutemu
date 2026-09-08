import type { ComparacionLineaOut, RetornableReporteOut } from "@/types/api";

interface Side {
  titulo: string;
  reporte: RetornableReporteOut | null;
  sinReporte?: boolean;
}

interface Props {
  vistas: {
    titulo: string;
    izquierda: Side;
    derecha: Side;
    lineas: ComparacionLineaOut[];
  }[];
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DifBadge({ cajas, botellas, esCasillero }: { cajas: number; botellas: number; esCasillero: boolean }) {
  if (cajas === 0) {
    return <span className="text-emerald-600 font-semibold text-sm">0</span>;
  }
  const color = cajas > 0 ? "text-amber-600" : "text-red-600";
  const sign = cajas > 0 ? "+" : "";
  return (
    <span className={`${color} font-semibold text-sm`}>
      {sign}{cajas} c
      {!esCasillero && (
        <span className="text-xs font-normal opacity-70 ml-0.5">
          ({sign}{botellas} b)
        </span>
      )}
    </span>
  );
}

function CardHeader({ side }: { side: Side }) {
  return (
    <div className="px-4 py-3 border-b border-slate-200">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{side.titulo}</p>
      {side.sinReporte ? (
        <p className="text-xs text-slate-400 mt-1">Sin reporte registrado</p>
      ) : side.reporte ? (
        <div className="mt-1">
          <p className="text-sm font-semibold text-slate-700">
            Reporte #{side.reporte.id}
          </p>
          <p className="text-xs text-slate-500">
            {side.reporte.realizado_por} — {formatDate(side.reporte.fecha)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function FilaCard({ linea }: { linea: ComparacionLineaOut }) {
  const esCasillero = linea.estado === "CASILLERO";
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 last:border-0 h-[38px]">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-slate-500 w-7">{linea.presentacion}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          linea.estado === "LLENO" ? "bg-emerald-50 text-emerald-700" :
          linea.estado === "VACIO" ? "bg-amber-50 text-amber-700" :
          "bg-slate-100 text-slate-600"
        }`}>
          {linea.estado}
        </span>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-slate-800">
          {linea.reporte_cajas} cajas
        </span>
        {!esCasillero && (
          <span className="text-xs text-slate-400 ml-1">
            ({linea.reporte_botellas.toLocaleString()} bot)
          </span>
        )}
      </div>
    </div>
  );
}

function FilaComparado({ linea }: { linea: ComparacionLineaOut }) {
  const esCasillero = linea.estado === "CASILLERO";
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 last:border-0 h-[38px]">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-slate-500 w-7">{linea.presentacion}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          linea.estado === "LLENO" ? "bg-emerald-50 text-emerald-700" :
          linea.estado === "VACIO" ? "bg-amber-50 text-amber-700" :
          "bg-slate-100 text-slate-600"
        }`}>
          {linea.estado}
        </span>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-slate-800">
          {linea.comparado_cajas} cajas
        </span>
        {!esCasillero && (
          <span className="text-xs text-slate-400 ml-1">
            ({linea.comparado_botellas.toLocaleString()} bot)
          </span>
        )}
      </div>
    </div>
  );
}

function FilaDif({ linea }: { linea: ComparacionLineaOut }) {
  return (
    <div className="flex items-center justify-center px-2 py-2 border-b border-slate-50 last:border-0 h-[38px]">
      <DifBadge cajas={linea.dif_cajas} botellas={linea.dif_botellas} esCasillero={linea.estado === "CASILLERO"} />
    </div>
  );
}

function VistaComparacion({ vista }: { vista: Props["vistas"][0] }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-700 mb-3">{vista.titulo}</h4>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="grid grid-cols-3 border-b border-slate-200">
          <div className="border-r border-slate-200 border-l-4 border-blue-500">
            <CardHeader side={vista.izquierda} />
          </div>
          <div className="flex items-center justify-center px-2 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Dif</p>
          </div>
          <div className="border-l-4 border-emerald-500">
            <CardHeader side={vista.derecha} />
          </div>
        </div>
        {vista.lineas.map((l, i) => (
          <div key={i} className="grid grid-cols-3">
            <div className="border-r border-slate-200 border-l-4 border-blue-500">
              <FilaCard linea={l} />
            </div>
            <div>
              <FilaDif linea={l} />
            </div>
            <div className="border-l-4 border-emerald-500">
              <FilaComparado linea={l} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComparacionTabla({ vistas }: Props) {
  if (vistas.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No hay datos para comparar
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {vistas.map((vista, vi) => (
        <VistaComparacion key={vi} vista={vista} />
      ))}
    </div>
  );
}
