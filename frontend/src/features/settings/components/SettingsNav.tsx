import { NavLink } from "react-router-dom";
import { Users, CreditCard, DollarSign, Settings } from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Usuarios y Roles", to: "/settings/users", icon: <Users size={18} /> },
  { label: "Métodos de Pago", to: "/settings/payment-methods", icon: <CreditCard size={18} /> },
  { label: "Tasas de Cambio", to: "/settings/exchange-rates", icon: <DollarSign size={18} /> },
  { label: "API Keys", to: "/settings/system", icon: <Settings size={18} /> },
];

export default function SettingsNav() {
  return (
    <nav className="w-full lg:w-56 shrink-0 lg:sticky lg:top-20 lg:self-start">
      <div className="bg-surface rounded-xl border border-slate-200 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-blue/10 text-brand-blue"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
