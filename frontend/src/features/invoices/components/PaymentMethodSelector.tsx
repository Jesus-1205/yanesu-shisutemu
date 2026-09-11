import { CreditCard, DollarSign, Landmark, Smartphone } from "lucide-react";
import type { PaymentMethodOut } from "@/types/api";
import { usePaymentFormStore } from "../store/paymentFormStore";

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  "transferencia": Landmark,
  "tarjeta": CreditCard,
  "pago movil": Smartphone,
  "pago móvil": Smartphone,
  "efectivo": DollarSign,
};

function getMethodIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(METHOD_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return CreditCard;
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethodOut[];
}

export default function PaymentMethodSelector({ methods }: PaymentMethodSelectorProps) {
  const store = usePaymentFormStore();

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-700 uppercase">
        Método de pago
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {methods.map((method) => {
          const Icon = getMethodIcon(method.nombre);
          const selected = store.selectedMethodId === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => store.setMethod(method.id)}
              className={`
                flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-150
                ${selected
                  ? "border-brand-blue bg-blue-50 ring-2 ring-brand-blue/20"
                  : "border-slate-200 bg-surface hover:border-slate-300 hover:bg-slate-50"
                }
              `}
            >
              <Icon className={`size-6 ${selected ? "text-brand-blue" : "text-slate-400"}`} />
              <span className={`text-sm font-medium ${selected ? "text-brand-blue" : "text-text-main"}`}>
                {method.nombre}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">
                {method.moneda_default === "USD" ? "USD" : "VES"}
                {method.acepta_referencia && " · Ref."}
              </span>
            </button>
          );
        })}
        {methods.length === 0 && (
          <p className="col-span-full py-4 text-center text-sm text-slate-400">
            No hay métodos de pago activos
          </p>
        )}
      </div>
    </section>
  );
}
