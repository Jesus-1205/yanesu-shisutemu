import { ScanLine } from "lucide-react";
import type { ProductOut, SupplierOut, InvoiceAnalysisOut } from "@/types/api";
import Button from "@/ui-components/Button";
import ImagePreview from "@/ui-components/ImagePreview";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";
import CreateProductModal from "@/features/shared/components/CreateProductModal";
import { useAIReviewState } from "../hooks/useAIReviewState";
import AIReviewMetadataForm from "./AIReviewMetadataForm";
import AIReviewItemRow from "./AIReviewItemRow";

interface AIReviewPanelProps {
  aiAnalysis: InvoiceAnalysisOut;
  products: ProductOut[];
  suppliers: SupplierOut[];
  invoiceFile?: File;
  onSupplierCreated: (supplier: SupplierOut) => void;
  onProductCreated: (product: ProductOut) => void;
  onCancel: () => void;
}

export default function AIReviewPanel({
  aiAnalysis,
  products,
  suppliers,
  invoiceFile,
  onSupplierCreated,
  onProductCreated,
  onCancel,
}: AIReviewPanelProps) {
  const { state, computed, actions } = useAIReviewState({
    aiAnalysis,
    products,
    onSupplierCreated,
    onProductCreated,
    onCancel,
  });

  return (
    <div className="space-y-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-amber-800 uppercase">
          <ScanLine className="size-4" />
          Revisión de Factura (IA)
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {invoiceFile && invoiceFile.type.startsWith("image/") && (
        <ImagePreview file={invoiceFile} alt="Factura a revisar" />
      )}

      <AIReviewMetadataForm
        analysisProveedorNombre={aiAnalysis.proveedor_nombre}
        proveedorId={state.proveedorId}
        setProveedorId={state.setProveedorId}
        setProveedorNombre={state.setProveedorNombre}
        suppliers={suppliers}
        onOpenSupplierModal={() => state.setSupplierModalOpen(true)}
        numeroFactura={state.numeroFactura}
        setNumeroFactura={state.setNumeroFactura}
        fechaFactura={state.fechaFactura}
        setFechaFactura={state.setFechaFactura}
        fechaLimitePago={state.fechaLimitePago}
        setFechaLimitePago={state.setFechaLimitePago}
        tipoDocumento={state.tipoDocumento}
        setTipoDocumento={state.setTipoDocumento}
        moneda={state.moneda}
        setMoneda={state.setMoneda}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Productos extraídos ({computed.resolvedCount}/{state.items.length} resueltos)
          </span>
        </div>

        <div className="space-y-3">
          {state.items.map((item, idx) => (
            <AIReviewItemRow
              key={idx}
              item={item}
              index={idx}
              moneda={state.moneda}
              products={products}
              onProductSelect={actions.handleItemProductSelect}
              onUpdateItem={actions.handleUpdateItem}
              onToggleEmpaque={actions.handleToggleEmpaque}
              onOpenProductModal={(nombre) => {
                state.setProductModalNombre(nombre);
                state.setProductModalOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {!computed.allAccepted && (
          <span className="self-center text-xs text-amber-600">
            {state.items.length - computed.resolvedCount} producto(s) sin resolver
          </span>
        )}
        <Button variant="accent" onClick={actions.handleAcceptAll} disabled={!computed.allAccepted}>
          Aceptar y Agregar a Factura
        </Button>
      </div>

      {state.supplierModalOpen && (
        <CreateSupplierModal
          open={state.supplierModalOpen}
          onClose={() => state.setSupplierModalOpen(false)}
          onCreated={actions.handleSupplierCreated}
          initialNombre={state.proveedorNombre}
        />
      )}
      {state.productModalOpen && (
        <CreateProductModal
          open={state.productModalOpen}
          onClose={() => {
            state.setProductModalOpen(false);
            state.setProductModalNombre("");
          }}
          onCreated={actions.handleProductCreated}
          initialNombre={state.productModalNombre}
          compact
        />
      )}
    </div>
  );
}
