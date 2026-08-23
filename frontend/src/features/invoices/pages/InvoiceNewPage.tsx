import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Package, CirclePlus, ScanLine, CheckCircle2, AlertTriangle, XCircle, Loader2, X } from "lucide-react";
import { api } from "@/services/api";
import type { MonedaEnum, TipoEmpaque, ProductOut, SupplierOut, CategoryOut, InvoiceAnalysisOut, MatchedProduct } from "@/types/api";
import Button from "@/ui-components/Button";
import Combobox from "@/ui-components/Combobox";
import AsyncCombobox from "@/ui-components/AsyncCombobox";
import Textarea from "@/ui-components/Textarea";
import FileUpload from "@/ui-components/FileUpload";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Badge from "@/ui-components/Badge";
import { useToast } from "@/ui-components/Toast";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";
import CreateProductModal from "@/features/shared/components/CreateProductModal";
import { formatBs } from "@/lib/text";
import { calcularResumenFiscal } from "@/lib/iva";
import { toCents, convertirCostos, calcularSubtotal } from "@/lib/money";
import { getTodayInCaracas } from "@/lib/utils";

interface LineItem {
  key: string;
  producto_id: number;
  nombre: string;
  codigo_barra: string | null;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  costo_unitario_usd: number;
  costo_unitario_bs: number;
  subtotal_usd: number;
  subtotal_bs: number;
  unidades_por_caja: number;
  tipo_iva: "GRAVADO" | "EXENTO";
  costo_ingresado: number;
  moneda_ingreso: MonedaEnum;
}

interface AIAnalysisItem extends MatchedProduct {
  resolved_producto_id: number | null;
  resolved_nombre: string;
}

export default function InvoiceNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const uid = useId();
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<"FACTURA" | "NOTA_ENTREGA">("FACTURA");
  const [fechaFactura, setFechaFactura] = useState(getTodayInCaracas);
  const [observaciones, setObservaciones] = useState("");
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [aplicaIva, setAplicaIva] = useState(true);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalNombre, setSupplierModalNombre] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  // ── Estados para flujo IA (Human-in-the-Loop) ──────────────────────
  const [aiState, setAiState] = useState<"idle" | "analyzing" | "reviewing">("idle");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<InvoiceAnalysisOut | null>(null);
  const [aiItems, setAiItems] = useState<AIAnalysisItem[]>([]);
  const [aiRawJsonIa, setAiRawJsonIa] = useState<Record<string, unknown> | null>(null);
  const [selectedAiCurrency, setSelectedAiCurrency] = useState<"USD" | "BS">("USD");
  const [productModalForNew, setProductModalForNew] = useState<{ open: boolean; nombre: string; precio: number }>({ open: false, nombre: "", precio: 0 });

  const handleSupplierCreated = useCallback((supplier: SupplierOut) => {
    setSuppliers((prev) => [...prev, supplier]);
    setProveedorId(supplier.id);
    // Actualizar el estado del proveedor en el panel de revisión IA
    setAiAnalysis((prev) => prev ? {
      ...prev,
      proveedor: {
        id: supplier.id,
        nombre: supplier.nombre,
        match_status: "EXACT",
        confidence: 1.0,
      },
    } : prev);
    toast(`Proveedor "${supplier.nombre}" creado`, "success");
  }, [toast]);

  const handleCategoryCreated = useCallback((cat: CategoryOut) => {
    toast(`Categoría "${cat.nombre}" creada`, "success");
  }, [toast]);

  const handleProductCreated = useCallback((product: ProductOut) => {
    setProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
    // Si venía de un NOT_FOUND de IA, resolver el item
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
    setNewProductId(product.id);
    toast(`Producto "${product.nombre}" creado`, "success");
  }, [toast, productModalForNew]);

  const [moneda, setMoneda] = useState<MonedaEnum>("USD");
  const [tasa, setTasa] = useState("");

  // ── Funciones de manejo IA ──────────────────────────────────────────

  const handleAnalyzeImage = useCallback(async () => {
    if (invoiceFiles.length === 0) {
      setError("Sube una imagen primero para analizar con IA");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const result = await api.analyzeInvoice(invoiceFiles);

      // Auto-asignar proveedor si es EXACT
      if (result.proveedor.match_status === "EXACT") {
        setProveedorId(result.proveedor.id);
      }

      // Auto-asignar fecha y número de factura
      if (result.fecha_factura) {
        setFechaFactura(result.fecha_factura);
      }
      if (result.numero_factura) {
        setNumeroFactura(result.numero_factura);
      }

      // Inicializar items con resolved_producto_id
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
      setSelectedAiCurrency(result.moneda ?? "USD");
      setAiState("reviewing");

      // Contar estadísticas
      const exactCount = result.productos.filter((p) => p.match_status === "EXACT").length;
      const partialCount = result.productos.filter((p) => p.match_status === "PARTIAL").length;
      const notFoundCount = result.productos.filter((p) => p.match_status === "NOT_FOUND").length;

      toast(
        `IA: ${exactCount} exactos, ${partialCount} parciales, ${notFoundCount} no encontrados`,
        "success",
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Error al analizar imagen");
    } finally {
      setAiLoading(false);
    }
  }, [invoiceFiles, products, toast]);

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
  }, [products]);

  const handleAcceptAiItems = useCallback(() => {
    if (!aiAnalysis) return;

    // Validar que todos los items tengan producto resuelto
    const unresolved = aiItems.filter((i) => i.resolved_producto_id === null);
    if (unresolved.length > 0) {
      toast(`Hay ${unresolved.length} producto(s) sin resolver. Selecciona o crea los productos faltantes.`, "error");
      return;
    }

    // Aplicar la moneda seleccionada al formulario principal
    setMoneda(selectedAiCurrency);

    // Convertir aiItems a lineItems usando la moneda seleccionada
    const tasaNum = tasa === "" ? 0 : Number(tasa);
    const newLineItems: LineItem[] = aiItems.map((item) => {
      const prod = products.find((p) => p.id === item.resolved_producto_id);
      const precioUnitario = toCents(Number(item.precio_unitario));
      const costos = convertirCostos(precioUnitario, selectedAiCurrency, tasaNum);
      const unidadesPorCaja = prod?.unidades_por_caja ?? 1;

      return {
        key: crypto.randomUUID(),
        producto_id: item.resolved_producto_id!,
        nombre: item.resolved_nombre,
        codigo_barra: prod?.codigo_barra ?? null,
        tipo_empaque: item.tipo_empaque,
        cantidad: item.cantidad,
        costo_unitario_usd: costos.usd,
        costo_unitario_bs: costos.bs,
        subtotal_usd: calcularSubtotal(item.cantidad, costos.usd),
        subtotal_bs: calcularSubtotal(item.cantidad, costos.bs),
        unidades_por_caja: unidadesPorCaja,
        tipo_iva: prod?.tipo_iva ?? "GRAVADO",
        costo_ingresado: precioUnitario,
        moneda_ingreso: selectedAiCurrency,
      };
    });

    setLineItems(newLineItems);
    setAiState("idle");
    setAiAnalysis(null);
    setAiItems([]);
    toast(`${newLineItems.length} productos agregados desde IA`, "success");
  }, [aiAnalysis, aiItems, products, selectedAiCurrency, tasa, toast]);

  const handleCancelAiReview = useCallback(() => {
    setAiState("idle");
    setAiAnalysis(null);
    setAiItems([]);
    setAiRawJsonIa(null);
    setAiError(null);
  }, []);

  const handleDiscardAiItem = useCallback((index: number) => {
    setAiItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAiItemEdit = useCallback((index: number, field: "cantidad" | "precio_unitario", value: string) => {
    setAiItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === "cantidad") {
        item.cantidad = value === "" ? 0 : parseInt(value, 10) || 0;
      } else {
        item.precio_unitario = toCents(parseFloat(value) || 0);
      }
      updated[index] = item;
      return updated;
    });
  }, []);

  const handleOpenCreateProduct = useCallback((nombre: string, precio: number) => {
    if (selectedAiCurrency === "BS" && (tasa === "" || Number(tasa) <= 0)) {
      toast("Ingresa la tasa BCV antes de crear un producto desde una factura en BS", "error");
      return;
    }
    setProductModalForNew({ open: true, nombre, precio });
  }, [selectedAiCurrency, tasa]);

  const [newProductId, setNewProductId] = useState<number | null>(null);
  const [newTipoEmpaque, setNewTipoEmpaque] = useState<TipoEmpaque>("CAJA");
  const [newCantidad, setNewCantidad] = useState("1");
  const [newCostoPrimario, setNewCostoPrimario] = useState("");
  const [newUnidadesPorCaja, setNewUnidadesPorCaja] = useState("");

  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

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

  const esBs = moneda === "BS";

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === newProductId),
    [newProductId, products],
  );

  const nCostoPrim = newCostoPrimario === "" ? 0 : Number(newCostoPrimario);
  const nTasa = tasa === "" ? 0 : Number(tasa);
  const nCajas = newCantidad === "" ? 0 : Number(newCantidad);
  const nUndsCaja = newUnidadesPorCaja === "" ? 0 : Number(newUnidadesPorCaja);

  const newCostoSecundario = useMemo(() => {
    const costos = convertirCostos(nCostoPrim, moneda, nTasa);
    return esBs ? costos.usd : costos.bs;
  }, [esBs, nCostoPrim, nTasa, moneda]);

  const handleProductSelect = useCallback((val: string | number | null) => {
    const id = val ? Number(val) : null;
    setNewProductId(id);
    if (id) {
      const prod = products.find((p) => p.id === id);
      if (prod) setNewUnidadesPorCaja(String(prod.unidades_por_caja));
    } else {
      setNewUnidadesPorCaja("");
    }
  }, [products]);

  const canAdd = newProductId !== null && nCajas > 0 && nCostoPrim > 0 && nTasa > 0 && (newTipoEmpaque === "UNIDAD" || nUndsCaja > 0);

  useEffect(() => {
    if (nTasa <= 0) return;
    setLineItems((prev) =>
      prev.map((item) => {
        const costos = convertirCostos(item.costo_ingresado, item.moneda_ingreso, nTasa);
        return {
          ...item,
          costo_unitario_usd: costos.usd,
          costo_unitario_bs: costos.bs,
          subtotal_usd: calcularSubtotal(item.cantidad, costos.usd),
          subtotal_bs: calcularSubtotal(item.cantidad, costos.bs),
        };
      })
    );
  }, [nTasa]);

  const handleAddLine = useCallback(() => {
    if (!canAdd || !selectedProduct) return;
    const costo_ingresado = nCostoPrim;
    const moneda_ingreso = moneda;
    const costos = convertirCostos(costo_ingresado, moneda, nTasa);
    const unidadesPorCaja = newTipoEmpaque === "CAJA" ? nUndsCaja : selectedProduct.unidades_por_caja;
    const item: LineItem = {
      key: crypto.randomUUID(),
      producto_id: newProductId!,
      nombre: selectedProduct.nombre,
      codigo_barra: selectedProduct.codigo_barra,
      tipo_empaque: newTipoEmpaque,
      cantidad: nCajas,
      costo_unitario_usd: costos.usd,
      costo_unitario_bs: costos.bs,
      subtotal_usd: calcularSubtotal(nCajas, costos.usd),
      subtotal_bs: calcularSubtotal(nCajas, costos.bs),
      unidades_por_caja: unidadesPorCaja,
      tipo_iva: selectedProduct.tipo_iva,
      costo_ingresado,
      moneda_ingreso,
    };
    setLineItems((prev) => [...prev, item]);
    setNewProductId(null);
    setNewCantidad("1");
    setNewCostoPrimario("");
    setNewUnidadesPorCaja("");
  }, [canAdd, selectedProduct, esBs, newProductId, nCajas, nCostoPrim, nTasa, nUndsCaja, moneda, newTipoEmpaque]);

  const handleRemoveLine = useCallback((key: string) => {
    setLineItems((prev) => prev.filter((d) => d.key !== key));
  }, []);

  const total_usd = useMemo(
    () => Math.round(lineItems.reduce((acc, d) => acc + d.subtotal_usd, 0) * 100) / 100,
    [lineItems],
  );
  const total_bs = useMemo(
    () => Math.round(lineItems.reduce((acc, d) => acc + d.subtotal_bs, 0) * 100) / 100,
    [lineItems],
  );

  const ivaBreakdown = useMemo(() => {
    let totalUnidades = 0;
    for (const item of lineItems) {
      totalUnidades += item.tipo_empaque === "CAJA"
        ? item.cantidad * item.unidades_por_caja
        : item.cantidad;
    }
    const resumen = calcularResumenFiscal(
      lineItems.map(item => ({
        subtotal_usd: item.subtotal_usd,
        subtotal_bs: item.subtotal_bs,
        tipo_iva: item.tipo_iva,
      })),
      moneda,
      aplicaIva,
    );
    return { ...resumen, totalUnidades };
  }, [lineItems, moneda, aplicaIva]);

  const handleSubmit = async () => {
    setError(null);
    if (!proveedorId) { setError("Selecciona un proveedor"); return; }
    if (!numeroFactura.trim()) { setError("Ingresa el número de factura"); return; }
    if (nTasa <= 0) { toast("Ingresa la tasa de cambio", "error"); return; }
    if (lineItems.length === 0) { setError("Agrega al menos un producto a la factura"); return; }

    setLoading(true);
    try {
      const factura = await api.createInvoice(
        {
          proveedor_id: proveedorId,
          numero_factura: numeroFactura.trim(),
          tipo_documento: tipoDocumento,
          fecha_factura: fechaFactura || null,
          observaciones: observaciones.trim() || null,
          moneda_principal: moneda,
          tasa_bs: Math.round(nTasa * 100) / 100,
          aplica_iva: aplicaIva,
          detalles: lineItems.map((d) => ({
            producto_id: d.producto_id,
            tipo_empaque: d.tipo_empaque,
            cantidad: d.cantidad,
            costo_unitario_usd: d.costo_unitario_usd,
            costo_unitario_bs: d.costo_unitario_bs,
            unidades_por_caja: d.tipo_empaque === "CAJA" ? d.unidades_por_caja : null,
          })),
        },
        invoiceFiles[0] || undefined,
        aiRawJsonIa ? { procesada_por_ia: true, raw_json_ia: aiRawJsonIa } : undefined,
      );
      toast(`Factura #${factura.numero_factura} registrada con éxito`, "success");
      navigate(`/invoices/${factura.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar factura");
    } finally {
      setLoading(false);
    }
  };

  const labelBase = "block text-xs font-medium text-slate-700 mb-1";
  const inputBase =
    "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
  const inputReadOnly = "w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500";
  const cardBase = "rounded-xl border border-slate-200 bg-surface p-5 space-y-4";
  const fid = (name: string) => `${uid}-${name}`;

  return (
    <div>
      <PageHeader
        title={tipoDocumento === "FACTURA" ? "Nueva Factura" : "Nueva Nota de Entrega"}
        description={tipoDocumento === "FACTURA" ? "Registra una factura de proveedor y actualiza el inventario" : "Registra una nota de entrega de proveedor y actualiza el inventario"}
        actions={
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={() => setError(null)}>{error}</ErrorBanner>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* ─── Card: Información de la Factura ───────────────────── */}
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
                    onClick={() => setTipoDocumento("FACTURA")}
                    className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                      tipoDocumento === "FACTURA"
                        ? "bg-brand-blue text-white"
                        : "bg-surface text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Factura
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoDocumento("NOTA_ENTREGA")}
                    className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                      tipoDocumento === "NOTA_ENTREGA"
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
                    value={proveedorId}
                    onChange={(val) => setProveedorId(val as number | null)}
                    onSearch={handleSearchSuppliers}
                    placeholder="Buscar proveedor..."
                    allowClear={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setSupplierModalNombre(""); setSupplierModalOpen(true); }}
                  className="shrink-0 h-10 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-surface px-3 text-sm text-slate-500 hover:text-brand-blue hover:border-brand-blue transition-colors cursor-pointer"
                  title="Crear nuevo proveedor"
                >
                  <CirclePlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo</span>
                </button>
              </div>
              <div>
                <label htmlFor={fid("numero")} className={labelBase}>Número de Factura</label>
                <input
                  id={fid("numero")}
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
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
                  value={fechaFactura}
                  onChange={(e) => setFechaFactura(e.target.value)}
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
                    onClick={() => setMoneda("USD")}
                    className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                      moneda === "USD"
                        ? "bg-brand-blue text-white"
                        : "bg-surface text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    USD $
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoneda("BS")}
                    className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                      moneda === "BS"
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
                <input
                  id={fid("tasa")}
                  type="number"
                  step="0.01"
                  min={0}
                  value={tasa}
                  onChange={(e) => setTasa(e.target.value)}
                  placeholder="0.00"
                  autoComplete="off"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelBase}>¿La factura incluye IVA?</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAplicaIva(true)}
                    disabled={moneda === "USD"}
                    className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                      aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                    } ${moneda === "USD" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Con IVA
                  </button>
                  <button
                    type="button"
                    onClick={() => setAplicaIva(false)}
                    disabled={moneda === "USD"}
                    className={`flex-1 h-10 text-sm font-medium transition-colors cursor-pointer ${
                      !aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
                    } ${moneda === "USD" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Sin IVA
                  </button>
                </div>
                {moneda === "USD" && (
                  <p className="text-[10px] text-slate-400 mt-0.5">El IVA solo aplica a facturas en bolívares</p>
                )}
              </div>
              <div>
                <label className={labelBase}>Archivos de Factura (imagen o PDF)</label>
                <FileUpload
                  accept="image/*,.pdf"
                  maxSize={10 * 1024 * 1024}
                  onFilesChange={(files) => setInvoiceFiles(files)}
                />
                {invoiceFiles.length > 0 && aiState === "idle" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeImage}
                    disabled={aiLoading}
                    className="mt-2 gap-1.5"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ScanLine className="w-4 h-4" />
                    )}
                    {aiLoading ? "Analizando..." : "Leer con IA"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Card: Productos ───────────────────────────────────── */}
        <div className={cardBase}>
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
                <CirclePlus className="w-3.5 h-3.5" />
                Producto
              </button>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-surface px-2.5 py-1.5 text-xs text-slate-500 hover:text-brand-blue hover:border-brand-blue transition-colors cursor-pointer"
                title="Crear nueva categoría"
              >
                <CirclePlus className="w-3.5 h-3.5" />
                Categoría
              </button>
              <Badge variant="info">{lineItems.length} item{lineItems.length !== 1 ? "s" : ""}</Badge>
            </div>
          </div>

          {/* Formulario de Entrada (Input Row) en Card distintiva */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-4">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Agregar Ítem
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
              <div className="col-span-2 sm:col-span-3 lg:col-span-2">
                <AsyncCombobox
                  label="Buscar producto"
                  value={newProductId}
                  onChange={handleProductSelect}
                  onSearch={handleSearchProducts}
                  placeholder="Buscar producto por nombre o código..."
                  allowClear
                  clearLabel="Limpiar"
                />
              </div>
              <div>
                <label htmlFor={fid("cajas")} className={labelBase}>{newTipoEmpaque === "CAJA" ? "Cajas" : "Unids"}</label>
<input
                id={fid("cajas")}
                type="number"
                min={1}
                value={newCantidad}
                onChange={(e) => setNewCantidad(e.target.value)}
                autoComplete="off"
                className={inputBase}
              />
              </div>
              <div>
                <label htmlFor={fid("costo-prim")} className={labelBase}>
                  {newTipoEmpaque === "CAJA" ? "$/Caja" : "$/Unid"} <span className="text-slate-400 font-normal">({esBs ? "Bs" : "USD"})</span>
                </label>
<input
                id={fid("costo-prim")}
                type="number"
                min={0}
                step="0.01"
                value={newCostoPrimario}
                onChange={(e) => setNewCostoPrimario(e.target.value)}
                autoComplete="off"
                className={inputBase}
                placeholder="0.00"
              />
              {newTipoEmpaque === "CAJA" && nUndsCaja > 0 && nCostoPrim > 0 && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  = ${(nCostoPrim / nUndsCaja).toFixed(2)} por unidad ({nUndsCaja} unds/caja)
                </p>
              )}
              </div>
              <div>
                <label htmlFor={fid("costo-sec")} className={labelBase}>
                  {esBs ? "USD" : "Bs"} <span className="text-slate-400 font-normal">calc.</span>
                </label>
                <input
                  id={fid("costo-sec")}
                  type="text"
                  value={newCostoSecundario > 0 ? (esBs ? `$${newCostoSecundario.toFixed(2)}` : `Bs. ${formatBs(newCostoSecundario)}`) : "—"}
                  className={`${inputReadOnly} cursor-not-allowed text-slate-400 font-mono text-xs text-center`}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  autoComplete="off"
                  placeholder="—"
                />
              </div>
              <div>
                <label className={labelBase}>Empaque</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden h-10">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTipoEmpaque("CAJA");
                      if (selectedProduct) setNewUnidadesPorCaja(String(selectedProduct.unidades_por_caja));
                    }}
                    className={`flex-1 text-xs font-medium transition-colors cursor-pointer ${
                      newTipoEmpaque === "CAJA"
                        ? "bg-brand-blue text-white"
                        : "bg-surface text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Caja
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTipoEmpaque("UNIDAD");
                      setNewUnidadesPorCaja("");
                    }}
                    className={`flex-1 text-xs font-medium transition-colors cursor-pointer ${
                      newTipoEmpaque === "UNIDAD"
                        ? "bg-brand-blue text-white"
                        : "bg-surface text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Unid
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="accent"
                  onClick={handleAddLine}
                  disabled={!canAdd}
                  className="w-full h-10 shadow-sm font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Agregar</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Items table */}
          {lineItems.length > 0 ? (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                      <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3">Producto</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3">Código</th>
                      <th className="text-center text-xs font-medium uppercase tracking-wider px-4 py-3">Tipo</th>
                      <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">Cant</th>
                      <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">$/Unid</th>
                      <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">USD</th>
                      <th className="text-right text-xs font-medium uppercase tracking-wider px-4 py-3">Bs.</th>
                      <th className="text-center text-xs font-medium uppercase tracking-wider px-3 py-3 w-16">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-surface">
                    {lineItems.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-text-main font-medium max-w-[220px] truncate">
                          {item.nombre}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {item.codigo_barra ? (
                            item.codigo_barra
                          ) : (
                            <span className="text-slate-300 font-light">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.tipo_empaque === "CAJA"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {item.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                            </span>
                            {item.tipo_empaque === "CAJA" && item.unidades_por_caja > 1 && (
                              <span className="text-[10px] text-slate-400 mt-0.5">{item.unidades_por_caja} unds/caja</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-text-main tabular-nums">
                          {item.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right text-text-main font-mono text-xs">
                          <div>${item.costo_unitario_usd.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400">
                            /{item.tipo_empaque === "CAJA" ? "caja" : "und"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-text-main tabular-nums">
                          ${item.subtotal_usd.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-text-main tabular-nums">
                          Bs. {formatBs(item.subtotal_bs)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(item.key)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                            aria-label={`Eliminar ${item.nombre}`}
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 border-t-2 border-slate-200 font-semibold text-text-main">
                      <td className="px-4 py-3.5">Totales</td>
                      <td />
                      <td />
                      <td className="px-4 py-3.5 text-right tabular-nums text-xs">
                        {ivaBreakdown.totalUnidades} unds
                      </td>
                      <td />
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        ${total_usd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        Bs. {formatBs(total_bs)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bloque Resumen de Totales (Desglose Fiscal y Final) en Panel Dedicado */}
              <div className="flex justify-end">
                <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Resumen Fiscal y Total
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Exento</span>
                      {esBs ? (
                        <span className="font-mono text-xs sm:text-sm">Bs. {formatBs(ivaBreakdown.exento)}</span>
                      ) : (
                        <span className="font-mono text-xs sm:text-sm">${ivaBreakdown.exento.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Base imponible</span>
                      {esBs ? (
                        <span className="font-mono text-xs sm:text-sm">Bs. {formatBs(ivaBreakdown.base_imponible)}</span>
                      ) : (
                        <span className="font-mono text-xs sm:text-sm">${ivaBreakdown.base_imponible.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>IVA (16%)</span>
                      {esBs ? (
                        <span className="font-mono text-xs sm:text-sm">Bs. {formatBs(ivaBreakdown.iva)}</span>
                      ) : (
                        <span className="font-mono text-xs sm:text-sm">${ivaBreakdown.iva.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    {esBs ? (
                      <>
                        <div className="flex justify-between items-center font-bold text-text-main text-base">
                          <span>Total</span>
                          <span className="font-mono text-lg">Bs. {formatBs(ivaBreakdown.total)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-text-main text-base">
                          <span>Total USD</span>
                          <span className="font-mono text-lg">${total_usd.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center font-bold text-text-main text-base">
                          <span>Total USD</span>
                          <span className="font-mono text-lg">${ivaBreakdown.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-text-main text-base">
                          <span>Total Bs.</span>
                          <span className="font-mono text-lg">Bs. {formatBs(total_bs)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
              <Package className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-sm font-medium">Ningún producto agregado</p>
              <p className="text-xs mt-1">Busca un producto arriba y haz clic en "Agregar"</p>
            </div>
          )}
        </div>

        {/* ─── Panel de Revisión IA ─────────────────────────────── */}
        {aiState === "reviewing" && aiAnalysis && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-2">
                <ScanLine className="w-4 h-4" />
                Revisión de Factura (IA)
              </h3>
              <Button variant="ghost" size="sm" onClick={handleCancelAiReview}>
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
                        setProveedorId(val as number);
                        const selected = suppliers.find((s) => s.id === val);
                        if (selected) {
                          setAiAnalysis((prev) => prev ? {
                            ...prev,
                            proveedor: {
                              id: selected.id,
                              nombre: selected.nombre,
                              match_status: "EXACT",
                              confidence: 1.0,
                            },
                          } : prev);
                        }
                      }
                    }}
                    onSearch={handleSearchSuppliers}
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
                    onChange={(e) => setTasa(e.target.value)}
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
                            onChange={(e) => handleAiItemEdit(idx, "cantidad", e.target.value)}
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
                              onChange={(e) => handleAiItemEdit(idx, "precio_unitario", e.target.value)}
                              min="0"
                              step="0.01"
                              autoComplete="off"
                              className="w-28 h-8 text-right text-sm font-mono rounded border border-slate-300 bg-surface px-1 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                            />
                            {selectedAiCurrency === "BS" && (
                              <span className="text-[10px] text-slate-400">
                                {tasa !== "" && Number(tasa) > 0
                                  ? `$${(Number(item.precio_unitario) / Number(tasa)).toFixed(2)}`
                                  : `$${Number(item.precio_unitario).toFixed(2)}`
                                }
                              </span>
                            )}
                            {selectedAiCurrency !== "BS" && (
                              <span className="text-[10px] text-slate-400">
                                {tasa !== "" && Number(tasa) > 0
                                  ? `${formatBs(Number(item.precio_unitario) * Number(tasa))} BS`
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
                                onClick={() => handleOpenCreateProduct(item.nombre_extraido, item.precio_unitario)}
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
                              onClick={() => handleOpenCreateProduct(item.nombre_extraido, item.precio_unitario)}
                              className="gap-1"
                            >
                              <CirclePlus className="w-3.5 h-3.5" />
                              Crear producto
                            </Button>
                          )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDiscardAiItem(idx)}
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
              <Button variant="accent" onClick={handleAcceptAiItems}>
                Aceptar y Agregar a Factura
              </Button>
            </div>
          </div>
        )}

        {/* Banner error IA */}
        {aiError && (
          <div className="mb-4">
            <ErrorBanner onRetry={() => { setAiError(null); handleAnalyzeImage(); }}>{aiError}</ErrorBanner>
          </div>
        )}

        {/* ─── Observaciones ─────────────────────────────────────── */}
        <Textarea
          label="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas adicionales sobre la factura..."
          rows={3}
        />

        {/* ─── Actions ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex-1" />
          <Button variant="accent" onClick={handleSubmit} loading={loading}>
            {tipoDocumento === "FACTURA" ? "Registrar Factura" : "Registrar Nota de Entrega"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            Cancelar
          </Button>
        </div>
      </div>

      <CreateSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
        initialNombre={supplierModalNombre}
      />
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
      <CreateProductModal
        open={productModalForNew.open}
        onClose={() => setProductModalForNew({ open: false, nombre: "", precio: 0 })}
        onCreated={handleProductCreated}
        initialNombre={productModalForNew.nombre}
        initialPrecio={productModalForNew.precio}
        initialMoneda={selectedAiCurrency}
        initialProveedorId={proveedorId}
        tasaBs={tasa === "" ? 0 : Number(tasa)}
      />
    </div>
  );
}
