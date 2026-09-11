import { useEffect, useState } from "react";
import { BarChart3, Package, ShoppingBag, Building2, Wallet } from "lucide-react";
import Tabs from "@/ui-components/Tabs";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useReportsResumen } from "../hooks/useReportsResumen";
import { useReportsCategorias } from "../hooks/useReportsCategorias";
import { useReportsProveedores } from "../hooks/useReportsProveedores";
import { useReportsPagos } from "../hooks/useReportsPagos";
import { useProductMatrix } from "../hooks/useProductMatrix";
import ResumenTab from "../components/ResumenTab";
import ProductosTab from "../components/ProductosTab";
import CategoriasTab from "../components/CategoriasTab";
import ProveedoresTab from "../components/ProveedoresTab";
import PagosTab from "../components/PagosTab";

const TABS = [
  { value: "resumen", label: "Resumen", icon: <BarChart3 className="size-4" /> },
  { value: "productos", label: "Productos", icon: <Package className="size-4" /> },
  { value: "categorias", label: "Categorías", icon: <ShoppingBag className="size-4" /> },
  { value: "proveedores", label: "Proveedores", icon: <Building2 className="size-4" /> },
  { value: "pagos", label: "Pagos", icon: <Wallet className="size-4" /> },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [rango, setRango] = useState("semanal");

  const resumen = useReportsResumen(rango);
  const { matrixData, loadingMatrix, fetchMatrixData } = useProductMatrix();
  const categorias = useReportsCategorias();
  const proveedores = useReportsProveedores();
  const pagos = useReportsPagos();

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  useEffect(() => {
    if (activeTab === "categorias" && !categorias.categoryAnalytics && !categorias.loadingCategories) {
      categorias.fetchCategoryAnalytics();
    }
    if (activeTab === "proveedores" && !proveedores.supplierAnalytics && !proveedores.loadingSuppliers) {
      proveedores.fetchSupplierAnalytics();
    }
    if (activeTab === "pagos") {
      pagos.fetchPaymentSummary();
    }
  }, [activeTab]);

  return (
    <div>
      <PageHeader
        title="Panel de Control"
        description="Estadísticas detalladas del sistema"
      />

      <div className="mb-6">
        <Tabs
          className="w-full justify-around"
          tabs={TABS}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {resumen.loading && activeTab === "resumen" ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : activeTab === "resumen" ? (
        <ResumenTab
          salesSummary={resumen.salesSummary}
          topWeek={resumen.topWeek}
          topSelling={resumen.topSelling}
          categoriesTotal={resumen.categoriesTotal}
          categoriesCount={resumen.categoriesCount}
          rango={rango}
          onRangoChange={setRango}
        />
      ) : activeTab === "productos" ? (
        resumen.loading ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <ProductosTab
            topSelling={resumen.topSelling}
            topMargin={resumen.topMargin}
            lowestMargin={resumen.lowestMargin}
            lowRotation={resumen.lowRotation}
            matrixData={matrixData}
            loadingMatrix={loadingMatrix}
          />
        )
      ) : activeTab === "categorias" ? (
        categorias.loadingCategories ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <CategoriasTab
            data={categorias.categoryAnalytics}
            topSelling={categorias.topSellCats}
            lowRotation={categorias.lowRotCats}
          />
        )
      ) : activeTab === "proveedores" ? (
        proveedores.loadingSuppliers ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <ProveedoresTab data={proveedores.supplierAnalytics} />
        )
      ) : activeTab === "pagos" ? (
        <PagosTab
          data={pagos.paymentSummary}
          loading={pagos.loadingPayments}
          desde={pagos.pagoDesde}
          hasta={pagos.pagoHasta}
          onDesdeChange={pagos.setPagoDesde}
          onHastaChange={pagos.setPagoHasta}
          onClear={() => { pagos.setPagoDesde(""); pagos.setPagoHasta(""); }}
        />
      ) : null}
    </div>
  );
}
