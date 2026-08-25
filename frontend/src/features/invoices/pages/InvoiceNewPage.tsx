import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut, SupplierOut, CategoryOut, InvoiceAnalysisOut } from "@/types/api";
import Button from "@/ui-components/Button";
import { useToast } from "@/ui-components/Toast";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";
import CreateProductModal from "@/features/shared/components/CreateProductModal";
import PageHeader from "@/ui-components/PageHeader";
import Textarea from "@/ui-components/Textarea";
import { calcularResumenFiscal } from "@/lib/iva";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import type { AIAnalysisItem } from "../components/AIReviewPanel";
import InvoiceInfoCard from "../components/InvoiceInfoCard";
import LineItemInputRow from "../components/LineItemInputRow";
import LineItemsTable from "../components/LineItemsTable";
import InvoiceSummaryPanel from "../components/InvoiceSummaryPanel";
import ObsequiosSection from "../components/ObsequiosSection";
import AIReviewPanel from "../components/AIReviewPanel";

export default function InvoiceNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const store = useInvoiceFormStore();

  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);

  // ── Modales ──
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  // ── IA ──
  const [aiState, setAiState] = useState<"idle" | "analyzing" | "reviewing">("idle");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<InvoiceAnalysisOut | null>(null);
  const [aiItems, setAiItems] = useState<AIAnalysisItem[]>([]);
  const [aiRawJsonIa, setAiRawJsonIa] = useState<Record<string, unknown> | null>(null);

  // ── Derived ──
  const esBs = store.moneda === "BS";
  const nTasa = store.tasa === "" ? 0 : Number(store.tasa);

  const totalUsd = useMemo(
    () => Math.round(store.lineItems.reduce((acc, d) => acc + d.subtotal_usd, 0) * 100) / 100,
    [store.lineItems],
  );
  const totalBs = useMemo(
    () => Math.round(store.lineItems.reduce((acc, d) => acc + d.subtotal_bs, 0) * 100) / 100,
    [store.lineItems],
  );

  const ivaBreakdown = useMemo(() => {
    let totalUnidades = 0;
    for (const item of store.lineItems) {
      totalUnidades += item.tipo_empaque === "CAJA"
        ? item.cantidad * item.unidades_por_caja
        : item.cantidad;
    }
    const resumen = calcularResumenFiscal(
      store.lineItems.map(item => ({
        subtotal_usd: item.subtotal_usd,
        subtotal_bs: item.subtotal_bs,
        tipo_iva: item.tipo_iva,
      })),
      store.moneda,
      store.aplicaIva,
    );
    return { ...resumen, totalUnidades };
  }, [store.lineItems, store.moneda, store.aplicaIva]);

  // ── Effects ──
  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  useEffect(() => {
    if (nTasa <= 0) return;
    store.recalcAllItems(nTasa);
  }, [nTasa]);

  useEffect(() => {
    if (store.aplicaIva && esBs) {
      store.forceAllItemsGravado();
    }
  }, [store.aplicaIva, esBs]);

  // ── Search handlers ──
  const handleSearchProducts = useCallback(async (query: string) => {
    const data = await api.getProducts({ search: query || undefined });
    setProducts(data.items);
    return data.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  }, []);

  const handleSearchSuppliers = useCallback(async (query: string) => {
    const data = await api.getSuppliers({ search: query || undefined });
    setSuppliers(data);
    return data.map((s) => ({
      value: s.id,
      label: s.nombre,
    }));
  }, []);

  // ── AI handlers ──
  const handleAnalyzeImage = useCallback(async () => {
    const invoiceFiles = useInvoiceFormStore.getState().invoiceFiles;
    if (invoiceFiles.length === 0) {
      toast("Sube una imagen primero para analizar con IA", "error");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await api.analyzeInvoice(invoiceFiles);
      if (result.proveedor.match_status === "EXACT") {
        store.setField("proveedorId", result.proveedor.id);
      }
      if (result.fecha_factura) {
        store.setField("fechaFactura", result.fecha_factura);
      }
      if (result.numero_factura) {
        store.setField("numeroFactura", result.numero_factura);
      }
      const items: AIAnalysisItem[] = result.productos.map((p) => ({
        ...p,
        resolved_producto_id: p.producto_id,
        resolved_nombre: p.producto_id
          ? products.find((prod) => prod.id === p.producto_id)?.nombre ?? p.nombre_extraido
          : p.nombre_extraido,
      }));
      setAiItems(items);
      setAiAnalysis(result);
      setAiRawJsonIa(result.raw_json_ia);
      setAiState("reviewing");
      const exactCount = result.productos.filter((p) => p.match_status === "EXACT").length;
      const partialCount = result.productos.filter((p) => p.match_status === "PARTIAL").length;
      const notFoundCount = result.productos.filter((p) => p.match_status === "NOT_FOUND").length;
      toast(`IA: ${exactCount} exactos, ${partialCount} parciales, ${notFoundCount} no encontrados`, "success");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Error al analizar imagen");
    } finally {
      setAiLoading(false);
    }
  }, [products, store, toast]);

  const handleCancelAiReview = useCallback(() => {
    setAiState("idle");
    setAiAnalysis(null);
    setAiItems([]);
    setAiRawJsonIa(null);
    setAiError(null);
  }, []);

  const handleSupplierCreated = useCallback((supplier: SupplierOut) => {
    setSuppliers((prev) => [...prev, supplier]);
    store.setField("proveedorId", supplier.id);
    toast(`Proveedor "${supplier.nombre}" creado`, "success");
  }, [store, toast]);

  const handleCategoryCreated = useCallback((cat: CategoryOut) => {
    toast(`Categoría "${cat.nombre}" creada`, "success");
  }, [toast]);

  const handleProductCreated = useCallback((product: ProductOut) => {
    setProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
    toast(`Producto "${product.nombre}" creado`, "success");
  }, [toast]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    const state = useInvoiceFormStore.getState();
    if (!state.proveedorId) { toast("Selecciona un proveedor", "error"); return; }
    if (!state.numeroFactura.trim()) { toast("Ingresa el número de factura", "error"); return; }
    if (Number(state.tasa) <= 0) { toast("Ingresa la tasa de cambio", "error"); return; }
    if (state.lineItems.length === 0) { toast("Agrega al menos un producto a la factura", "error"); return; }

    store.setField("loading", true);
    try {
      const factura = await api.createInvoice(
        {
          proveedor_id: state.proveedorId,
          numero_factura: state.numeroFactura.trim(),
          tipo_documento: state.tipoDocumento,
          fecha_factura: state.fechaFactura || null,
          fecha_limite_pago: state.fechaLimitePago || null,
          observaciones: state.observaciones.trim() || null,
          moneda_principal: state.moneda,
          tasa_bs: Math.round(Number(state.tasa) * 100) / 100,
          aplica_iva: state.aplicaIva,
          detalles: state.lineItems.map((d) => ({
            producto_id: d.producto_id,
            tipo_empaque: d.tipo_empaque,
            cantidad: d.cantidad,
            costo_unitario_usd: d.costo_unitario_usd,
            costo_unitario_bs: d.costo_unitario_bs,
            unidades_por_caja: d.tipo_empaque === "CAJA" ? d.unidades_por_caja : null,
            tipo_iva: d.tipo_iva,
          })),
          obsequios: state.obsequioItems.map((o) => ({
            producto_id: o.producto_id,
            tipo_empaque: o.tipo_empaque,
            cantidad: o.cantidad,
            justificacion: o.justificacion.trim(),
            unidades_por_caja: o.tipo_empaque === "CAJA" ? o.unidades_por_caja : null,
          })),
        },
        state.invoiceFiles[0] || undefined,
        aiRawJsonIa ? { procesada_por_ia: true, raw_json_ia: aiRawJsonIa } : undefined,
      );
      toast(`Factura #${factura.numero_factura} registrada con éxito`, "success");
      store.reset();
      navigate(`/invoices/${factura.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al registrar factura", "error");
    } finally {
      store.setField("loading", false);
    }
  }, [store, aiRawJsonIa, toast, navigate]);

  return (
    <div>
      <PageHeader
        title={store.tipoDocumento === "FACTURA" ? "Nueva Factura" : "Nueva Nota de Entrega"}
        description={store.tipoDocumento === "FACTURA" ? "Registra una factura de proveedor y actualiza el inventario" : "Registra una nota de entrega de proveedor y actualiza el inventario"}
        actions={
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        }
      />

      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        <InvoiceInfoCard
          onSearchSuppliers={handleSearchSuppliers}
          onAnalyzeImage={handleAnalyzeImage}
          aiLoading={aiLoading}
          aiState={aiState}
        />

        <div className="rounded-xl border border-slate-200 bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide">
              Productos de la Factura
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-surface px-2.5 py-1.5 text-xs text-slate-500 hover:text-brand-blue hover:border-brand-blue transition-colors cursor-pointer"
                title="Crear nuevo producto"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                Producto
              </button>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-surface px-2.5 py-1.5 text-xs text-slate-500 hover:text-brand-blue hover:border-brand-blue transition-colors cursor-pointer"
                title="Crear nueva categoría"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                Categoría
              </button>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
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
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
              <Package className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-sm font-medium">Ningún producto agregado</p>
              <p className="text-xs mt-1">Busca un producto arriba y haz clic en "Agregar"</p>
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
            aiItems={aiItems}
            setAiItems={setAiItems}
            products={products}
            suppliers={suppliers}
            onSupplierCreated={handleSupplierCreated}
            onProductCreated={handleProductCreated}
            onCancel={handleCancelAiReview}
          />
        )}

        {aiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {aiError}
            <button
              type="button"
              onClick={() => { setAiError(null); handleAnalyzeImage(); }}
              className="ml-2 underline hover:text-red-900"
            >
              Reintentar
            </button>
          </div>
        )}

        <Textarea
          label="Observaciones"
          value={store.observaciones}
          onChange={(e) => store.setField("observaciones", e.target.value)}
          placeholder="Notas adicionales sobre la factura..."
          rows={3}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
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
      />
    </div>
  );
}
