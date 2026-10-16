import { describe, it, expect } from "vitest";
import {
  adminSidebarItems,
  operatorSidebarItems,
  getSidebarItems,
  breadcrumbMap,
  POS_PATH,
} from "../../layout/config/navigation";

describe("navigation config", () => {
  it("defines POS_PATH as /sales/new", () => {
    expect(POS_PATH).toBe("/sales/new");
  });

  it("returns admin items for ADMINISTRADOR role", () => {
    const items = getSidebarItems("ADMINISTRADOR");
    expect(items).toBe(adminSidebarItems);
    expect(items.some((i) => i.label === "Dashboard")).toBe(true);
    expect(items.some((i) => i.label === "VENTAS")).toBe(true);
    expect(items.some((i) => i.label === "CONTROL")).toBe(true);
  });

  it("returns operator items for OPERADOR or undefined role", () => {
    expect(getSidebarItems("OPERADOR")).toBe(operatorSidebarItems);
    expect(getSidebarItems(undefined)).toBe(operatorSidebarItems);
    expect(operatorSidebarItems.some((i) => i.label === "OPERACIONES")).toBe(true);
    expect(operatorSidebarItems.some((i) => i.label === "CONTROL")).toBe(false);
  });

  it("contains required mappings in breadcrumbMap", () => {
    expect(breadcrumbMap.dashboard).toBe("Dashboard");
    expect(breadcrumbMap.buys).toBe("Compras");
    expect(breadcrumbMap.products).toBe("Productos");
    expect(breadcrumbMap.categories).toBe("Categorías");
    expect(breadcrumbMap.sales).toBe("Ventas");
  });
});
