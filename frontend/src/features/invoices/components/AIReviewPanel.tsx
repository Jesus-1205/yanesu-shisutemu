import { useCallback, useState } from "react";
import { ScanLine, CheckCircle2, AlertTriangle, XCircle, X, CirclePlus } from "lucide-react";
import type { ProductOut, SupplierOut, InvoiceAnalysisOut, MatchedProduct } from "@/types/api";
import Button from "@/ui-components/Button";
import Combobox from "@/ui-components/Combobox";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import Badge from "@/ui-components/Badge";
import { formatBs, formatUsd } from "@/lib/text";
import { toCents } from "@/lib/money";
import { generateUUID } from "@/lib/utils";
import type { LineItem } from "../types";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";
import CreateProductModal from "@/features/shared/components/CreateProductModal";

export interface AIAnalysisItem extends MatchedProduct {
  resolved_producto_id: number | null;
  resolved_nombre: string;
}

interface AIReviewPanelProps {
  aiAnalysis: InvoiceAnalysisOut;
  aiItems: AIAnalysisItem[];
  setAiItems: React.Dispatch<React.SetStateAction<AIAnalysisItem[]>>;
  products: ProductOut[];
  suppliers: SupplierOut[];
  onSupplierCreated: (supplier: SupplierOut) => void;
  onProductCreated: (product: ProductOut) => void;
  onCancel: () => void;
}

export default function AIReviewPanel({
  aiAnalysis,
  aiItems,
  setAiItems,
  products,
  suppliers,
  onSupplierCreated,
  onProductCreated,
  onCancel,
}: AIReviewPanelProps) {
  const { setField, setLineItems, tasa } = useInvoiceFormStore();
  const [selectedAiCurrency, setSelectedAiCurrency] = useState<"USD" | "BS">(aiAnalysis.moneda ?? "USD");
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalNombre, setSupplierModalNombre] = useState("");
  const [productModalForNew, setProductModalForNew] = useState<{ open: boolean; nombre: string; precio: number }>({ open: false, nombre: "", precio: 0 });

  const nTasa = tasa === "" ? 0 : Number(tasa);

  const handleSupplierCreated = useCallback((supplier: SupplierOut) => {
    setField("proveedorId", supplier.id);
    onSupplierCreated(supplier);
    setSupplierModalOpen(false);
  }, [setField, onSupplierCreated]);

  const handleProductCreated = useCallback((product: ProductOut) => {
    onProductCreated(product);
    if (productModalForNew.open && productModalForNew.nombre) {
      setAiItems((prev) => {
        const idx = prev.findIndex(
          (i) => i.nombre_extraido === productModalForNew.nombre && i.resolved_producto_id === null,
        );
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          resolved_producto_id: product.id,
          resolved_nombre: product.nombre,
          match_status: "EXACT",
        };
        return updated;
      });
    }
    setProductModalForNew({ open: false, nombre: "", precio: 0 });
  }, [productModalForNew, onProductCreated, setAiItems]);

  const handleAiItemSelect = useCallback((itemIndex: number, productoId: number | null) => {
    setAiItems((prev) => {
      const updated = [...prev];
      const item = updated[itemIndex];
      if (productoId === null) {
        updated[itemIndex] = {
          ...item,
          resolved_producto_id: null,
          resolved_nombre: item.nombre_extraido,
        };
      } else {
        const prod = products.find((p) => p.id === productoId);
        updated[itemIndex] = {
          ...item,
          resolved_producto_id: productoId,
          resolved_nombre: prod?.nombre ?? item.nombre_extraido,
          match_status: "EXACT",
        };
      }
      return updated;
    });
  }, [products, setAiItems]);

  const handleAcceptAiItems = useCallback(() => {
    const aplicaIva = useInvoiceFormStore.getState().aplicaIva;
    const unresolved = aiItems.filter((i) => i.resolved_producto_id === null);
    if (unresolved.length > 0) return;

    const newLineItems: LineItem[] = aiItems.map((item) => {
      const prod = products.find((p) => p.id === item.resolved_producto_id);
      const precioUnitario = toCents(Number(item.precio_unitario));
      const unidadesPorCaja = prod?.unidades_por_caja ?? 1;
      return {
        key: generateUUID(),
        producto_id: item.resolved_producto_id!,
        nombre: item.resolved_nombre,
        codigo_barra: prod?.codigo_barra ?? null,
        tipo_empaque: item.tipo_empaque,
        cantidad: item.cantidad,
        costo_unitario_usd: 0,
        costo_unitario_bs: 0,
        subtotal_usd: 0,
        subtotal_bs: 0,
        unidades_por_caja: unidadesPorCaja,
        tipo_iva: aplicaIva ? "GRAVADO" : (prod?.tipo_iva ?? "GRAVADO"),
        costo_ingresado: precioUnitario,
        moneda_ingreso: selectedAiCurrency,
      };
    });

    setField("moneda", selectedAiCurrency);
    setLineItems(newLineItems);
    onCancel();
  }, [aiItems, products, selectedAiCurrency, setField, setLineItems, onCancel]);

  const unresolved = aiItems.filter((i) => i.resolved_producto_id === null);

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-2">
          <ScanLine className="w-4 h-4" />
          Revisión de Factura (IA)
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {/* Proveedor */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
        <span className="text-xs font-medium text-slate-500">Proveedor:</span>
        {aiAnalysis.proveedor.match_status === "EXACT" ? (
          <span className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            {aiAnalysis.proveedor.nombre}
            <Badge variant="success">EXACT</Badge>
          </span>
        ) : aiAnalysis.proveedor.match_status === "PARTIAL" ? (
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <AsyncCombobox
              value={aiAnalysis.proveedor.id || null}
              onChange={(val) => {
                if (val) {
                  setField("proveedorId", val as number);
                  const selected = suppliers.find((s) => s.id === val);
                  if (selected) {
                    onSupplierCreated(selected);
                  }
                }
              }}
              onSearch={async (q) => {
                const data = await import("@/services/api").then(({ api }) => api.getSuppliers({ search: q || undefined }));
                return data.map((s) => ({ value: s.id, label: s.nombre }));
              }}
              placeholder="Seleccionar proveedor..."
              allowClear={false}
              className="flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={() => { setSupplierModalNombre(aiAnalysis.proveedor.nombre); setSupplierModalOpen(true); }}
              className="shrink-0 h-10 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-surface px-3 text-sm text-slate-500 hover:text-brand-blue hover:border-brand-blue transition-colors cursor-pointer"
              title="Crear nuevo proveedor"
            >
              <CirclePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
            <Badge variant="warning">PARTIAL ({Math.round(aiAnalysis.proveedor.confidence * 100)}%)</Badge>
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-red-600">
            <XCircle className="w-4 h-4" />
            {aiAnalysis.proveedor.nombre}
            <Badge variant="danger">NOT FOUND</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSupplierModalNombre(aiAnalysis.proveedor.nombre); setSupplierModalOpen(true); }}
              className="ml-2"
            >
              <CirclePlus className="w-3 h-3 mr-1" />
              Crear
            </Button>
          </span>
        )}
      </div>

      {/* Moneda detectada */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
        <span className="text-xs font-medium text-slate-500">Moneda detectada:</span>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setSelectedAiCurrency("USD")}
            className={`px-3 h-8 text-xs font-medium transition-colors cursor-pointer ${
              selectedAiCurrency === "USD"
                ? "bg-brand-blue text-white"
                : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            USD $
          </button>
          <button
            type="button"
            onClick={() => setSelectedAiCurrency("BS")}
            className={`px-3 h-8 text-xs font-medium transition-colors cursor-pointer ${
              selectedAiCurrency === "BS"
                ? "bg-brand-blue text-white"
                : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            Bs.
          </button>
        </div>
        {selectedAiCurrency === "BS" && (
          <div className="flex items-center gap-2 ml-2">
            <label className="text-xs font-medium text-slate-500">Tasa BCV:</label>
            <input
              type="number"
              value={tasa}
              onChange={(e) => setField("tasa", e.target.value)}
              placeholder="Ej: 742.81"
              min="0"
              step="0.01"
              autoComplete="off"
              className="w-28 h-8 rounded-lg border border-slate-300 bg-surface px-2 text-xs text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
        )}
        <span className="text-xs text-slate-400">(ajustar si es necesario)</span>
      </div>

      {/* Productos */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500">Productos ({aiItems.length}):</span>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2">Estado</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2">Producto IA</th>
                <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-2">Tipo</th>
                <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-2">Cant</th>
                <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-2">Precio</th>
                <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-2 min-w-[200px]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aiItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2">
                    {item.match_status === "EXACT" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : item.match_status === "PARTIAL" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-2 text-text-main font-medium">{item.nombre_extraido}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.tipo_empaque === "CAJA"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {item.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={item.cantidad || ""}
                      onChange={(e) => {
                        setAiItems((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], cantidad: e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0 };
                          return updated;
                        });
                      }}
                      min="0"
                      autoComplete="off"
                      className="w-16 h-8 text-right text-sm font-mono rounded border border-slate-300 bg-surface px-1 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <input
                        type="number"
                        value={item.precio_unitario || ""}
                        onChange={(e) => {
                          setAiItems((prev) => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], precio_unitario: toCents(parseFloat(e.target.value) || 0) };
                            return updated;
                          });
                        }}
                        min="0"
                        step="0.01"
                        autoComplete="off"
                        className="w-28 h-8 text-right text-sm font-mono rounded border border-slate-300 bg-surface px-1 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                      />
                      {selectedAiCurrency === "BS" && (
                        <span className="text-[10px] text-slate-400">
                          {nTasa > 0
                            ? formatUsd(Number(item.precio_unitario) / nTasa)
                            : formatUsd(Number(item.precio_unitario))
                          }
                        </span>
                      )}
                      {selectedAiCurrency !== "BS" && (
                        <span className="text-[10px] text-slate-400">
                          {nTasa > 0
                            ? `${formatBs(Number(item.precio_unitario) * nTasa)} BS`
                            : ""
                          }
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        {item.match_status === "EXACT" ? (
                          <span className="text-sm text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {item.resolved_nombre}
                          </span>
                        ) : item.match_status === "PARTIAL" && item.suggestions.length > 0 ? (
                          <>
                            <Combobox
                              value={item.resolved_producto_id}
                              onChange={(val) => handleAiItemSelect(idx, val as number | null)}
                              options={item.suggestions.map((s) => ({
                                value: s.id,
                                label: `${s.nombre}${s.codigo_barra ? ` (${s.codigo_barra})` : ""}`,
                              }))}
                              placeholder="Seleccionar producto..."
                              allowClear
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedAiCurrency === "BS" && nTasa <= 0) return;
                                setProductModalForNew({ open: true, nombre: item.nombre_extraido, precio: item.precio_unitario });
                              }}
                              className="text-xs text-brand-blue hover:underline flex items-center gap-1 self-start"
                            >
                              <CirclePlus className="w-3 h-3" />
                              Crear nuevo producto
                            </button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (selectedAiCurrency === "BS" && nTasa <= 0) return;
                              setProductModalForNew({ open: true, nombre: item.nombre_extraido, precio: item.precio_unitario });
                            }}
                            className="gap-1"
                          >
                            <CirclePlus className="w-3.5 h-3.5" />
                            Crear producto
                          </Button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Descartar producto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-2">
        {unresolved.length > 0 && (
          <span className="text-xs text-amber-600 self-center">
            {unresolved.length} producto(s) sin resolver
          </span>
        )}
        <Button variant="accent" onClick={handleAcceptAiItems} disabled={unresolved.length > 0}>
          Aceptar y Agregar a Factura
        </Button>
      </div>

      {/* Modal proveedor inline */}
      {supplierModalOpen && (
        <CrearProveedorInline
          open={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          onCreated={handleSupplierCreated}
          initialNombre={supplierModalNombre}
        />
      )}

      {/* Modal producto inline */}
      {productModalForNew.open && (
        <CrearProductoInline
          open={productModalForNew.open}
          onClose={() => setProductModalForNew({ open: false, nombre: "", precio: 0 })}
          onCreated={handleProductCreated}
          initialNombre={productModalForNew.nombre}
          initialPrecio={productModalForNew.precio}
          initialMoneda={selectedAiCurrency as "USD" | "BS"}
          tasaBs={nTasa}
        />
      )}
    </div>
  );
}

function CrearProveedorInline({ open, onClose, onCreated, initialNombre }: {
  open: boolean;
  onClose: () => void;
  onCreated: (s: SupplierOut) => void;
  initialNombre: string;
}) {
  return <CreateSupplierModal open={open} onClose={onClose} onCreated={onCreated} initialNombre={initialNombre} />;
}

function CrearProductoInline(props: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: ProductOut) => void;
  initialNombre: string;
  initialPrecio: number;
  initialMoneda: "USD" | "BS";
  tasaBs: number;
}) {
  return <CreateProductModal {...props} />;
}
