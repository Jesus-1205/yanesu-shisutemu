import { describe, it, expect, beforeEach } from "vitest";
import { usePaymentFormStore } from "../../../features/invoices/store/paymentFormStore";
import { useInvoiceFiltersStore } from "../../../features/invoices/store/invoiceFiltersStore";

// ── paymentFormStore ──────────────────────────────────────────────────────────

describe("paymentFormStore - estado inicial", () => {
  beforeEach(() => {
    usePaymentFormStore.getState().reset();
  });

  it("arranca con todos los campos en sus valores iniciales", () => {
    const s = usePaymentFormStore.getState();
    expect(s.selectedMethodId).toBeNull();
    expect(s.monto).toBe("");
    expect(s.referencia).toBe("");
    expect(s.comprobantes).toHaveLength(0);
    expect(s.observaciones).toBe("");
    expect(s.incluirMora).toBe(false);
  });
});

describe("paymentFormStore - mutaciones individuales", () => {
  beforeEach(() => {
    usePaymentFormStore.getState().reset();
  });

  it("setMethod establece el método y limpia monto e incluirMora", () => {
    usePaymentFormStore.setState({ monto: "100", incluirMora: true });
    usePaymentFormStore.getState().setMethod(3);
    const s = usePaymentFormStore.getState();
    expect(s.selectedMethodId).toBe(3);
    expect(s.monto).toBe("");
    expect(s.incluirMora).toBe(false);
  });

  it("setMethod con null limpia el método seleccionado", () => {
    usePaymentFormStore.getState().setMethod(5);
    usePaymentFormStore.getState().setMethod(null);
    expect(usePaymentFormStore.getState().selectedMethodId).toBeNull();
  });

  it("setMonto actualiza solo el campo monto", () => {
    usePaymentFormStore.getState().setMonto("250.00");
    const s = usePaymentFormStore.getState();
    expect(s.monto).toBe("250.00");
    expect(s.referencia).toBe("");
  });

  it("setReferencia actualiza solo el campo referencia", () => {
    usePaymentFormStore.getState().setReferencia("REF-2025-001");
    expect(usePaymentFormStore.getState().referencia).toBe("REF-2025-001");
  });

  it("setObservaciones actualiza el campo observaciones", () => {
    usePaymentFormStore.getState().setObservaciones("Pago parcial en USD");
    expect(usePaymentFormStore.getState().observaciones).toBe("Pago parcial en USD");
  });

  it("setField es genérico y actualiza cualquier campo del estado", () => {
    usePaymentFormStore.getState().setField("incluirMora", true);
    expect(usePaymentFormStore.getState().incluirMora).toBe(true);
    usePaymentFormStore.getState().setField("monto", "99.99");
    expect(usePaymentFormStore.getState().monto).toBe("99.99");
  });
});

describe("paymentFormStore - comprobantes", () => {
  beforeEach(() => {
    usePaymentFormStore.getState().reset();
  });

  it("addComprobantes añade archivos al array existente", () => {
    const f1 = new File(["a"], "comp1.jpg", { type: "image/jpeg" });
    const f2 = new File(["b"], "comp2.pdf", { type: "application/pdf" });
    usePaymentFormStore.getState().addComprobantes([f1]);
    usePaymentFormStore.getState().addComprobantes([f2]);
    const comps = usePaymentFormStore.getState().comprobantes;
    expect(comps).toHaveLength(2);
    expect(comps[0].name).toBe("comp1.jpg");
    expect(comps[1].name).toBe("comp2.pdf");
  });

  it("addComprobantes puede agregar múltiples archivos a la vez", () => {
    const files = [
      new File(["x"], "a.jpg"),
      new File(["y"], "b.jpg"),
      new File(["z"], "c.jpg"),
    ];
    usePaymentFormStore.getState().addComprobantes(files);
    expect(usePaymentFormStore.getState().comprobantes).toHaveLength(3);
  });

  it("removeComprobante elimina el archivo por índice", () => {
    const f1 = new File(["a"], "comp1.jpg");
    const f2 = new File(["b"], "comp2.jpg");
    const f3 = new File(["c"], "comp3.jpg");
    usePaymentFormStore.getState().addComprobantes([f1, f2, f3]);
    usePaymentFormStore.getState().removeComprobante(1);
    const comps = usePaymentFormStore.getState().comprobantes;
    expect(comps).toHaveLength(2);
    expect(comps[0].name).toBe("comp1.jpg");
    expect(comps[1].name).toBe("comp3.jpg");
  });

  it("removeComprobante del primer índice preserva el resto", () => {
    const files = [new File(["a"], "first.jpg"), new File(["b"], "second.jpg")];
    usePaymentFormStore.getState().addComprobantes(files);
    usePaymentFormStore.getState().removeComprobante(0);
    expect(usePaymentFormStore.getState().comprobantes[0].name).toBe("second.jpg");
  });

  it("reset vacía los comprobantes junto al resto del estado", () => {
    usePaymentFormStore.getState().addComprobantes([new File(["a"], "a.jpg")]);
    usePaymentFormStore.getState().setMonto("100");
    usePaymentFormStore.getState().setMethod(2);
    usePaymentFormStore.getState().reset();
    const s = usePaymentFormStore.getState();
    expect(s.comprobantes).toHaveLength(0);
    expect(s.monto).toBe("");
    expect(s.selectedMethodId).toBeNull();
  });
});

describe("paymentFormStore - flujo de pago de factura simulado", () => {
  beforeEach(() => {
    usePaymentFormStore.getState().reset();
  });

  it("flujo completo: seleccionar método → ingresar monto → agregar comprobante → confirmar", () => {
    const store = usePaymentFormStore.getState();

    // 1. El usuario selecciona el método de pago "Transferencia USD" (id=2)
    store.setMethod(2);
    expect(usePaymentFormStore.getState().selectedMethodId).toBe(2);

    // 2. Ingresa el monto
    usePaymentFormStore.getState().setMonto("500.00");
    expect(usePaymentFormStore.getState().monto).toBe("500.00");

    // 3. Ingresa la referencia bancaria
    usePaymentFormStore.getState().setReferencia("0102-0203-5000");
    expect(usePaymentFormStore.getState().referencia).toBe("0102-0203-5000");

    // 4. Adjunta comprobante
    const comp = new File(["img"], "recibo.jpg", { type: "image/jpeg" });
    usePaymentFormStore.getState().addComprobantes([comp]);
    expect(usePaymentFormStore.getState().comprobantes).toHaveLength(1);

    // 5. Construye el payload de InvoicePaymentCreate
    const s = usePaymentFormStore.getState();
    const payload = {
      metodo_pago_id: s.selectedMethodId,
      monto_usd: parseFloat(s.monto),
      referencia: s.referencia,
      observaciones: s.observaciones || undefined,
    };

    expect(payload.metodo_pago_id).toBe(2);
    expect(payload.monto_usd).toBe(500);
    expect(payload.referencia).toBe("0102-0203-5000");
    expect(payload.observaciones).toBeUndefined();
  });

  it("incluirMora se puede activar independientemente del monto", () => {
    usePaymentFormStore.getState().setMethod(1);
    usePaymentFormStore.getState().setField("incluirMora", true);
    usePaymentFormStore.getState().setMonto("1200.50");
    const s = usePaymentFormStore.getState();
    expect(s.incluirMora).toBe(true);
    expect(s.monto).toBe("1200.50");
    expect(s.selectedMethodId).toBe(1);
  });
});

// ── invoiceFiltersStore ───────────────────────────────────────────────────────

describe("invoiceFiltersStore - estado inicial", () => {
  beforeEach(() => {
    useInvoiceFiltersStore.getState().clearAll();
  });

  it("arranca con todos los campos en sus valores por defecto", () => {
    const s = useInvoiceFiltersStore.getState();
    expect(s.search).toBe("");
    expect(s.proveedorId).toBeNull();
    expect(s.tipoDocumento).toBe("");
    expect(s.estadoPago).toBe("");
    expect(s.sortBy).toBe("");
    expect(s.fechaDesde).toBe("");
    expect(s.fechaHasta).toBe("");
    expect(s.page).toBe(1);
  });
});

describe("invoiceFiltersStore - setField", () => {
  beforeEach(() => {
    useInvoiceFiltersStore.getState().clearAll();
  });

  it("actualiza el campo search", () => {
    useInvoiceFiltersStore.getState().setField("search", "Distribuidora Caracas");
    expect(useInvoiceFiltersStore.getState().search).toBe("Distribuidora Caracas");
  });

  it("actualiza proveedorId con un número", () => {
    useInvoiceFiltersStore.getState().setField("proveedorId", 7);
    expect(useInvoiceFiltersStore.getState().proveedorId).toBe(7);
  });

  it("actualiza tipoDocumento", () => {
    useInvoiceFiltersStore.getState().setField("tipoDocumento", "FACTURA");
    expect(useInvoiceFiltersStore.getState().tipoDocumento).toBe("FACTURA");
  });

  it("actualiza estadoPago", () => {
    useInvoiceFiltersStore.getState().setField("estadoPago", "PENDIENTE");
    expect(useInvoiceFiltersStore.getState().estadoPago).toBe("PENDIENTE");
  });

  it("actualiza rango de fechas independientemente", () => {
    useInvoiceFiltersStore.getState().setField("fechaDesde", "2025-01-01");
    useInvoiceFiltersStore.getState().setField("fechaHasta", "2025-06-30");
    const s = useInvoiceFiltersStore.getState();
    expect(s.fechaDesde).toBe("2025-01-01");
    expect(s.fechaHasta).toBe("2025-06-30");
  });

  it("actualiza page a un número mayor que 1", () => {
    useInvoiceFiltersStore.getState().setField("page", 5);
    expect(useInvoiceFiltersStore.getState().page).toBe(5);
  });

  it("múltiples setField acumulan cambios sin borrar los anteriores", () => {
    useInvoiceFiltersStore.getState().setField("search", "RON");
    useInvoiceFiltersStore.getState().setField("estadoPago", "PAGADO");
    useInvoiceFiltersStore.getState().setField("page", 3);
    const s = useInvoiceFiltersStore.getState();
    expect(s.search).toBe("RON");
    expect(s.estadoPago).toBe("PAGADO");
    expect(s.page).toBe(3);
    expect(s.tipoDocumento).toBe("");
  });
});

describe("invoiceFiltersStore - clearAll", () => {
  beforeEach(() => {
    useInvoiceFiltersStore.getState().clearAll();
  });

  it("resetea todos los campos al estado inicial", () => {
    useInvoiceFiltersStore.getState().setField("search", "test");
    useInvoiceFiltersStore.getState().setField("proveedorId", 3);
    useInvoiceFiltersStore.getState().setField("estadoPago", "PENDIENTE");
    useInvoiceFiltersStore.getState().setField("page", 4);
    useInvoiceFiltersStore.getState().clearAll();
    const s = useInvoiceFiltersStore.getState();
    expect(s.search).toBe("");
    expect(s.proveedorId).toBeNull();
    expect(s.estadoPago).toBe("");
    expect(s.page).toBe(1);
  });

  it("clearAll no afecta los campos que ya estaban vacíos", () => {
    useInvoiceFiltersStore.getState().setField("sortBy", "fecha");
    useInvoiceFiltersStore.getState().clearAll();
    expect(useInvoiceFiltersStore.getState().sortBy).toBe("");
  });
});

describe("invoiceFiltersStore - flujo de filtrado de facturas simulado", () => {
  beforeEach(() => {
    useInvoiceFiltersStore.getState().clearAll();
  });

  it("construye los parámetros de la query API a partir del estado", () => {
    const store = useInvoiceFiltersStore.getState();
    store.setField("search", "F-2025");
    store.setField("proveedorId", 2);
    store.setField("tipoDocumento", "NOTA_DEBITO");
    store.setField("estadoPago", "PENDIENTE");
    store.setField("fechaDesde", "2025-01-01");
    store.setField("fechaHasta", "2025-03-31");
    store.setField("sortBy", "monto_total_usd");
    store.setField("page", 2);

    const s = useInvoiceFiltersStore.getState();

    const apiParams = {
      search: s.search || undefined,
      proveedor_id: s.proveedorId ?? undefined,
      tipo_documento: s.tipoDocumento || undefined,
      estado_pago: s.estadoPago || undefined,
      fecha_desde: s.fechaDesde || undefined,
      fecha_hasta: s.fechaHasta || undefined,
      sort_by: s.sortBy || undefined,
      page: s.page,
      page_size: 20,
    };

    expect(apiParams.search).toBe("F-2025");
    expect(apiParams.proveedor_id).toBe(2);
    expect(apiParams.tipo_documento).toBe("NOTA_DEBITO");
    expect(apiParams.estado_pago).toBe("PENDIENTE");
    expect(apiParams.fecha_desde).toBe("2025-01-01");
    expect(apiParams.fecha_hasta).toBe("2025-03-31");
    expect(apiParams.sort_by).toBe("monto_total_usd");
    expect(apiParams.page).toBe(2);
  });

  it("campos vacíos se convierten en undefined (no se envían a la API)", () => {
    const s = useInvoiceFiltersStore.getState();
    const apiParams = {
      search: s.search || undefined,
      proveedor_id: s.proveedorId ?? undefined,
      tipo_documento: s.tipoDocumento || undefined,
    };
    expect(apiParams.search).toBeUndefined();
    expect(apiParams.proveedor_id).toBeUndefined();
    expect(apiParams.tipo_documento).toBeUndefined();
  });
});
