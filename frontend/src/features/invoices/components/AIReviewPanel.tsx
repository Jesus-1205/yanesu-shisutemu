import { useCallback, useState } from "react";
import { ScanLine, Check } from "lucide-react";
import type { ProductOut, SupplierOut, InvoiceAnalysisOut, ExtractedProduct, TipoEmpaque } from "@/types/api";
import Button from "@/ui-components/Button";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import ImagePreview from "@/ui-components/ImagePreview";
import { toCents } from "@/lib/money";
import { convertirCostos, calcularSubtotal } from "@/lib/money";
import { generateUUID } from "@/lib/utils";
import type { LineItem } from "../types";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";
import CreateProductModal from "@/features/shared/components/CreateProductModal";

interface ReviewItem {
  extracted: ExtractedProduct;
  producto_id: number | null;
  producto_nombre: string;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  costo: number;
  unidades_por_caja: number;
}

interface AIReviewPanelProps {
  aiAnalysis: InvoiceAnalysisOut;
  products: ProductOut[];
  suppliers: SupplierOut[];
  invoiceFile?: File;
  onSupplierCreated: (supplier: SupplierOut) => void;
  onProductCreated: (product: ProductOut) => void;
  onCancel: () => void;
}

const inputBase = "h-9 rounded-lg border border-slate-300 bg-surface px-2 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelSmall = "text-[10px] font-medium text-slate-500 uppercase mb-1 block";

export default function AIReviewPanel({
  aiAnalysis,
  products,
  suppliers,
  invoiceFile,
  onSupplierCreated,
  onProductCreated,
  onCancel,
}: AIReviewPanelProps) {
  const { setField, setLineItems, tasa } = useInvoiceFormStore();
  const nTasa = tasa === "" ? 0 : Number(tasa);

  const [proveedorNombre, setProveedorNombre] = useState(aiAnalysis.proveedor_nombre);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [numeroFactura, setNumeroFactura] = useState(aiAnalysis.numero_factura);
  const [fechaFactura, setFechaFactura] = useState(aiAnalysis.fecha_factura ?? "");
  const [fechaLimitePago, setFechaLimitePago] = useState(aiAnalysis.fecha_limite_pago ?? "");
  const [moneda, setMoneda] = useState<"USD" | "BS">(aiAnalysis.moneda);
  const [tipoDocumento, setTipoDocumento] = useState<"FACTURA" | "NOTA_ENTREGA">(aiAnalysis.tipo_documento);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalNombre, setProductModalNombre] = useState("");

  const [items, setItems] = useState<ReviewItem[]>(() =>
    aiAnalysis.productos.map((p) => ({
      extracted: p,
      producto_id: null,
      producto_nombre: "",
      tipo_empaque: p.tipo_empaque,
      cantidad: p.cantidad,
      costo: Number(p.precio_unitario),
      unidades_por_caja: 1,
    }))
  );

  const handleSupplierCreated = useCallback((supplier: SupplierOut) => {
    setProveedorNombre(supplier.nombre);
    setProveedorId(supplier.id);
    onSupplierCreated(supplier);
    setSupplierModalOpen(false);
  }, [onSupplierCreated]);

  const handleProductCreated = useCallback((product: ProductOut) => {
    onProductCreated(product);
    if (productModalNombre) {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.extracted.nombre === productModalNombre && i.producto_id === null);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          producto_id: product.id,
          producto_nombre: product.nombre,
          unidades_por_caja: product.unidades_por_caja,
        };
        return updated;
      });
    }
    setProductModalOpen(false);
    setProductModalNombre("");
  }, [productModalNombre, onProductCreated]);

  const handleItemProductSelect = useCallback(async (index: number, productoId: number | null) => {
    if (productoId === null) {
      setItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          producto_id: null,
          producto_nombre: "",
          unidades_por_caja: 1,
        };
        return updated;
      });
      return;
    }
    let prod = products.find((p) => p.id === productoId);
    if (!prod) {
      try {
        const { api } = await import("@/services/api");
        prod = await api.getProduct(productoId);
      } catch { /* ignore */ }
    }
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        producto_id: productoId,
        producto_nombre: prod?.nombre ?? "",
        unidades_por_caja: prod?.unidades_por_caja ?? 1,
      };
      return updated;
    });
  }, [products]);

  const handleUpdateItem = useCallback((index: number, field: keyof ReviewItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleToggleEmpaque = useCallback(async (index: number, nuevoTipo: TipoEmpaque) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], tipo_empaque: nuevoTipo };
      return updated;
    });
    if (nuevoTipo === "CAJA") {
      const item = items[index];
      if (item.producto_id) {
        let prod = products.find((p) => p.id === item.producto_id);
        if (!prod) {
          try {
            const { api } = await import("@/services/api");
            prod = await api.getProduct(item.producto_id);
          } catch { /* ignore */ }
        }
        if (prod) {
          setItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], unidades_por_caja: prod!.unidades_por_caja };
            return updated;
          });
        }
      }
    }
  }, [items, products]);

  const allAccepted = items.every((i) => i.producto_id !== null);

  const handleAcceptAll = useCallback(() => {
    if (!allAccepted) return;
    const aplicaIva = useInvoiceFormStore.getState().aplicaIva;

    const newLineItems: LineItem[] = items.map((item) => {
      const precioUnitario = toCents(item.costo);
      const costos = convertirCostos(precioUnitario, moneda, nTasa);
      let subtotalUsd: number;
      let subtotalBs: number;
      if (moneda === "BS") {
        subtotalBs = calcularSubtotal(item.cantidad, costos.bs);
        subtotalUsd = nTasa > 0 ? toCents(subtotalBs / nTasa) : 0;
      } else {
        subtotalUsd = calcularSubtotal(item.cantidad, costos.usd);
        subtotalBs = nTasa > 0 ? toCents(subtotalUsd * nTasa) : 0;
      }

      return {
        key: generateUUID(),
        producto_id: item.producto_id!,
        nombre: item.producto_nombre,
        codigo_barra: null,
        tipo_empaque: item.tipo_empaque,
        cantidad: item.cantidad,
        costo_unitario_usd: costos.usd,
        costo_unitario_bs: costos.bs,
        subtotal_usd: subtotalUsd,
        subtotal_bs: subtotalBs,
        unidades_por_caja: item.tipo_empaque === "CAJA" ? item.unidades_por_caja : 1,
        tipo_iva: aplicaIva ? "GRAVADO" : "GRAVADO",
        costo_ingresado: precioUnitario,
        moneda_ingreso: moneda,
      };
    });

    setField("moneda", moneda);
    setField("tipoDocumento", tipoDocumento);
    if (proveedorId) setField("proveedorId", proveedorId);
    if (numeroFactura) setField("numeroFactura", numeroFactura);
    if (fechaFactura) setField("fechaFactura", fechaFactura);
    if (fechaLimitePago) setField("fechaLimitePago", fechaLimitePago);
    setLineItems(newLineItems);
    onCancel();
  }, [items, allAccepted, moneda, nTasa, tipoDocumento, proveedorId, numeroFactura, fechaFactura, fechaLimitePago, setField, setLineItems, onCancel]);

  const resolvedCount = items.filter((i) => i.producto_id !== null).length;

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 md:col-span-3">
          <label className={labelSmall}>Proveedor</label>
          {aiAnalysis.proveedor_nombre && (
            <p className="mb-1 text-xs font-medium text-slate-600" title={aiAnalysis.proveedor_nombre}>
              {aiAnalysis.proveedor_nombre}
            </p>
          )}
          <div className="flex gap-1.5">
            <AsyncCombobox
              value={proveedorId}
              onChange={(val) => {
                if (val) {
                  setProveedorId(val as number);
                  const found = suppliers.find((s) => s.id === val);
                  if (found) setProveedorNombre(found.nombre);
                } else {
                  setProveedorId(null);
                }
              }}
              onSearch={async (q) => {
                const { api } = await import("@/services/api");
                const data = await api.getSuppliers({ search: q || undefined });
                return data.map((s) => ({ value: s.id, label: s.nombre }));
              }}
              initialOptions={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
              placeholder="Buscar proveedor..."
              allowClear
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setSupplierModalOpen(true)}
              className="h-9 shrink-0 cursor-pointer rounded-lg border border-dashed border-slate-300 bg-surface px-2 text-xs text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
              title="Crear nuevo proveedor"
            >
              + Nuevo
            </button>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className={labelSmall}>N° Factura</label>
          <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className={inputBase} />
        </div>
        <div className="col-span-1 md:col-span-1">
          <label className={labelSmall}>Fecha</label>
          <input type="date" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} className={inputBase} />
        </div>
        <div className="col-span-1 md:col-span-1">
          <label className={labelSmall}>Fecha Límite</label>
          <input type="date" value={fechaLimitePago} onChange={(e) => setFechaLimitePago(e.target.value)} className={inputBase} />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className={labelSmall}>Tipo</label>
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setTipoDocumento("FACTURA")}
              className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                tipoDocumento === "FACTURA" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              Factura
            </button>
            <button
              type="button"
              onClick={() => setTipoDocumento("NOTA_ENTREGA")}
              className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                tipoDocumento === "NOTA_ENTREGA" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              N. Entrega
            </button>
          </div>
        </div>
        <div className="col-span-1 md:col-span-1">
          <label className={labelSmall}>Moneda</label>
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setMoneda("USD")}
              className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                moneda === "USD" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setMoneda("BS")}
              className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                moneda === "BS" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
              }`}
            >
              Bs.
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Productos extraídos ({resolvedCount}/{items.length} resueltos)
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-3 transition-colors ${
                item.producto_id !== null
                  ? "border-green-200 bg-green-50/50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-2 flex items-start gap-2">
                <span className="mt-1 text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                <span className="flex-1 truncate text-xs text-slate-500" title={item.extracted.nombre}>
                  {item.extracted.nombre}
                </span>
                {item.producto_id !== null && <Check className="size-4 shrink-0 text-green-500" />}
              </div>

              <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-6">
                <div className="col-span-2">
                  <label className={labelSmall}>Producto</label>
                  <AsyncCombobox
                    value={item.producto_id}
                    onChange={(val) => handleItemProductSelect(idx, val as number | null)}
                    onSearch={async (q) => {
                      const { api } = await import("@/services/api");
                      const data = await api.getProducts({ search: q || undefined });
                      return data.items.map((p) => ({ value: p.id, label: p.nombre, subtitle: p.codigo_barra || undefined }));
                    }}
                    initialOptions={products.map((p) => ({ value: p.id, label: p.nombre, subtitle: p.codigo_barra || undefined }))}
                    placeholder="Buscar producto..."
                    allowClear
                  />
                </div>
                <div>
                  <label className={labelSmall}>Cant</label>
                  <input
                    type="number"
                    value={item.cantidad || ""}
                    onChange={(e) => handleUpdateItem(idx, "cantidad", e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0)}
                    min="0"
                    className={`${inputBase} w-full`}
                  />
                </div>
                <div>
                  <label className={labelSmall}>{moneda === "BS" ? "Costo Bs." : "Costo $"}</label>
                  <input
                    type="number"
                    value={item.costo || ""}
                    onChange={(e) => handleUpdateItem(idx, "costo", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={`${inputBase} w-full`}
                  />
                </div>
                <div>
                  <label className={labelSmall}>Subtotal</label>
                  <div className={`${inputBase} flex w-full items-center bg-slate-50 font-mono text-xs`}>
                    {moneda === "BS" ? "Bs. " : "$ "}
                    {calcularSubtotal(item.cantidad, item.costo).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <label className={labelSmall}>Tipo</label>
                  <div className="flex overflow-hidden rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => handleToggleEmpaque(idx, "CAJA")}
                      className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                        item.tipo_empaque === "CAJA" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Caja
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleEmpaque(idx, "UNIDAD")}
                      className={`h-9 flex-1 cursor-pointer text-[10px] font-medium transition-colors ${
                        item.tipo_empaque === "UNIDAD" ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Und
                    </button>
                  </div>
                </div>
              </div>

              {item.tipo_empaque === "CAJA" && (
                <div className="mt-2 flex items-center gap-2">
                  <label className={labelSmall}>Unds/Caja</label>
                  <input
                    type="number"
                    value={item.unidades_por_caja || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        handleUpdateItem(idx, "unidades_por_caja", 0);
                      } else {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed) && parsed >= 0) {
                          handleUpdateItem(idx, "unidades_por_caja", parsed);
                        }
                      }
                    }}
                    min="1"
                    className={`${inputBase} w-20`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProductModalNombre(item.extracted.nombre);
                      setProductModalOpen(true);
                    }}
                    className="cursor-pointer text-[10px] text-brand-blue hover:underline"
                  >
                    Crear producto
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {!allAccepted && (
          <span className="self-center text-xs text-amber-600">
            {items.length - resolvedCount} producto(s) sin resolver
          </span>
        )}
        <Button variant="accent" onClick={handleAcceptAll} disabled={!allAccepted}>
          Aceptar y Agregar a Factura
        </Button>
      </div>

      {supplierModalOpen && (
        <CreateSupplierModal
          open={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          onCreated={handleSupplierCreated}
          initialNombre={proveedorNombre}
        />
      )}
      {productModalOpen && (
        <CreateProductModal
          open={productModalOpen}
          onClose={() => { setProductModalOpen(false); setProductModalNombre(""); }}
          onCreated={handleProductCreated}
          initialNombre={productModalNombre}
          compact
        />
      )}
    </div>
  );
}