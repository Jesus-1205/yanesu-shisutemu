import { usePaymentFormStore } from "../store/paymentFormStore";

export default function PaymentNotesInput() {
  const store = usePaymentFormStore();

  return (
    <section>
      <label className="mb-2 block text-sm font-semibold tracking-wide text-slate-700 uppercase">
        Observaciones
      </label>
      <textarea
        rows={3}
        value={store.observaciones}
        onChange={(e) => store.setObservaciones(e.target.value)}
        placeholder="Notas opcionales sobre este pago..."
        className="w-full resize-none rounded-xl border-2 border-slate-200 bg-surface px-4 py-3 text-sm transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
      />
    </section>
  );
}
