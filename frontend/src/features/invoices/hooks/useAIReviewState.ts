import { useCallback, useState } from "react";
import type { ProductOut, SupplierOut, InvoiceAnalysisOut, ExtractedProduct, TipoEmpaque } from "@/types/api";
import { useInvoiceFormStore } from "../store/invoiceFormStore";
import { toCents, convertirCostos, calcularSubtotal } from "@/lib/money";
import { generateUUID } from "@/lib/utils";
import type { LineItem } from "../types";

export interface ReviewItem {
  extracted: ExtractedProduct;
  producto_id: number | null;
  producto_nombre: string;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  costo: number;
  unidades_por_caja: number;
}

export interface UseAIReviewStateProps {
  aiAnalysis: InvoiceAnalysisOut;
  products: ProductOut[];
  onSupplierCreated: (supplier: SupplierOut) => void;
  onProductCreated: (product: ProductOut) => void;
  onCancel: () => void;
}

export function useAIReviewState({
  aiAnalysis,
  products,
  onSupplierCreated,
  onProductCreated,
  onCancel,
}: UseAIReviewStateProps) {
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
      if (item && item.producto_id) {
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
  const resolvedCount = items.filter((i) => i.producto_id !== null).length;

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

  return {
    state: {
      proveedorNombre,
      setProveedorNombre,
      proveedorId,
      setProveedorId,
      numeroFactura,
      setNumeroFactura,
      fechaFactura,
      setFechaFactura,
      fechaLimitePago,
      setFechaLimitePago,
      moneda,
      setMoneda,
      tipoDocumento,
      setTipoDocumento,
      supplierModalOpen,
      setSupplierModalOpen,
      productModalOpen,
      setProductModalOpen,
      productModalNombre,
      setProductModalNombre,
      items,
    },
    computed: {
      allAccepted,
      resolvedCount,
    },
    actions: {
      handleSupplierCreated,
      handleProductCreated,
      handleItemProductSelect,
      handleUpdateItem,
      handleToggleEmpaque,
      handleAcceptAll,
    },
  };
}
