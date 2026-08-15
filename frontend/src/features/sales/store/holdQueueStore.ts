import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "./cartStore";
import { useCartStore, computeTotals } from "./cartStore";

export const MAX_HOLDS = 10;

export interface HeldCart {
  id: string;
  label: string;
  savedAt: string;
  items: Record<string, CartItem>;
  snapshotTasa: number;
}

interface HoldQueueState {
  heldCarts: HeldCart[];
  holdCurrentCart: (label?: string) => boolean;
  restoreCart: (id: string) => void;
  removeHeld: (id: string) => void;
  clearAll: () => void;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultLabel(savedAt: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `Venta ${pad(savedAt.getDate())}/${pad(savedAt.getMonth() + 1)} ${pad(savedAt.getHours())}:${pad(savedAt.getMinutes())}`;
}

export function heldCartTotalUsd(cart: Pick<HeldCart, "items">): number {
  const t = computeTotals(cart.items);
  return Math.round((t.monto_exento_usd + t.base_imponible_usd + t.monto_iva_usd) * 100) / 100;
}

export function heldCartItemCount(cart: Pick<HeldCart, "items">): number {
  return Object.keys(cart.items).length;
}

export const useHoldQueueStore = create<HoldQueueState>()(
  persist(
    (set, get) => ({
      heldCarts: [],

      holdCurrentCart: (label) => {
        const cart = useCartStore.getState();
        if (Object.keys(cart.items).length === 0) return false;

        const savedAt = new Date();
        const held: HeldCart = {
          id: generateId(),
          label: (label ?? "").trim() || defaultLabel(savedAt),
          savedAt: savedAt.toISOString(),
          items: cart.items,
          snapshotTasa: cart.snapshotTasa,
        };

        set((state) => ({
          heldCarts: [held, ...state.heldCarts].slice(0, MAX_HOLDS),
        }));
        useCartStore.getState().clearCart();
        return true;
      },

      restoreCart: (id) => {
        const held = get().heldCarts.find((h) => h.id === id);
        if (!held) return;
        useCartStore.getState().loadCart(held.items, held.snapshotTasa);
        set((state) => ({
          heldCarts: state.heldCarts.filter((h) => h.id !== id),
        }));
      },

      removeHeld: (id) => {
        set((state) => ({
          heldCarts: state.heldCarts.filter((h) => h.id !== id),
        }));
      },

      clearAll: () => {
        set({ heldCarts: [] });
      },
    }),
    {
      name: "yanesu-hold-queue-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ heldCarts: state.heldCarts }),
    },
  ),
);
