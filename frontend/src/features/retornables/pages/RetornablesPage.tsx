import { useState } from "react";
import PageHeader from "@/ui-components/PageHeader";
import Button from "@/ui-components/Button";
import Tabs from "@/ui-components/Tabs";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Spinner from "@/ui-components/Spinner";
import Select from "@/ui-components/Select";
import Input from "@/ui-components/Input";
import { useRetornableReportes, useRetornableHistorico, useRetornableProductos, useRetornableComparacion } from "../hooks/useRetornable";
import { ReportesTable } from "../components/ReportesTable";
import { MovimientosTable } from "../components/MovimientosTable";
import { ComparacionTabla } from "../components/ComparacionTabla";
import { ProductosAsociadosTab } from "../components/ProductosAsociadosTab";
import { NuevoReporteModal } from "../components/NuevoReporteModal";
import type { TabResumen } from "../types";

export default function RetornablesPage() {
  const [activeTab, setActiveTab] = useState<TabResumen>("resumen");
  const [showNuevoReporte, setShowNuevoReporte] = useState(false);
  const [reportePage, setReportePage] = useState(1);
  const [historicoPage, setHistoricoPage] = useState(1);
  const [histFilters, setHistFilters] = useState<{
    presentacion?: string;
    tipo_movimiento?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }>({});

  const reportes = useRetornableReportes(reportePage);
  const historico = useRetornableHistorico(historicoPage, 20, histFilters);
  const productos = useRetornableProductos();
  const comparacion = useRetornableComparacion();

  const tabs = [
    { value: "resumen", label: "Resumen" },
    { value: "reportes", label: "Reportes" },
    { value: "historico", label: "Histórico" },
    { value: "productos", label: "Productos" },
  ];

  return (
    <div>
      <PageHeader
        title="Inventario Retornable"
        description="Control de casilleros, cajas vacías y llenas"
        actions={
          <Button variant="accent" onClick={() => setShowNuevoReporte(true)}>
            Nuevo Reporte
          </Button>
        }
      />

      <Tabs tabs={tabs} value={activeTab} onChange={(key: string) => setActiveTab(key as TabResumen)} />

      <div className="mt-4">
        {activeTab === "resumen" && (
          <div>
            {comparacion.loading ? (
              <div className="py-20 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : comparacion.error ? (
              <ErrorBanner>{comparacion.error}</ErrorBanner>
            ) : comparacion.data ? (
              <ComparacionTabla
                vistas={[
                  {
                    titulo: "Último reporte vs Sistema (movimientos desde último reporte)",
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
            ) : null}
          </div>
        )}

        {activeTab === "reportes" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button variant="accent" onClick={() => setShowNuevoReporte(true)}>
                Nuevo Reporte
              </Button>
            </div>
            <ReportesTable
              reportes={reportes.data?.items ?? []}
              loading={reportes.loading}
            />
            {reportes.data && reportes.data.pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={reportePage <= 1}
                  onClick={() => setReportePage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-500 py-1">
                  Página {reportes.data.page} de {reportes.data.pages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={reportePage >= reportes.data.pages}
                  onClick={() => setReportePage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "historico" && (
          <div>
            <div className="grid grid-cols-[auto_auto_1fr_1fr_auto] gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 items-end">
              <Select
                label="Presentación"
                value={histFilters.presentacion ?? ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setHistFilters((f) => ({
                    ...f,
                    presentacion: e.target.value || undefined,
                  }))
                }
                options={[
                  { label: "Todas", value: "" },
                  { label: "222", value: "222" },
                  { label: "333", value: "333" },
                ]}
              />
              <Select
                label="Tipo"
                value={histFilters.tipo_movimiento ?? ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setHistFilters((f) => ({
                    ...f,
                    tipo_movimiento: e.target.value || undefined,
                  }))
                }
                options={[
                  { label: "Todos", value: "" },
                  { label: "VENTA", value: "VENTA" },
                  { label: "COMPRA", value: "COMPRA" },
                ]}
              />
              <Input
                label="Fecha desde"
                type="date"
                value={histFilters.fecha_desde ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setHistFilters((f) => ({
                    ...f,
                    fecha_desde: e.target.value || undefined,
                  }))
                }
              />
              <Input
                label="Fecha hasta"
                type="date"
                value={histFilters.fecha_hasta ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setHistFilters((f) => ({
                    ...f,
                    fecha_hasta: e.target.value || undefined,
                  }))
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHistFilters({});
                  setHistoricoPage(1);
                }}
              >
                Limpiar
              </Button>
            </div>

            <MovimientosTable
              movimientos={historico.data?.items ?? []}
              loading={historico.loading}
            />

            {historico.data && historico.data.pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={historicoPage <= 1}
                  onClick={() => setHistoricoPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-500 py-1">
                  Página {historico.data.page} de {historico.data.pages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={historicoPage >= historico.data.pages}
                  onClick={() => setHistoricoPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "productos" && (
          <ProductosAsociadosTab
            productos={productos.data ?? []}
            loading={productos.loading}
            onRefresh={productos.refetch}
          />
        )}

      </div>

      <NuevoReporteModal
        open={showNuevoReporte}
        onClose={() => setShowNuevoReporte(false)}
        onSaved={() => {
          reportes.refetch();
          historico.refetch();
          comparacion.refetch();
        }}
      />
    </div>
  );
}
