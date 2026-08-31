import { useCallback, useEffect, useState } from "react";
import { Clock, ScanLine, Loader2 } from "lucide-react";
import type { SupplierOut, ExchangeRateOut } from "@/types/api";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import FileUpload from "@/ui-components/FileUpload";
import ImagePreview from "@/ui-components/ImagePreview";
import { useToast } from "@/ui-components/Toast";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";

interface InvoiceInfoCardProps {
  onSearchSuppliers: (query: string) => Promise<Array<{ value: number; label: string }>>;
  onAnalyzeImage: () => void;
  aiLoading: boolean;
  aiState: "idle" | "analyzing" | "reviewing";
}

const inputBase = "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelBase = "block text-xs font-medium text-slate-700 mb-1";
const cardBase = "rounded-xl border border-slate-200 bg-surface p-5 space-y-4";

export default function InvoiceInfoCard({ onSearchSuppliers, onAnalyzeImage, aiLoading, aiState }: InvoiceInfoCardProps) {
  const { toast } = useToast();
  const store = useInvoiceFormStore();
  const exchangeRateStore = useExchangeRateStore();
  const [rateHistory, setRateHistory] = useState<ExchangeRateOut[]>([]);
  const [showRateHistory, setShowRateHistory] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalNombre, setSupplierModalNombre] = useState("");
  const [supplierCreated, setSupplierCreated] = useState<SupplierOut | null>(null);

  useEffect(() => {
    if (exchangeRateStore.tasa === 0) {
      exchangeRateStore.loadTasa();
    }
    import("@/services/api").then(({ api }) => {
      api.getRateHistory({ days: 10 }).then((res) => {
        setRateHistory(res.history);
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (exchangeRateStore.tasa > 0 && (store.tasa === "" || store.tasa === "0")) {
      store.setField("tasa", String(Math.round(exchangeRateStore.tasa * 100) / 100));
    }
  }, [exchangeRateStore.tasa, store]);

  const uid = "invoice-info";
  const fid = (name: string) => `${uid}-${name}`;

  const handleSupplierCreated = useCallback((supplier: SupplierOut) => {
    store.setField("proveedorId", supplier.id);
    setSupplierCreated(supplier);
    toast(`Proveedor "${supplier.nombre}" creado`, "success");
  }, [store, toast]);

  return (
    <div className={cardBase}>
      <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide">
        Información de la Factura
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
        <div className="space-y-4">
          <div>
            <label className={labelBase}>Tipo de Documento</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                type="button"
                onClick={() => store.setField("tipoDocumento", "FACTURA")}
                className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                  store.tipoDocumento === "FACTURA"
                    ? "bg-brand-blue text-white"
                    : "bg-surface text-slate-600 hover:bg-slate-50"
                }`}
              >
                Factura
              </button>
              <button
                type="button"
                onClick={() => store.setField("tipoDocumento", "NOTA_ENTREGA")}
                className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                  store.tipoDocumento === "NOTA_ENTREGA"
                    ? "bg-brand-blue text-white"
                    : "bg-surface text-slate-600 hover:bg-slate-50"
                }`}
              >
                Nota de Entrega
              </button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <AsyncCombobox
                label="Proveedor"
                value={store.proveedorId}
                onChange={(val) => store.setField("proveedorId", val as number | null)}
                onSearch={onSearchSuppliers}
                placeholder="Buscar proveedor..."
                allowClear={false}
                initialOptions={supplierCreated ? [{ value: supplierCreated.id, label: supplierCreated.nombre }] : []}
              />
            </div>
            <button
              type="button"
              onClick={() => { setSupplierModalNombre(""); setSupplierModalOpen(true); }}
              className="shrink-0 h-10 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-surface px-3 text-sm text-slate-500 hover:text-brand-blue hover:border-brand-blue transition-colors cursor-pointer"
              title="Crear nuevo proveedor"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>
          <div>
            <label htmlFor={fid("numero")} className={labelBase}>Número de Factura</label>
            <input
              id={fid("numero")}
              value={store.numeroFactura}
              onChange={(e) => store.setField("numeroFactura", e.target.value)}
              placeholder="Ej: 001-00012345"
              required
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor={fid("fecha")} className={labelBase}>Fecha de Factura</label>
            <input
              id={fid("fecha")}
              type="date"
              value={store.fechaFactura}
              onChange={(e) => store.setField("fechaFactura", e.target.value)}
              autoComplete="off"
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor={fid("fecha-limite")} className={labelBase}>Fecha Límite de Pago <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input
              id={fid("fecha-limite")}
              type="date"
              value={store.fechaLimitePago || ""}
              onChange={(e) => store.setField("fechaLimitePago", e.target.value || null)}
              autoComplete="off"
              className={inputBase}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelBase}>Moneda Principal</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                type="button"
                onClick={() => store.setField("moneda", "USD")}
                className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                  store.moneda === "USD"
                    ? "bg-brand-blue text-white"
                    : "bg-surface text-slate-600 hover:bg-slate-50"
                }`}
              >
                USD $
              </button>
              <button
                type="button"
                onClick={() => store.setField("moneda", "BS")}
                className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                  store.moneda === "BS"
                    ? "bg-brand-blue text-white"
                    : "bg-surface text-slate-600 hover:bg-slate-50"
                }`}
              >
                Bs.
              </button>
            </div>
          </div>
          <div>
            <label htmlFor={fid("tasa")} className={labelBase}>Tasa de Cambio (Bs. por USD)</label>
            <div className="flex gap-2">
              <input
                id={fid("tasa")}
                type="number"
                step="0.01"
                min={0}
                value={store.tasa}
                onChange={(e) => store.setField("tasa", e.target.value)}
                placeholder="0.00"
                autoComplete="off"
                className={`${inputBase} flex-1`}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRateHistory((prev) => !prev)}
                  className="shrink-0 h-10 px-3 rounded-lg border border-slate-300 bg-surface text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-brand-blue transition-colors cursor-pointer flex items-center gap-1"
                  title="Historial de tasas"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                {showRateHistory && rateHistory.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowRateHistory(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        Últimas tasas
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {rateHistory.map((rate) => (
                          <button
                            key={rate.id}
                            type="button"
                            onClick={() => {
                              store.setField("tasa", String(Math.round(Number(rate.tasa_usd) * 100) / 100));
                              setShowRateHistory(false);
                              toast(`Tasa del ${new Date(rate.fecha_registro).toLocaleDateString("es-VE")} aplicada`, "success");
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-text-main">USD {Number(rate.tasa_usd).toFixed(2)}</span>
                              <span className="text-[10px] text-slate-400">EUR {Number(rate.tasa_eur).toFixed(2)}</span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {new Date(rate.fecha_registro).toLocaleDateString("es-VE")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {exchangeRateStore.fechaUltimaActualizacion && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Tasa actual: {Number(exchangeRateStore.tasa).toFixed(2)} Bs/USD • Actualizada {new Date(exchangeRateStore.fechaUltimaActualizacion).toLocaleDateString("es-VE")}
              </p>
            )}
          </div>
          <div>
            <label className={labelBase}>¿La factura incluye IVA?</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                type="button"
                onClick={() => store.setField("aplicaIva", true)}
                disabled={store.moneda === "USD"}
                className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                  store.aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                } ${store.moneda === "USD" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Con IVA
              </button>
              <button
                type="button"
                onClick={() => store.setField("aplicaIva", false)}
                disabled={store.moneda === "USD"}
                className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                  !store.aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                } ${store.moneda === "USD" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Sin IVA
              </button>
            </div>
            {store.moneda === "USD" && (
              <p className="text-[10px] text-slate-400 mt-0.5">El IVA solo aplica a facturas en bolívares</p>
            )}
          </div>
          <div>
            <label className={labelBase}>Archivos de Factura (imagen o PDF)</label>
            <FileUpload
              accept="image/*,.pdf"
              maxSize={10 * 1024 * 1024}
              onFilesChange={(files) => store.setField("invoiceFiles", files)}
            />
            {store.invoiceFiles.length > 0 && store.invoiceFiles[0].type.startsWith("image/") && (
              <div className="mt-2">
                <ImagePreview file={store.invoiceFiles[0]} />
              </div>
            )}
            {store.invoiceFiles.length > 0 && aiState === "idle" && (
              <button
                type="button"
                onClick={onAnalyzeImage}
                disabled={aiLoading}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-surface text-slate-600 hover:bg-slate-50 hover:border-brand-blue transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ScanLine className="w-4 h-4" />
                )}
                {aiLoading ? "Analizando..." : "Leer con IA"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de crear proveedor */}
      {supplierModalOpen && (
        <CrearProveedorModalInline
          open={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          onCreated={handleSupplierCreated}
          initialNombre={supplierModalNombre}
        />
      )}
    </div>
  );
}

function CrearProveedorModalInline({ open, onClose, onCreated, initialNombre }: {
  open: boolean;
  onClose: () => void;
  onCreated: (s: import("@/types/api").SupplierOut) => void;
  initialNombre: string;
}) {
  return (
    <CreateSupplierModal
      open={open}
      onClose={onClose}
      onCreated={onCreated}
      initialNombre={initialNombre}
    />
  );
}
