import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import { useInvoiceSupplierModal } from "../hooks/useInvoiceSupplierModal";
import { useInvoiceExchangeRateSync } from "../hooks/useInvoiceExchangeRateSync";
import InvoiceDocumentTypes from "./InvoiceDocumentTypes";
import InvoiceSupplierField from "./InvoiceSupplierField";
import InvoiceBasicDetails from "./InvoiceBasicDetails";
import InvoiceCurrencyConfig from "./InvoiceCurrencyConfig";
import InvoiceFilesSection from "./InvoiceFilesSection";

interface InvoiceInfoCardProps {
  onSearchSuppliers: (query: string) => Promise<Array<{ value: number; label: string }>>;
  onAnalyzeImage: () => void;
  aiLoading: boolean;
  aiState: "idle" | "analyzing" | "reviewing";
}

export default function InvoiceInfoCard({
  onSearchSuppliers,
  onAnalyzeImage,
  aiLoading,
  aiState,
}: InvoiceInfoCardProps) {
  const tipoDocumento = useInvoiceFormStore((s) => s.tipoDocumento);
  const proveedorId = useInvoiceFormStore((s) => s.proveedorId);
  const numeroFactura = useInvoiceFormStore((s) => s.numeroFactura);
  const fechaFactura = useInvoiceFormStore((s) => s.fechaFactura);
  const fechaLimitePago = useInvoiceFormStore((s) => s.fechaLimitePago);
  const moneda = useInvoiceFormStore((s) => s.moneda);
  const tasa = useInvoiceFormStore((s) => s.tasa);
  const aplicaIva = useInvoiceFormStore((s) => s.aplicaIva);
  const invoiceFiles = useInvoiceFormStore((s) => s.invoiceFiles);
  const setField = useInvoiceFormStore((s) => s.setField);

  const {
    supplierModalOpen,
    supplierModalNombre,
    supplierCreated,
    openSupplierModal,
    closeSupplierModal,
    handleSupplierCreated,
  } = useInvoiceSupplierModal();

  const {
    tasaActual,
    fechaUltimaActualizacion,
    rateHistory,
    showRateHistory,
    setShowRateHistory,
    applyRate,
  } = useInvoiceExchangeRateSync();

  return (
    <div className="rounded-xl border border-slate-200 bg-surface p-5 space-y-4">
      <h3 className="text-sm font-semibold tracking-wide text-text-main uppercase">
        Información de la Factura
      </h3>
      <div className="grid grid-cols-1 gap-x-8 gap-y-0 md:grid-cols-2">
        <div className="space-y-4">
          <InvoiceDocumentTypes
            value={tipoDocumento}
            onChange={(val) => setField("tipoDocumento", val)}
          />

          <InvoiceSupplierField
            value={proveedorId}
            onChange={(val) => setField("proveedorId", val)}
            onSearch={onSearchSuppliers}
            onOpenNewSupplierModal={() => openSupplierModal("")}
            initialSupplier={supplierCreated}
          />

          <InvoiceBasicDetails
            numeroFactura={numeroFactura}
            fechaFactura={fechaFactura}
            fechaLimitePago={fechaLimitePago}
            onNumeroFacturaChange={(val) => setField("numeroFactura", val)}
            onFechaFacturaChange={(val) => setField("fechaFactura", val)}
            onFechaLimitePagoChange={(val) => setField("fechaLimitePago", val)}
          />
        </div>

        <div className="space-y-4">
          <InvoiceCurrencyConfig
            moneda={moneda}
            tasa={tasa}
            aplicaIva={aplicaIva}
            rateHistory={rateHistory}
            showRateHistory={showRateHistory}
            tasaActual={tasaActual}
            fechaUltimaActualizacion={fechaUltimaActualizacion}
            onMonedaChange={(val) => setField("moneda", val)}
            onTasaChange={(val) => setField("tasa", val)}
            onAplicaIvaChange={(val) => setField("aplicaIva", val)}
            onToggleRateHistory={() => setShowRateHistory((prev) => !prev)}
            onCloseRateHistory={() => setShowRateHistory(false)}
            onSelectRate={applyRate}
          />

          <InvoiceFilesSection
            invoiceFiles={invoiceFiles}
            aiState={aiState}
            aiLoading={aiLoading}
            onFilesChange={(files) => setField("invoiceFiles", files)}
            onAnalyzeImage={onAnalyzeImage}
          />
        </div>
      </div>

      {supplierModalOpen && (
        <CreateSupplierModal
          open={supplierModalOpen}
          onClose={closeSupplierModal}
          onCreated={handleSupplierCreated}
          initialNombre={supplierModalNombre}
        />
      )}
    </div>
  );
}
