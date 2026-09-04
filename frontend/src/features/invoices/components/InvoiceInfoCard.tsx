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
      <h3 className="text-sm font-semibold tracking-wide text-text-main uppercase">
        Información de la Factura
      </h3>
      <div className="grid grid-cols-1 gap-x-8 gap-y-0 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className={labelBase}>Tipo de Documento</label>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => store.setField("tipoDocumento", "FACTURA")}
                className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
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
                className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
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
              className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-surface px-3 text-sm text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
              title="Crear nuevo proveedor"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
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
            <label htmlFor={fid("fecha-limite")} className={labelBase}>Fecha Límite de Pago <span className="font-normal text-slate-400">(opcional)</span></label>
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
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => store.setField("moneda", "USD")}
                className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
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
                className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
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
                  className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-surface px-3 text-xs font-medium text-slate-600 transition-colors hover:border-brand-blue hover:bg-slate-50"
                  title="Historial de tasas"
                >
                  <Clock className="size-3.5" />
                </button>
                {showRateHistory && rateHistory.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowRateHistory(false)} />
                    <div className="absolute top-full right-0 z-50 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
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
                            className="flex w-full cursor-pointer items-center justify-between border-b border-slate-50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-slate-50"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-text-main">USD {Number(rate.tasa_usd).toFixed(2)}</span>
                              <span className="text-[10px] text-slate-400">EUR {Number(rate.tasa_eur).toFixed(2)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
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
              <p className="mt-0.5 text-[10px] text-slate-400">
                Tasa actual: {Number(exchangeRateStore.tasa).toFixed(2)} Bs/USD • Actualizada {new Date(exchangeRateStore.fechaUltimaActualizacion).toLocaleDateString("es-VE")}
              </p>
            )}
          </div>
          <div>
            <label className={labelBase}>¿La factura incluye IVA?</label>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => store.setField("aplicaIva", true)}
                disabled={store.moneda === "USD"}
                className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
                  store.aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                } ${store.moneda === "USD" ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Con IVA
              </button>
              <button
                type="button"
                onClick={() => store.setField("aplicaIva", false)}
                disabled={store.moneda === "USD"}
                className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
                  !store.aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                } ${store.moneda === "USD" ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Sin IVA
              </button>
            </div>
            {store.moneda === "USD" && (
              <p className="mt-0.5 text-[10px] text-slate-400">El IVA solo aplica a facturas en bolívares</p>
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
                className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue/90 disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanLine className="size-4" />
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