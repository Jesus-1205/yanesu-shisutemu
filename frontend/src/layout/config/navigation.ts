import type { SidebarItem } from "../../ui-components/Sidebar";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  BarChart3,
} from "lucide-react";
import React from "react";

export const POS_PATH = "/sales/new";

export const adminSidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: React.createElement(LayoutDashboard, { size: 18 }), to: "/dashboard" },
  {
    label: "VENTAS",
    icon: React.createElement(ShoppingCart, { size: 18 }),
    items: [
      { label: "Punto de Venta (POS)", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  {
    label: "INVENTARIO",
    icon: React.createElement(Package, { size: 18 }),
    items: [
      { label: "Productos", to: "/products" },
      { label: "Categorías", to: "/categories" },
    ],
  },
  { label: "Facturas de Compra", icon: React.createElement(Truck, { size: 18 }), to: "/buys" },
  { label: "Tasas de Cambio", icon: React.createElement(DollarSign, { size: 18 }), to: "/exchange-rates" },
  {
    label: "CONTROL",
    icon: React.createElement(BarChart3, { size: 18 }),
    items: [
      { label: "Reportes", to: "/reports" },
      { label: "Retornables", to: "/retornables" },
    ],
  },
];

export const operatorSidebarItems: SidebarItem[] = [
  {
    label: "OPERACIONES",
    icon: React.createElement(ShoppingCart, { size: 18 }),
    items: [
      { label: "Nueva Venta", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  { label: "Consulta de Productos", icon: React.createElement(Package, { size: 18 }), to: "/products" },
  { label: "Tasas de Cambio", icon: React.createElement(DollarSign, { size: 18 }), to: "/exchange-rates" },
];

export function getSidebarItems(rolNombre: string | undefined): SidebarItem[] {
  if (rolNombre === "ADMINISTRADOR") {
    return adminSidebarItems;
  }
  return operatorSidebarItems;
}

export const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  buys: "Compras",
  compras: "Compras",
  products: "Productos",
  categories: "Categorías",
  suppliers: "Proveedores",
  sales: "Ventas",
  users: "Usuarios",
  "exchange-rates": "Tasas de Cambio",
  reports: "Reportes",
  retornables: "Retornables",
  invoices: "Facturas de Compra",
  "payment-methods": "Métodos de Pago",
  "price-rules": "Precios Div.",
  combos: "Combos",
  settings: "Configuración",
  system: "API Keys",
  new: "Nuevo",
};
