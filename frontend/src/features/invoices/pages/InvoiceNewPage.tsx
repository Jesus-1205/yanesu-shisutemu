import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, PlusCircle } from "lucide-react";
import Button from "@/ui-components/Button";
import Spinner from "@/ui-components/Spinner";
import PageHeader from "@/ui-components/PageHeader";
import Textarea from "@/ui-components/Textarea";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";
import CreateProductModal from "@/features/shared/components/CreateProductModal";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import { useInvoiceFormCalculations } from "../hooks/useInvoiceFormCalculations";
import { useInvoiceCatalogs } from "../hooks/useInvoiceCatalogs";
import { useInvoiceAI } from "../hooks/useInvoiceAI";
import { useInvoiceSubmit } from "../hooks/useInvoiceSubmit";
import InvoiceInfoCard from "../components/InvoiceInfoCard";
import LineItemInputRow from "../components/LineItemInputRow";
import LineItemsTable from "../components/LineItemsTable";
import InvoiceSummaryPanel from "../components/InvoiceSummaryPanel";
import ObsequiosSection from "../components/ObsequiosSection";
import AIReviewPanel from "../components/AIReviewPanel";

export default function InvoiceNewPage() {
  const navigate = useNavigate();
  const store = useInvoiceFormStore();

  const {
    suppliers,
    products,
    categoryModalOpen,
    productModalOpen,
    setCategoryModalOpen,
    setProductModalOpen,
    handleSearchProducts,
    handleSearchSuppliers,
    handleSupplierCreated,
    handleCategoryCreated,
    handleProductCreated,
  } = useInvoiceCatalogs();

  const {
    esBs,
    nTasa,
    totalUsd,
    totalBs,
    ivaBreakdown,
  } = useInvoiceFormCalculations();

  const {
    aiState,
    aiLoading,
    aiAnalysis,
    aiRawJsonIa,
    handleAnalyzeImage,
    handleCancelAiReview,
    resetAi,
  } = useInvoiceAI();

  const { handleSubmit } = useInvoiceSubmit({
    aiRawJsonIa,
    onSuccess: resetAi,
  });

  return (
    <div>
      <PageHeader
        title={store.tipoDocumento === "FACTURA" ? "Nueva Factura" : "Nueva Nota de Entrega"}
        description={
          store.tipoDocumento === "FACTURA"
            ? "Registra una factura de proveedor y actualiza el inventario"
            : "Registra una nota de entrega de proveedor y actualiza el inventario"
        }
        actions={
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        <InvoiceInfoCard
          onSearchSuppliers={handleSearchSuppliers}
          onAnalyzeImage={handleAnalyzeImage}
          aiLoading={aiLoading}
          aiState={aiState}
        />

        <div className="space-y-4 rounded-xl border border-slate-200 bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-text-main uppercase">
              Productos de la Factura
            </h3>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-surface px-2 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue sm:px-2.5"
                title="Crear nuevo producto"
              >
                <PlusCircle className="size-3.5" />
                <span className="hidden sm:inline">Producto</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-surface px-2 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue sm:px-2.5"
                title="Crear nueva categoría"
              >
                <PlusCircle className="size-3.5" />
                <span className="hidden sm:inline">Categoría</span>
              </button>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {store.lineItems.length} item{store.lineItems.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <LineItemInputRow
            products={products}
            onSearchProducts={handleSearchProducts}
            esBs={esBs}
            moneda={store.moneda}
            tasa={store.tasa}
            aplicaIva={store.aplicaIva}
          />

          {store.lineItems.length > 0 ? (
            <div className="space-y-6">
              <LineItemsTable
                esBs={esBs}
                aplicaIva={store.aplicaIva}
                totalUsd={totalUsd}
                totalBs={totalBs}
                ivaBreakdown={ivaBreakdown}
              />
              <InvoiceSummaryPanel
                esBs={esBs}
                ivaBreakdown={ivaBreakdown}
                totalUsd={totalUsd}
                totalBs={totalBs}
                tasa={nTasa}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30 py-12 text-slate-400">
              <Package className="mb-3 size-10 text-slate-300" />
              <p className="text-sm font-medium">Ningún producto agregado</p>
              <p className="mt-1 text-xs">Busca un producto arriba y haz clic en "Agregar"</p>
            </div>
          )}
        </div>

        <ObsequiosSection
          products={products}
          onSearchProducts={handleSearchProducts}
        />

        {aiState === "reviewing" && aiAnalysis && (
          <AIReviewPanel
            aiAnalysis={aiAnalysis}
            products={products}
            suppliers={suppliers}
            invoiceFile={useInvoiceFormStore.getState().invoiceFiles[0]}
            onSupplierCreated={handleSupplierCreated}
            onProductCreated={handleProductCreated}
            onCancel={handleCancelAiReview}
          />
        )}

        <Textarea
          label="Observaciones"
          value={store.observaciones}
          onChange={(e) => store.setField("observaciones", e.target.value)}
          placeholder="Notas adicionales sobre la factura..."
          rows={3}
        />

        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
          <div className="flex-1" />
          <Button variant="accent" onClick={handleSubmit} loading={store.loading}>
            {store.tipoDocumento === "FACTURA" ? "Registrar Factura" : "Registrar Nota de Entrega"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            Cancelar
          </Button>
        </div>
      </div>

      <CreateCategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={handleCategoryCreated}
      />
      <CreateProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onCreated={handleProductCreated}
        compact
      />

      {aiLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/70">
          <div className="flex flex-col items-center rounded-2xl bg-white px-8 py-10 shadow-2xl">
            <Spinner size="lg" />
            <p className="mt-5 text-sm font-semibold text-slate-700">Analizando factura con IA...</p>
            <p className="mt-1 text-xs text-slate-400">Esto puede tomar unos segundos</p>
          </div>
        </div>
      )}
    </div>
  );
}
