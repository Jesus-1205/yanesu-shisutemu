import { createContext, useContext, ReactNode } from "react";
import { useCheckout } from "../hooks/useCheckout";

export type CheckoutContextValue = ReturnType<typeof useCheckout> & {
  onClose: () => void;
};

export const CheckoutContext = createContext<CheckoutContextValue | null>(null);

interface CheckoutProviderProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckoutProvider({
  children,
  open,
  onClose,
  onSuccess,
}: CheckoutProviderProps) {
  const checkoutState = useCheckout({ open, onClose, onSuccess });

  const value: CheckoutContextValue = {
    ...checkoutState,
    onClose,
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckoutContext(): CheckoutContextValue {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckoutContext must be used within a CheckoutProvider");
  }
  return context;
}
