import { describe, it, expect, beforeEach } from "vitest";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import type { LineItem } from "@/features/invoices/types";

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    producto_id: 1,
    nombre: "Producto base",
    codigo_barra: null,
    tipo_empaque: "CAJA" as const,
    cantidad: 1,
    unidades_por_caja: 12,
    tipo_iva: "GRAVADO" as const,
    costo_ingresado: 10,
    moneda_ingreso: "USD" as const,
    ...overrides,
  };
}

beforeEach(() => {
  useInvoiceFormStore.getState().reset();
});

// ── Simulación de factura completa con 10 ítems ───────────────────────────────

describe("invoiceFormStore - factura compleja: 10 ítems mixtos USD + tasa 46.5", () => {
  const TASA = 46.5;

  it("acumula 10 ítems en USD y los totales se calculan sin error de punto flotante", () => {
    useInvoiceFormStore.setState({ moneda: "USD", tasa: String(TASA) });

    const catalog = [
      { id: 1,  nombre: "Ron Añejo 1L",         costo: 12.50, cantidad: 5, iva: "GRAVADO" },
      { id: 2,  nombre: "Whisky 12Y 750ml",      costo: 38.00, cantidad: 2, iva: "GRAVADO" },
      { id: 3,  nombre: "Vodka Premium 1L",      costo: 22.75, cantidad: 3, iva: "GRAVADO" },
      { id: 4,  nombre: "Agua Mineral 1.5L",     costo: 0.80,  cantidad: 24, iva: "EXENTO" },
      { id: 5,  nombre: "Refresco Cola 2L",      costo: 1.20,  cantidad: 12, iva: "EXENTO" },
      { id: 6,  nombre: "Gin Botánico 700ml",    costo: 29.99, cantidad: 4, iva: "GRAVADO" },
      { id: 7,  nombre: "Tequila 750ml",         costo: 33.00, cantidad: 3, iva: "GRAVADO" },
      { id: 8,  nombre: "Cerveza Premium x24",   costo: 18.50, cantidad: 6, iva: "GRAVADO" },
      { id: 9,  nombre: "Jugo Natural 1L",       costo: 2.50,  cantidad: 10, iva: "EXENTO" },
      { id: 10, nombre: "Vino Tinto Reserva 1L", costo: 15.00, cantidad: 8, iva: "GRAVADO" },
    ] as const;

    for (const p of catalog) {
      useInvoiceFormStore.getState().addLineItem(makeItem({
        producto_id: p.id,
        nombre: p.nombre,
        costo_ingresado: p.costo,
        cantidad: p.cantidad,
        tipo_iva: p.iva,
      }));
    }

    const items = useInvoiceFormStore.getState().lineItems;
    expect(items).toHaveLength(10);

    // Verifica cada ítem individualmente
    items.forEach((item) => {
      // Todos los subtotales deben ser exactamente cantidad × costo (a 2 dec)
      const expectedSubtotalUsd = Math.round(item.cantidad * item.costo_unitario_usd * 100) / 100;
      expect(item.subtotal_usd).toBe(expectedSubtotalUsd);
      // El subtotal BS debe ser subtotal_usd × tasa (a 2 dec)
      const expectedSubtotalBs = Math.round(item.subtotal_usd * TASA * 100) / 100;
      expect(item.subtotal_bs).toBe(expectedSubtotalBs);
    });

    // Totales globales derivados agnosticos a UI
    const totalUsd = Math.round(items.reduce((s, i) => s + i.subtotal_usd, 0) * 100) / 100;
    const gravados = items.filter((i) => i.tipo_iva === "GRAVADO");
    const exentos  = items.filter((i) => i.tipo_iva === "EXENTO");

    // 5×12.5=62.5, 2×38=76, 3×22.75=68.25, 4×29.99=119.96, 3×33=99,
    // 6×18.5=111, 8×15=120 → gravados = 656.71
    const expectedGravados = 62.5 + 76 + 68.25 + 119.96 + 99 + 111 + 120;
    // 24×0.8=19.2, 12×1.2=14.4, 10×2.5=25 → exentos = 58.6
    const expectedExentos = 19.2 + 14.4 + 25;

    expect(Math.round(gravados.reduce((s, i) => s + i.subtotal_usd, 0) * 100) / 100)
      .toBeCloseTo(expectedGravados, 2);
    expect(Math.round(exentos.reduce((s, i) => s + i.subtotal_usd, 0) * 100) / 100)
      .toBeCloseTo(expectedExentos, 2);
    expect(totalUsd).toBeCloseTo(expectedGravados + expectedExentos, 2);
  });
});

// ── Simulación con moneda BS (compra a proveedor nacional) ────────────────────

describe("invoiceFormStore - factura en BS: conversión a USD", () => {
  it("5 ítems ingresados en BS se convierten correctamente a USD con tasa 46.5", () => {
    const TASA = 46.5;
    useInvoiceFormStore.setState({ moneda: "BS", tasa: String(TASA) });

    const itemsBS = [
      { costo: 581.25,  cantidad: 2 },  // 12.50 USD × 46.5 = 581.25 BS
      { costo: 1767.00, cantidad: 1 },  // 38.00 USD × 46.5 = 1767 BS
      { costo: 1057.88, cantidad: 3 },  // 22.75 USD × 46.5 = 1057.875 → 1057.88 BS
      { costo: 37.20,   cantidad: 24 }, // 0.80 USD × 46.5 = 37.2 BS (exento)
      { costo: 55.80,   cantidad: 12 }, // 1.20 USD × 46.5 = 55.8 BS (exento)
    ];

    for (const [i, p] of itemsBS.entries()) {
      useInvoiceFormStore.getState().addLineItem(makeItem({
        producto_id: i + 1,
        costo_ingresado: p.costo,
        cantidad: p.cantidad,
        moneda_ingreso: "BS",
        tipo_iva: i >= 3 ? "EXENTO" : "GRAVADO",
      }));
    }

    const items = useInvoiceFormStore.getState().lineItems;

    // Item 0: 581.25 BS → USD = 581.25/46.5 = 12.50 → subtotal_bs = 2*581.25 = 1162.5
    expect(items[0].costo_unitario_usd).toBe(12.5);
    expect(items[0].costo_unitario_bs).toBe(581.25);
    expect(items[0].subtotal_bs).toBe(1162.5);
    expect(items[0].subtotal_usd).toBe(25); // 1162.5 / 46.5 = 25

    // Item 1: 1767 BS / 46.5 = 38.00 USD exacto
    expect(items[1].costo_unitario_usd).toBe(38);
    expect(items[1].subtotal_bs).toBe(1767);
    expect(items[1].subtotal_usd).toBe(38);

    // Todos los subtotales_bs = cantidad × costo_bs (primario)
    items.forEach((item) => {
      const expectedBs = Math.round(item.cantidad * item.costo_unitario_bs * 100) / 100;
      expect(item.subtotal_bs).toBe(expectedBs);
    });
  });

  it("recalcAllItems actualiza todos los ítems BS cuando cambia la tasa", () => {
    const TASA1 = 46.5;
    const TASA2 = 50.0;
    useInvoiceFormStore.setState({ moneda: "BS", tasa: String(TASA1) });

    useInvoiceFormStore.getState().addLineItem(makeItem({
      costo_ingresado: 465,
      moneda_ingreso: "BS",
      cantidad: 2,
    }));
    useInvoiceFormStore.getState().addLineItem(makeItem({
      producto_id: 2,
      costo_ingresado: 930,
      moneda_ingreso: "BS",
      cantidad: 1,
    }));

    const before = useInvoiceFormStore.getState().lineItems;
    expect(before[0].costo_unitario_usd).toBe(10);   // 465/46.5
    expect(before[1].costo_unitario_usd).toBe(20);   // 930/46.5

    useInvoiceFormStore.getState().recalcAllItems(TASA2);

    const after = useInvoiceFormStore.getState().lineItems;
    expect(after[0].costo_unitario_usd).toBe(9.3);   // 465/50
    expect(after[0].subtotal_usd).toBe(18.6);        // 930/50
    expect(after[1].costo_unitario_usd).toBe(18.6);  // 930/50
    expect(after[1].subtotal_bs).toBe(930);          // BS permanece igual
  });
});

// ── Flujo completo: factura con ítems + obsequios → payload API ───────────────

describe("invoiceFormStore - flujo completo hacia payload de API", () => {
  it("construye FacturaCreate desde el estado del store con datos crudos", () => {
    const TASA = 46.5;
    useInvoiceFormStore.setState({
      moneda: "USD",
      tasa: String(TASA),
      proveedorId: 3,
      numeroFactura: "F-2025-001",
      tipoDocumento: "FACTURA",
      fechaFactura: "2025-06-01",
      fechaLimitePago: "2025-07-01",
      observaciones: "Pago a 30 días",
      aplicaIva: true,
    });

    // 3 ítems gravados en USD
    useInvoiceFormStore.getState().addLineItem(
      makeItem({ producto_id: 1, costo_ingresado: 50, cantidad: 4, tipo_iva: "GRAVADO" }),
    );
    useInvoiceFormStore.getState().addLineItem(
      makeItem({ producto_id: 2, costo_ingresado: 100, cantidad: 2, tipo_iva: "GRAVADO" }),
    );
    // 1 ítem exento
    useInvoiceFormStore.getState().addLineItem(
      makeItem({ producto_id: 3, costo_ingresado: 5, cantidad: 10, tipo_iva: "EXENTO" }),
    );

    // 2 obsequios
    useInvoiceFormStore.getState().addObsequio({
      producto_id: 10,
      nombre: "Vaso Promo",
      tipo_empaque: "UNIDAD",
      cantidad: 6,
      unidades_por_caja: 1,
      justificacion: "Promoción proveedor",
    });
    useInvoiceFormStore.getState().addObsequio({
      producto_id: 11,
      nombre: "Bolsa de tela",
      tipo_empaque: "UNIDAD",
      cantidad: 2,
      unidades_por_caja: 1,
      justificacion: "Cortesía",
    });

    const s = useInvoiceFormStore.getState();
    const items = s.lineItems;
    const obsequios = s.obsequioItems;

    // Construye el FacturaCreate como lo haría InvoiceNewPage
    const totalUsd = Math.round(items.reduce((sum, i) => sum + i.subtotal_usd, 0) * 100) / 100;
    const totalBs  = Math.round(items.reduce((sum, i) => sum + i.subtotal_bs,  0) * 100) / 100;

    const payload = {
      proveedor_id:       s.proveedorId,
      numero_factura:     s.numeroFactura,
      tipo_documento:     s.tipoDocumento,
      fecha:              s.fechaFactura,
      fecha_limite_pago:  s.fechaLimitePago,
      observaciones:      s.observaciones,
      moneda:             s.moneda,
      tasa_bs:            Number(s.tasa),
      aplica_iva:         s.aplicaIva,
      monto_total_usd:    totalUsd,
      monto_total_bs:     totalBs,
      moneda_principal:   s.moneda,
      detalles: items.map((i) => ({
        producto_id:       i.producto_id,
        tipo_empaque:      i.tipo_empaque,
        cantidad:          i.cantidad,
        costo_unitario_usd: i.costo_unitario_usd,
        costo_unitario_bs:  i.costo_unitario_bs,
        subtotal_usd:      i.subtotal_usd,
        subtotal_bs:       i.subtotal_bs,
        tipo_iva:          i.tipo_iva,
        moneda_ingreso:    i.moneda_ingreso,
        costo_ingresado:   i.costo_ingresado,
      })),
      obsequios: obsequios.map((o) => ({
        producto_id:    o.producto_id,
        tipo_empaque:   o.tipo_empaque,
        cantidad:       o.cantidad,
        justificacion:  o.justificacion,
      })),
    };

    // Validaciones del payload
    expect(payload.proveedor_id).toBe(3);
    expect(payload.numero_factura).toBe("F-2025-001");
    expect(payload.tasa_bs).toBe(46.5);
    expect(payload.aplica_iva).toBe(true);

    // 4×50 + 2×100 + 10×5 = 200+200+50 = 450 USD
    expect(payload.monto_total_usd).toBe(450);
    // 450 × 46.5 = 20925 BS
    expect(payload.monto_total_bs).toBe(20925);

    expect(payload.detalles).toHaveLength(3);
    expect(payload.detalles[0].subtotal_usd).toBe(200);  // 4×50
    expect(payload.detalles[1].subtotal_usd).toBe(200);  // 2×100
    expect(payload.detalles[2].subtotal_usd).toBe(50);   // 10×5
    expect(payload.detalles[2].tipo_iva).toBe("EXENTO");

    expect(payload.obsequios).toHaveLength(2);
    expect(payload.obsequios[0].producto_id).toBe(10);
    expect(payload.obsequios[1].justificacion).toBe("Cortesía");
  });
});

// ── setLineItems + forceAllItemsGravado ───────────────────────────────────────

describe("invoiceFormStore - setLineItems bulk", () => {
  it("setLineItems reemplaza todos los ítems de una vez (útil al importar de IA)", () => {
    useInvoiceFormStore.setState({ moneda: "USD", tasa: "46.5" });
    useInvoiceFormStore.getState().addLineItem(makeItem({ producto_id: 1 }));

    const bulk: LineItem[] = [
      {
        key: "k1",
        producto_id: 5,
        nombre: "IA Item 1",
        codigo_barra: null,
        tipo_empaque: "UNIDAD",
        cantidad: 3,
        unidades_por_caja: 1,
        tipo_iva: "GRAVADO",
        costo_ingresado: 20,
        moneda_ingreso: "USD",
        costo_unitario_usd: 20,
        costo_unitario_bs: 930,
        subtotal_usd: 60,
        subtotal_bs: 2790,
      },
      {
        key: "k2",
        producto_id: 6,
        nombre: "IA Item 2",
        codigo_barra: "123",
        tipo_empaque: "CAJA",
        cantidad: 1,
        unidades_por_caja: 12,
        tipo_iva: "EXENTO",
        costo_ingresado: 15,
        moneda_ingreso: "USD",
        costo_unitario_usd: 15,
        costo_unitario_bs: 697.5,
        subtotal_usd: 15,
        subtotal_bs: 697.5,
      },
    ];

    useInvoiceFormStore.getState().setLineItems(bulk);
    const items = useInvoiceFormStore.getState().lineItems;

    expect(items).toHaveLength(2);
    expect(items[0].key).toBe("k1");
    expect(items[1].tipo_iva).toBe("EXENTO");
  });

  it("forceAllItemsGravado tras carga masiva forza IVA en todos", () => {
    useInvoiceFormStore.setState({ moneda: "USD", tasa: "1" });
    useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "EXENTO" }));
    useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "GRAVADO" }));
    useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "EXENTO" }));

    useInvoiceFormStore.getState().forceAllItemsGravado();

    const items = useInvoiceFormStore.getState().lineItems;
    expect(items.every((i) => i.tipo_iva === "GRAVADO")).toBe(true);
    expect(items).toHaveLength(3);
  });
});
