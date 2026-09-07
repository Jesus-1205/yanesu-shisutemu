import type { RetornablePresentacionOut } from "@/types/api";

interface Props {
  data: RetornablePresentacionOut;
}

const BOTTLES_PER_CASE = 36;

function EstadoCard({
  label,
  color,
  estado,
}: {
  label: string;
  color: string;
  estado: { total_botellas: number; cajas_enteras: number; botellas_sueltas: number };
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">
        {label === "CASILLERO" ? (
          <>{estado.cajas_enteras} <span className="text-sm font-normal text-slate-500">cajas</span></>
        ) : (
          <>
            {estado.cajas_enteras}{" "}
            <span className="text-sm font-normal text-slate-500">cajas</span>
            {estado.botellas_sueltas > 0 && (
              <span className="text-sm font-normal text-slate-400 ml-1">
                + {estado.botellas_sueltas} sueltas
              </span>
            )}
          </>
        )}
      </div>
      {label !== "CASILLERO" && (
        <div className="text-xs text-slate-400 mt-1">
          {estado.total_botellas.toLocaleString()} botellas
          {estado.total_botellas < 0 && (
            <span className="text-red-600 font-semibold ml-1">
              ⚠ Valor negativo
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ResumenPresentacion({ data }: Props) {
  const totalVacioLlenoBotellas = data.vacio.total_botellas + data.lleno.total_botellas;
  const totalVacioLlenoCajas = Math.floor(totalVacioLlenoBotellas / BOTTLES_PER_CASE);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-lg font-bold text-slate-800 mb-4">
        Presentación {data.presentacion}
        <span className="text-sm font-normal text-slate-500 ml-2">
          ({data.presentacion}ml)
        </span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <EstadoCard label="CASILLERO" color="bg-slate-400" estado={data.casillero} />
        <EstadoCard label="VACÍO" color="bg-amber-400" estado={data.vacio} />
        <EstadoCard label="LLENO" color="bg-emerald-500" estado={data.lleno} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            Total (Vacío + Lleno)
          </span>
          <span className="text-lg font-bold text-slate-900">
            {totalVacioLlenoCajas} cajas
            <span className="text-sm font-normal text-slate-500 ml-2">
              ({totalVacioLlenoBotellas.toLocaleString()} botellas)
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-600">
            Lleno esperado (sistema)
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {Math.floor(data.lleno_esperado_botellas / BOTTLES_PER_CASE)} cajas
            <span className="text-xs font-normal text-slate-500 ml-1">
              ({data.lleno_esperado_botellas.toLocaleString()} botellas)
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Discrepancia lleno</span>
          <span
            className={`text-sm font-semibold ${
              data.discrepancia_botellas === 0
                ? "text-emerald-600"
                : data.discrepancia_botellas > 0
                  ? "text-red-600"
                  : "text-amber-600"
            }`}
          >
            {data.discrepancia_botellas === 0
              ? "✅ Sin diferencias"
              : data.discrepancia_botellas > 0
                ? `🚨 Faltan ${data.discrepancia_botellas} botellas`
                : `⚠️ Sobran ${Math.abs(data.discrepancia_botellas)} botellas`}
          </span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-600">
            Vacío esperado (sistema)
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {Math.floor((data.vacio_esperado_botellas ?? 0) / BOTTLES_PER_CASE)} cajas
            <span className="text-xs font-normal text-slate-500 ml-1">
              ({(data.vacio_esperado_botellas ?? 0).toLocaleString()} botellas)
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Discrepancia vacío</span>
          <span
            className={`text-sm font-semibold ${
              (data.discrepancia_vacio_botellas ?? 0) === 0
                ? "text-emerald-600"
                : (data.discrepancia_vacio_botellas ?? 0) > 0
                  ? "text-red-600"
                  : "text-amber-600"
            }`}
          >
            {(data.discrepancia_vacio_botellas ?? 0) === 0
              ? "✅ Sin diferencias"
              : (data.discrepancia_vacio_botellas ?? 0) > 0
                ? `🚨 Faltan ${data.discrepancia_vacio_botellas} botellas`
                : `⚠️ Sobran ${Math.abs(data.discrepancia_vacio_botellas ?? 0)} botellas`}
          </span>
        </div>
      </div>

      {data.productos_asociados.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm font-medium text-slate-600 block mb-2">
            Productos asociados
          </span>
          <div className="flex flex-wrap gap-2">
            {data.productos_asociados.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {p.producto_nombre}
                <span className="text-blue-400">
                  ({p.stock_cajas} cajas)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
