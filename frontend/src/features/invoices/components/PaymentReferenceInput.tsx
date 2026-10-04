import { usePaymentFormStore } from "../store/paymentFormStore";

interface PaymentReferenceInputProps {
  visible?: boolean;
}

export default function PaymentReferenceInput({ visible = true }: PaymentReferenceInputProps) {
  const store = usePaymentFormStore();

  if (!visible) return null;

  return (
    <section>
      <label className="mb-2 block text-sm font-semibold tracking-wide text-slate-700 uppercase">
        Referencia
      </label>
      <input
        type="text"
        value={store.referencia}
        onChange={(e) => store.setReferencia(e.target.value)}
        placeholder="Número de referencia"
        className="h-11 w-full rounded-xl border-2 border-slate-200 bg-surface px-4 text-sm text-text-main transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
      />
    </section>
  );
}
