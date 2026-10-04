import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { ComparacionTabla } from "./ComparacionTabla";
import { useRetornableComparacion } from "../hooks/useRetornable";

export function ResumenTab() {
  const comparacion = useRetornableComparacion();

  if (comparacion.loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (comparacion.error) {
    return <ErrorBanner>{comparacion.error}</ErrorBanner>;
  }

  if (!comparacion.data) {
    return null;
  }

  return (
    <ComparacionTabla
      vistas={[
        {
          titulo: "Reporte actual vs Sistema esperado (anterior + movimientos)",
          izquierda: {
            titulo: "Reporte actual",
            reporte: comparacion.data.ultimo_reporte,
          },
          derecha: {
            titulo: "Sistema esperado",
            reporte: null,
            sinReporte: true,
          },
          lineas: comparacion.data.lineas_sistema,
        },
        {
          titulo: "Último reporte vs Reporte anterior",
          izquierda: {
            titulo: "Reporte actual",
            reporte: comparacion.data.ultimo_reporte,
          },
          derecha: {
            titulo: "Reporte anterior",
            reporte: comparacion.data.reporte_anterior,
            sinReporte: !comparacion.data.reporte_anterior,
          },
          lineas: comparacion.data.lineas_anterior,
        },
      ]}
    />
  );
}
