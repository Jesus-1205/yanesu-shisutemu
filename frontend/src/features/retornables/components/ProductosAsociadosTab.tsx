import { useState } from "react";
import type { RetornableProductoOut } from "@/types/api";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";

const BOTELLAS_POR_CAJA: Record<string, number> = { "222": 36, "333": 24 };

interface Props {
  productos: RetornableProductoOut[];
  loading: boolean;
  onRefresh: () => void;
}

function SeccionPresentacion({
  presentacion,
  productos,
  onRefresh,
}: {
  presentacion: string;
  productos: RetornableProductoOut[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [productoId, setProductoId] = useState<number | null>(null);
  const [loadingAsociar, setLoadingAsociar] = useState(false);
  const [loadingEliminar, setLoadingEliminar] = useState(false);
  const [eliminarId, setEliminarId] = useState<number | null>(null);

  const botellasPorCaja = BOTELLAS_POR_CAJA[presentacion] ?? 36;

  const searchProducts = async (query: string) => {
    const result = await api.getProducts({ search: query || undefined, page_size: 10 });
    return result.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  };

  const handleAssociate = async () => {
    if (!productoId) {
      toast("Selecciona un producto", "error");
      return;
    }
    setLoadingAsociar(true);
    try {
      await api.asociarRetornableProducto({
        producto_id: productoId,
        presentacion: presentacion as "222" | "333",
      });
      toast("Producto asociado exitosamente", "success");
      setProductoId(null);
      onRefresh();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Error al asociar", "error");
    } finally {
      setLoadingAsociar(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (eliminarId === null) return;
    setLoadingEliminar(true);
    try {
      await api.desasociarRetornableProducto(eliminarId);
      toast("Producto desasociado", "success");
      setEliminarId(null);
      onRefresh();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Error al desasociar", "error");
    } finally {
      setLoadingEliminar(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-base font-bold text-slate-800">
          Presentación {presentacion}ml
          <span className="text-sm font-normal text-slate-500 ml-2">
            ({botellasPorCaja} botellas/caja)
          </span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="p-3 font-semibold text-slate-600">Producto</th>
              <th className="p-3 font-semibold text-slate-600 text-right">Stock (cajas)</th>
              <th className="p-3 font-semibold text-slate-600 text-right">Stock (botellas)</th>
              <th className="p-3 font-semibold text-slate-600 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3 font-medium text-slate-800">{p.producto_nombre}</td>
                <td className="p-3 text-right font-mono text-slate-700">{p.stock_cajas.toLocaleString()}</td>
                <td className="p-3 text-right font-mono text-slate-700">
                  {(p.stock_cajas * botellasPorCaja + p.stock_unidades).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => setEliminarId(p.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Desasociar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400">
                  No hay productos asociados a esta presentación
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <AsyncCombobox
              value={productoId}
              onSearch={searchProducts}
              onChange={(v) => setProductoId(v as number | null)}
              placeholder="Buscar producto por nombre..."
              allowClear
              clearLabel="Ninguno"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAssociate}
            loading={loadingAsociar}
            disabled={!productoId}
          >
            Asociar
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={eliminarId !== null}
        onClose={() => setEliminarId(null)}
        onConfirm={handleConfirmDelete}
        title="Desasociar producto"
        message="¿Estás seguro de que deseas desasociar este producto del retornable?"
        confirmText="Desasociar"
        loading={loadingEliminar}
      />
    </div>
  );
}

export function ProductosAsociadosTab({ productos, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const porPresentacion = {
    "222": productos.filter((p) => p.presentacion === "222"),
    "333": productos.filter((p) => p.presentacion === "333"),
  };

  return (
    <div className="space-y-6">
      {(["222", "333"] as const).map((pres) => (
        <SeccionPresentacion
          key={pres}
          presentacion={pres}
          productos={porPresentacion[pres]}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
