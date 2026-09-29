import { useState } from "react";
import PageHeader from "@/ui-components/PageHeader";
import Button from "@/ui-components/Button";
import Tabs from "@/ui-components/Tabs";
import { NuevoReporteModal } from "../components/NuevoReporteModal";
import { ResumenTab } from "../components/ResumenTab";
import { ReportesTab } from "../components/ReportesTab";
import { HistoricoTab } from "../components/HistoricoTab";
import { ProductosTab } from "../components/ProductosTab";
import type { TabResumen } from "../types";

export default function RetornablesPage() {
  const [activeTab, setActiveTab] = useState<TabResumen>("resumen");
  const [showNuevoReporte, setShowNuevoReporte] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { value: "resumen", label: "Resumen" },
    { value: "reportes", label: "Reportes" },
    { value: "historico", label: "Histórico" },
    { value: "productos", label: "Productos" },
  ];

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
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
        {activeTab === "resumen" && <ResumenTab key={`resumen-${refreshKey}`} />}
        {activeTab === "reportes" && (
          <ReportesTab
            key={`reportes-${refreshKey}`}
            onNuevoReporte={() => setShowNuevoReporte(true)}
          />
        )}
        {activeTab === "historico" && <HistoricoTab key={`historico-${refreshKey}`} />}
        {activeTab === "productos" && <ProductosTab key={`productos-${refreshKey}`} />}
      </div>

      <NuevoReporteModal
        open={showNuevoReporte}
        onClose={() => setShowNuevoReporte(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
