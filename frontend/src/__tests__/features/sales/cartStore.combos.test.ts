import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCartStore, type CartItem } from "../../../features/sales/store/cartStore";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import { api } from "../../../services/api";
import type { ComboActiveOut, CalculateResponse, CalculateResponseItem } from "../../../types/api";

const mockCombo: ComboActiveOut = {
  id: 5,
  nombre: "Combo Fiesta",
  precio_total_usd: 25.5,
  metodo_pago_ids: [1, 2],
  groups: [
    {
      id: 101,
      nombre: "Bebidas",
      min_cantidad: 3,
      max_cantidad: 3,
      productos: [
        { producto_id: 201, nombre: "Cerveza A", precio_unidad_usd: 2 },
        { producto_id: 202, nombre: "Cerveza B", precio_unidad_usd: 2.5 },
      ],
    },
  ],
};

const mockComboItems: CalculateResponseItem[] = [
  {
    producto_id: 201,
    producto_nombre: "Cerveza A",
    tipo_empaque: "UNIDAD",
    cantidad: 2,
    precio_unitario_usd: 8.5,
    precio_original_usd: 2,
    usa_precio_divisas: true,
  },
  {
    producto_id: 202,
    producto_nombre: "Cerveza B",
    tipo_empaque: "UNIDAD",
    cantidad: 1,
    precio_unitario_usd: 8.5,
    precio_original_usd: 2.5,
    usa_precio_divisas: true,
  },
];

const mockCalculateResponse: CalculateResponse = {
  items: [],
  total_usd: 25.5,
  total_divisas_usd: 25.5,
  total_normal_usd: 25.5,
  ahorro_usd: 0,
  metodos_divisas_disponibles: [1, 2],
  combo_items: mockComboItems,
};

beforeEach(() => {
  vi.restoreAllMocks();
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
  useExchangeRateStore.setState({ tasa: 0, loading: false });
});

describe("cartStore - addCombo & addComboWithSelections", () => {
  it("addCombo distributes products evenly and calls api.calculateSale", async () => {
    const calcSpy = vi.spyOn(api, "calculateSale").mockResolvedValueOnce(mockCalculateResponse);
    useExchangeRateStore.setState({ tasa: 40 });

    await useCartStore.getState().addCombo(mockCombo);

    expect(calcSpy).toHaveBeenCalledTimes(1);
    const cartItemId = "combo_5";
    const item = useCartStore.getState().items[cartItemId];
    expect(item).toBeDefined();
    expect(item.nombre).toBe("Combo Fiesta");
    expect(item.cantidad).toBe(1);
    expect(item.precio_unitario_usd).toBe(25.5);
    expect(item.combo_id).toBe(5);
    expect(item.comboDetalle?.productos).toHaveLength(2);
    expect(useCartStore.getState().snapshotTasa).toBe(40);
  });

  it("addCombo increments quantity if combo is already in cart without recalculating", async () => {
    vi.spyOn(api, "calculateSale").mockResolvedValueOnce(mockCalculateResponse);
    await useCartStore.getState().addCombo(mockCombo);

    const calcSpy = vi.spyOn(api, "calculateSale");
    await useCartStore.getState().addCombo(mockCombo);

    expect(calcSpy).not.toHaveBeenCalled();
    const item = useCartStore.getState().items["combo_5"];
    expect(item.cantidad).toBe(2);
  });

  it("addCombo handles API calculation failure gracefully", async () => {
    vi.spyOn(api, "calculateSale").mockRejectedValueOnce(new Error("API Error"));
    await useCartStore.getState().addCombo(mockCombo);
    expect(Object.keys(useCartStore.getState().items)).toHaveLength(0);
  });

  it("addComboWithSelections adds combo with specific custom item counts", async () => {
    const calcSpy = vi.spyOn(api, "calculateSale").mockResolvedValueOnce(mockCalculateResponse);
    const selections = new Map<number, number>();
    selections.set(201, 3);
    selections.set(202, 0);

    await useCartStore.getState().addComboWithSelections(mockCombo, selections);

    expect(calcSpy).toHaveBeenCalledWith({
      items: [],
      combos: [
        {
          combo_id: 5,
          cantidad: 1,
          selecciones: [
            {
              grupo_id: 101,
              productos: [201],
              cantidades: [3],
            },
          ],
        },
      ],
      metodo_pago_ids: [1, 2],
    });

    const item = useCartStore.getState().items["combo_5"];
    expect(item).toBeDefined();
    expect(item.cantidad).toBe(1);
  });

  it("addComboWithSelections increments quantity and updates comboDetalle if already present", async () => {
    vi.spyOn(api, "calculateSale").mockResolvedValue(mockCalculateResponse);
    const selections = new Map<number, number>([[201, 3]]);

    await useCartStore.getState().addComboWithSelections(mockCombo, selections);
    await useCartStore.getState().addComboWithSelections(mockCombo, selections);

    const item = useCartStore.getState().items["combo_5"];
    expect(item.cantidad).toBe(2);
  });

  it("addComboWithSelections handles failure silently", async () => {
    vi.spyOn(api, "calculateSale").mockRejectedValueOnce(new Error("Network Error"));
    const selections = new Map<number, number>([[201, 3]]);

    await useCartStore.getState().addComboWithSelections(mockCombo, selections);
    expect(Object.keys(useCartStore.getState().items)).toHaveLength(0);
  });

  it("updateQuantity on combo items changes quantity only", async () => {
    vi.spyOn(api, "calculateSale").mockResolvedValueOnce(mockCalculateResponse);
    await useCartStore.getState().addCombo(mockCombo);

    useCartStore.getState().updateQuantity("combo_5", 4);
    const item = useCartStore.getState().items["combo_5"];
    expect(item.cantidad).toBe(4);
    expect(item.unidades_descontadas).toBe(1);
  });

  it("updateEmpaque ignores combo items", async () => {
    vi.spyOn(api, "calculateSale").mockResolvedValueOnce(mockCalculateResponse);
    await useCartStore.getState().addCombo(mockCombo);

    useCartStore.getState().updateEmpaque("combo_5", "CAJA");
    expect(useCartStore.getState().items["combo_5"].tipo_empaque).toBe("UNIDAD");
  });

  it("toggleDivisas ignores combo items", async () => {
    vi.spyOn(api, "calculateSale").mockResolvedValueOnce(mockCalculateResponse);
    await useCartStore.getState().addCombo(mockCombo);

    useCartStore.getState().toggleDivisas("combo_5");
    expect(useCartStore.getState().items["combo_5"].usaPrecioDivisas).toBe(true);
  });

  it("subscribes to exchangeRateStore and snapshots tasa if cart has items but snapshot was 0", () => {
    const mockItem: CartItem = {
      cartItemId: "item_1",
      producto_id: 1,
      nombre: "Prueba",
      tipo_empaque: "UNIDAD",
      cantidad: 1,
      unidades_por_caja: 1,
      unidades_descontadas: 1,
      precio_unidad_usd: 10,
      precio_caja_usd: 100,
      precio_unitario_usd: 10,
      iva_porcentaje: 0,
      tipo_iva: "EXENTO",
      usaPrecioDivisas: false,
      precioDivisasUnidad: null,
      precioDivisasCaja: null,
      combo_id: null,
      comboDetalle: null,
    };
    useCartStore.setState({ items: { item_1: mockItem }, snapshotTasa: 0 });
    useExchangeRateStore.setState({ tasa: 55.2 });

    expect(useCartStore.getState().snapshotTasa).toBe(55.2);
  });
});
