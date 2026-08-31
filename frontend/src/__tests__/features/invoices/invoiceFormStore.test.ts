import { describe, expect, it, beforeEach } from "vitest";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";

/**
 * Tests unitarios del store de formulario de factura.
 *
 * Principio: el frontend calcula para mostrar (feedback instantáneo).
 * El backend es la fuente de verdad para persistir.
 * Estos tests validan que los cálculos del frontend son consistentes
 * con lo que el backend espera recibir (costo_unitario_usd, costo_unitario_bs,
 * subtotal_usd, subtotal_bs).
 */

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    producto_id: 1,
    nombre: "Producto Test",
    codigo_barra: null,
    tipo_empaque: "CAJA" as const,
    cantidad: 2,
    unidades_por_caja: 12,
    tipo_iva: "GRAVADO" as const,
    costo_ingresado: 22,
    moneda_ingreso: "USD" as const,
    ...overrides,
  };
}

describe("invoiceFormStore", () => {
  beforeEach(() => {
    useInvoiceFormStore.getState().reset();
  });

  describe("addLineItem", () => {
    it("USD mode: computes costo_unitario_bs = costo_usd * tasa", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "36.5" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 100 }));

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items).toHaveLength(1);
      expect(items[0].costo_unitario_usd).toBe(100);
      expect(items[0].costo_unitario_bs).toBe(3650);
    });

    it("USD mode: subtotal_bs = subtotal_usd * tasa", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "36.5" });
      // 2 cajas * $100 = $200 USD, $7300 BS
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 100, cantidad: 2 }));

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items[0].subtotal_usd).toBe(200);
      expect(items[0].subtotal_bs).toBe(7300);
    });

    it("BS mode: subtotal_bs is primary, subtotal_usd derived", () => {
      useInvoiceFormStore.setState({ moneda: "BS", tasa: "36.5" });
      // 2 cajas * 3650 BS = 7300 BS, 7300/36.5 = 200 USD
      useInvoiceFormStore.getState().addLineItem(makeItem({
        costo_ingresado: 3650, moneda_ingreso: "BS", cantidad: 2,
      }));

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items[0].costo_unitario_bs).toBe(3650);
      expect(items[0].subtotal_bs).toBe(7300);
      expect(items[0].subtotal_usd).toBe(200);
    });

    it("tasa=0: costo_unitario_bs=0 in USD mode", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 50 }));

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items[0].costo_unitario_usd).toBe(50);
      expect(items[0].costo_unitario_bs).toBe(0);
      expect(items[0].subtotal_usd).toBe(100); // 2 * 50
      expect(items[0].subtotal_bs).toBe(0);
    });

    it("multiple items: each has independent calculations", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "36.5" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 22, cantidad: 4 }));
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 15, cantidad: 2 }));
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 50, cantidad: 1 }));

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items).toHaveLength(3);
      expect(items[0].subtotal_usd).toBe(88);  // 4 * 22
      expect(items[1].subtotal_usd).toBe(30);  // 2 * 15
      expect(items[2].subtotal_usd).toBe(50);  // 1 * 50
    });

    it("rounding: toCents applied at each step (unit cost + subtotal)", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "36.5" });
      // costo_ingresado=10.005 → convertirCostos rounds to 10.01
      // subtotal = toCents(3 * 10.01) = toCents(30.03) = 30.03
      useInvoiceFormStore.getState().addLineItem(makeItem({
        costo_ingresado: 10.005, cantidad: 3,
      }));

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items[0].costo_unitario_usd).toBe(10.01); // rounded by toCents
      expect(items[0].subtotal_usd).toBe(30.03);       // 3 * 10.01 = 30.03
    });
  });

  describe("recalcAllItems", () => {
    it("recalculates all items when tasa changes", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "36.5" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 100, cantidad: 1 }));

      let items = useInvoiceFormStore.getState().lineItems;
      expect(items[0].costo_unitario_bs).toBe(3650);
      expect(items[0].subtotal_bs).toBe(3650);

      // Change tasa to 40
      useInvoiceFormStore.getState().recalcAllItems(40);

      items = useInvoiceFormStore.getState().lineItems;
      expect(items[0].costo_unitario_bs).toBe(4000); // 100 * 40
      expect(items[0].subtotal_bs).toBe(4000);       // 1 * 4000
      expect(items[0].subtotal_usd).toBe(100);        // 4000 / 40
    });

    it("tasa=0: does not recalculate (early return)", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "36.5" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 100, cantidad: 1 }));

      useInvoiceFormStore.getState().recalcAllItems(0);

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items[0].costo_unitario_bs).toBe(3650); // unchanged
    });

    it("BS mode: recalculates from BS primary", () => {
      useInvoiceFormStore.setState({ moneda: "BS", tasa: "36.5" });
      useInvoiceFormStore.getState().addLineItem(makeItem({
        costo_ingresado: 3650, moneda_ingreso: "BS", cantidad: 1,
      }));

      // Change tasa to 40
      useInvoiceFormStore.getState().recalcAllItems(40);

      const items = useInvoiceFormStore.getState().lineItems;
      // costo_ingresado is still 3650 (BS), recalc with tasa=40
      // costo_usd = 3650/40 = 91.25, costo_bs = 3650
      expect(items[0].costo_unitario_bs).toBe(3650);
      expect(items[0].costo_unitario_usd).toBe(91.25);
      expect(items[0].subtotal_bs).toBe(3650);
      expect(items[0].subtotal_usd).toBe(91.25);
    });
  });

  describe("toggleItemIva", () => {
    it("toggles GRAVADO to EXENTO", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "1" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "GRAVADO" }));

      const key = useInvoiceFormStore.getState().lineItems[0].key;
      useInvoiceFormStore.getState().toggleItemIva(key);

      expect(useInvoiceFormStore.getState().lineItems[0].tipo_iva).toBe("EXENTO");
    });

    it("toggles EXENTO back to GRAVADO", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "1" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "EXENTO" }));

      const key = useInvoiceFormStore.getState().lineItems[0].key;
      useInvoiceFormStore.getState().toggleItemIva(key);
      expect(useInvoiceFormStore.getState().lineItems[0].tipo_iva).toBe("GRAVADO");
      useInvoiceFormStore.getState().toggleItemIva(key);
      expect(useInvoiceFormStore.getState().lineItems[0].tipo_iva).toBe("EXENTO");
    });

    it("only toggles the targeted item", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "1" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "GRAVADO" }));
      useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "GRAVADO" }));

      const key0 = useInvoiceFormStore.getState().lineItems[0].key;
      useInvoiceFormStore.getState().toggleItemIva(key0);

      expect(useInvoiceFormStore.getState().lineItems[0].tipo_iva).toBe("EXENTO");
      expect(useInvoiceFormStore.getState().lineItems[1].tipo_iva).toBe("GRAVADO");
    });
  });

  describe("forceAllItemsGravado", () => {
    it("sets all items to GRAVADO", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "1" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "EXENTO" }));
      useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "EXENTO" }));
      useInvoiceFormStore.getState().addLineItem(makeItem({ tipo_iva: "GRAVADO" }));

      useInvoiceFormStore.getState().forceAllItemsGravado();

      const items = useInvoiceFormStore.getState().lineItems;
      expect(items.every((i) => i.tipo_iva === "GRAVADO")).toBe(true);
    });
  });

  describe("removeLineItem", () => {
    it("removes only the targeted item", () => {
      useInvoiceFormStore.setState({ moneda: "USD", tasa: "1" });
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 10 }));
      useInvoiceFormStore.getState().addLineItem(makeItem({ costo_ingresado: 20 }));

      const key0 = useInvoiceFormStore.getState().lineItems[0].key;
      useInvoiceFormStore.getState().removeLineItem(key0);

      expect(useInvoiceFormStore.getState().lineItems).toHaveLength(1);
      expect(useInvoiceFormStore.getState().lineItems[0].costo_unitario_usd).toBe(20);
    });
  });

  describe("reset", () => {
    it("clears all state back to initial", () => {
      useInvoiceFormStore.setState({ moneda: "BS", tasa: "36.5" });
      useInvoiceFormStore.getState().addLineItem(makeItem());
      useInvoiceFormStore.getState().setField("numeroFactura", "F-001");
      useInvoiceFormStore.getState().setField("observaciones", "test");

      useInvoiceFormStore.getState().reset();

      const state = useInvoiceFormStore.getState();
      expect(state.lineItems).toHaveLength(0);
      expect(state.moneda).toBe("USD");
      expect(state.tasa).toBe("");
      expect(state.numeroFactura).toBe("");
      expect(state.observaciones).toBe("");
    });
  });

  describe("addObsequio / removeObsequio", () => {
    it("adds and removes obsequios", () => {
      useInvoiceFormStore.getState().addObsequio({
        producto_id: 1,
        nombre: "Obsequio",
        tipo_empaque: "CAJA",
        cantidad: 1,
        unidades_por_caja: 12,
        justificacion: "Promoción",
      });

      expect(useInvoiceFormStore.getState().obsequioItems).toHaveLength(1);

      const key = useInvoiceFormStore.getState().obsequioItems[0].key;
      useInvoiceFormStore.getState().removeObsequio(key);

      expect(useInvoiceFormStore.getState().obsequioItems).toHaveLength(0);
    });
  });
});
