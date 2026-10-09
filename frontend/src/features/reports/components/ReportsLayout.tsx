import { NavLink, Outlet, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import PageHeader from "@/ui-components/PageHeader";
import { getTodayInCaracas } from "@/lib/utils";

const PRESETS = [
  { id: "7d", label: "Últimos 7 días", days: 7 },
  { id: "30d", label: "Últimos 30 días", days: 30 },
  { id: "this_month", label: "Este mes" },
  { id: "all", label: "Todo" },
] as const;

export default function ReportsLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCustomDates, setShowCustomDates] = useState(false);

  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  // Helper to compute date range
  const setPreset = (presetId: (typeof PRESETS)[number]["id"]) => {
    const todayStr = getTodayInCaracas();
    const today = new Date();

    const newParams = new URLSearchParams(searchParams);

    if (presetId === "7d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      newParams.set("from", past.toISOString().slice(0, 10));
      newParams.set("to", todayStr);
      setShowCustomDates(false);
    } else if (presetId === "30d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 29);
      newParams.set("from", past.toISOString().slice(0, 10));
      newParams.set("to", todayStr);
      setShowCustomDates(false);
    } else if (presetId === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      newParams.set("from", firstDay.toISOString().slice(0, 10));
      newParams.set("to", todayStr);
      setShowCustomDates(false);
    } else if (presetId === "all") {
      newParams.delete("from");
      newParams.delete("to");
      setShowCustomDates(false);
    }

    setSearchParams(newParams, { replace: true });
  };

  const toggleCurrency = (newCurrency: "USD" | "VES") => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("currency", newCurrency);
    setSearchParams(newParams, { replace: true });
  };

  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(field, value);
    } else {
      newParams.delete(field);
    }
    setSearchParams(newParams, { replace: true });
  };

  const activePreset = useMemo(() => {
    if (!from && !to) return "all";
    const todayStr = getTodayInCaracas();
    const today = new Date();

    const d7 = new Date(today);
    d7.setDate(today.getDate() - 6);
    if (from === d7.toISOString().slice(0, 10) && to === todayStr) return "7d";

    const d30 = new Date(today);
    d30.setDate(today.getDate() - 29);
    if (from === d30.toISOString().slice(0, 10) && to === todayStr) return "30d";

    const mFirst = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    if (from === mFirst && to === todayStr) return "this_month";

    return "custom";
  }, [from, to]);

  const navItems = [
    { to: `sales?${searchParams.toString()}`, label: "Ventas y Rentabilidad" },
    { to: `products?${searchParams.toString()}`, label: "Inventario y Productos" },
    { to: `payments?${searchParams.toString()}`, label: "Métodos de Pago" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de Reportes"
        description="Estadísticas detalladas y rendimiento financiero del sistema"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Currency Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => toggleCurrency("USD")}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  currency === "USD"
                    ? "bg-white text-brand-blue shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => toggleCurrency("VES")}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  currency === "VES"
                    ? "bg-white text-brand-blue shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                VES (Bs)
              </button>
            </div>

            {/* Quick Range Presets */}
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-surface p-1 text-xs">
              <Calendar className="size-3.5 text-slate-400 ml-1" />
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`cursor-pointer rounded-md px-2 py-1 font-medium transition-colors ${
                    activePreset === p.id && !showCustomDates
                      ? "bg-brand-blue text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustomDates((v) => !v)}
                className={`cursor-pointer rounded-md px-2 py-1 font-medium transition-colors ${
                  activePreset === "custom" || showCustomDates
                    ? "bg-brand-blue text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>
        }
      />

      {/* Custom Date Range Picker Drawer / Inputs (collapsible) */}
      {showCustomDates && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-surface p-3 text-sm">
          <span className="font-medium text-slate-700">Rango personalizado:</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Desde:</label>
            <input
              type="date"
              value={from}
              onChange={(e) => handleCustomDateChange("from", e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand-blue focus:outline-hidden"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Hasta:</label>
            <input
              type="date"
              value={to}
              onChange={(e) => handleCustomDateChange("to", e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand-blue focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Nav Pills for Domains */}
      <div className="flex border-b border-slate-200 pb-1">
        <nav className="flex space-x-2" aria-label="Tabs">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-blue text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Dynamic Content */}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
