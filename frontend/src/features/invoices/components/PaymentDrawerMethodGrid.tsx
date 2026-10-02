import type { PaymentMethodOut } from "@/types/api";

interface PaymentDrawerMethodGridProps {
  methods: PaymentMethodOut[];
  selectedMethodId: number | null;
  onSelectMethod: (id: number) => void;
}

export default function PaymentDrawerMethodGrid({
  methods,
  selectedMethodId,
  onSelectMethod,
}: PaymentDrawerMethodGridProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-700">Método de pago</label>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMethod(m.id)}
            className={`cursor-pointer rounded-lg border-2 px-3 py-2 text-center transition-all ${
              selectedMethodId === m.id
                ? "border-brand-blue bg-blue-50 font-semibold text-brand-blue"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="text-xs">{m.nombre}</div>
            <div className="text-[10px] opacity-70">{m.moneda_default}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
