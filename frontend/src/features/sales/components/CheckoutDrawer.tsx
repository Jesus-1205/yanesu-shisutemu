import Drawer from "@/ui-components/Drawer";
import { CheckoutProvider, useCheckoutContext } from "./CheckoutProvider";
import CheckoutHeader from "./CheckoutHeader";
import CheckoutSpeedPayment from "./CheckoutSpeedPayment";
import CheckoutSplitPayment from "./CheckoutSplitPayment";
import CheckoutFooter from "./CheckoutFooter";

interface CheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CheckoutDrawerContent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isSplit, observaciones, setObservaciones, handleKeyDown } = useCheckoutContext();

  return (
    <Drawer open={open} onClose={onClose} title="Cobro" className="w-105">
      <div className="flex h-full flex-col" onKeyDown={handleKeyDown}>
        <CheckoutHeader />

        {/* Cuerpo scrolleable */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {!isSplit ? <CheckoutSpeedPayment /> : <CheckoutSplitPayment />}
        </div>

        {/* Observaciones compacto */}
        <div className="mb-2 px-1">
          <label htmlFor="observaciones" className="mb-0.5 block text-[11px] font-medium text-slate-500">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            rows={1}
            maxLength={255}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas (opcional)"
            autoComplete="off"
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        <CheckoutFooter />
      </div>
    </Drawer>
  );
}

export default function CheckoutDrawer({ open, onClose, onSuccess }: CheckoutDrawerProps) {
  return (
    <CheckoutProvider open={open} onClose={onClose} onSuccess={onSuccess}>
      <CheckoutDrawerContent open={open} onClose={onClose} />
    </CheckoutProvider>
  );
}
