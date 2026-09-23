import { Link } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  FileText,
  Receipt,
  type LucideIcon,
} from "lucide-react";

interface ShortcutItem {
  to: string;
  label: string;
  icon: LucideIcon;
  variant?: "brand" | "green";
}

const SHORTCUTS: ShortcutItem[] = [
  {
    to: "/sales/new",
    label: "Punto de Venta",
    icon: ShoppingCart,
    variant: "green",
  },
  {
    to: "/products",
    label: "Productos",
    icon: Package,
  },
  {
    to: "/invoices",
    label: "Facturas",
    icon: FileText,
  },
  {
    to: "/sales",
    label: "Ventas",
    icon: Receipt,
  },
];

export default function DashboardShortcuts() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SHORTCUTS.map((item) => {
        const Icon = item.icon;
        const isGreen = item.variant === "green";

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-md ${
              isGreen
                ? "border-slate-200 bg-green-50 hover:border-green-300"
                : "border-slate-200 bg-surface hover:border-slate-300"
            }`}
          >
            <span
              className={`rounded-lg p-2 ${
                isGreen
                  ? "bg-green-100 text-green-600"
                  : "bg-brand-blue/10 text-brand-blue"
              }`}
            >
              <Icon className="size-5" />
            </span>
            <span
              className={`text-sm font-semibold ${
                isGreen ? "text-green-800" : "text-text-main"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
