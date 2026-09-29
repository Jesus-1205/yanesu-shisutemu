import type { RetornableProductoOut } from "@/types/api";
import Spinner from "@/ui-components/Spinner";
import { SeccionPresentacion } from "./SeccionPresentacion";

interface Props {
  productos: RetornableProductoOut[];
  loading: boolean;
  onRefresh: () => void;
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
