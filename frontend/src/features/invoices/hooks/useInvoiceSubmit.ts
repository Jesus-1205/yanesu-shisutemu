import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import { useInvoiceFormStore } from "../store/invoiceFormStore";

export interface UseInvoiceSubmitOptions {
  aiRawJsonIa: Record<string, unknown> | null;
  onSuccess?: () => void;
}

export function useInvoiceSubmit({ aiRawJsonIa, onSuccess }: UseInvoiceSubmitOptions) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const store = useInvoiceFormStore();

  const handleSubmit = useCallback(async () => {
    const state = useInvoiceFormStore.getState();
    if (!state.proveedorId) {
      toast("Selecciona un proveedor", "error");
      return;
    }
    if (!state.numeroFactura.trim()) {
      toast("Ingresa el número de factura", "error");
      return;
    }
    if (Number(state.tasa) <= 0) {
      toast("Ingresa la tasa de cambio", "error");
      return;
    }
    if (state.lineItems.length === 0) {
      toast("Agrega al menos un producto a la factura", "error");
      return;
    }

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
      onSuccess?.();
      navigate(`/invoices/${factura.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al registrar factura", "error");
    } finally {
      store.setField("loading", false);
    }
  }, [store, aiRawJsonIa, toast, navigate, onSuccess]);

  return {
    handleSubmit,
  };
}
