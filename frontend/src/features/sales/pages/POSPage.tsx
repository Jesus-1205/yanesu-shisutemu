import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductOut } from "@/types/api";
import PageHeader from "@/ui-components/PageHeader";
import { useToast } from "@/ui-components/Toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { useCartStore, computeTotals } from "../store/cartStore";
import { useHoldQueueStore } from "../store/holdQueueStore";
import CheckoutDrawer from "../components/CheckoutDrawer";
import ComboSelectorModal from "../components/ComboSelectorModal";
import ProductGrid from "../components/ProductGrid";
import CartPanel from "../components/CartPanel";
import HoldQueueDrawer from "../components/HoldQueueDrawer";
import PosTopBar from "../components/PosTopBar";
import PromoSection from "../components/PromoSection";
import HoldCartModal from "../components/HoldCartModal";
import { usePosKeyboard } from "../hooks/usePosKeyboard";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosCatalog } from "../hooks/usePosCatalog";

export default function POSPage() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";

  const {
    search,
    setSearch,
    debouncedSearch,
    loadingProducts,
    hideNoStock,
    setHideNoStock,
    showPromos,
    setShowPromos,
    combos,
    customizingCombo,
    setCustomizingCombo,
    searchRef,
    filteredProducts,
    hasMoreFavorites,
    totalFavorites,
    handleShowMore,
    handleSearchChange,
    resetSearch,
  } = usePosCatalog();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const addCombo = useCartStore((s) => s.addCombo);
  const addComboWithSelections = useCartStore((s) => s.addComboWithSelections);
  const snapshotTasa = useCartStore((s) => s.snapshotTasa);
  const heldCount = useHoldQueueStore((s) => s.heldCarts.length);

  const totals = useMemo(() => computeTotals(items), [items]);
  const totalUsd = useMemo(
    () => Math.round((totals.monto_exento_usd + totals.base_imponible_usd + totals.monto_iva_usd) * 100) / 100,
    [totals],
  );
  const totalVes = useMemo(
    () => (snapshotTasa > 0 ? Math.round(totalUsd * snapshotTasa * 100) / 100 : 0),
    [totalUsd, snapshotTasa],
  );
  const itemCount = useMemo(() => Object.keys(items).length, [items]);

  useEffect(() => {
    useExchangeRateStore.getState().loadTasa();
  }, []);

  const tasaNum = snapshotTasa;
  const tasaBCV = useExchangeRateStore((s) => s.tasa);

  const handleCheckout = useCallback(() => {
    if (itemCount === 0) {
      toastRef.current("Agrega al menos un producto", "error");
      return;
    }
    if (tasaNum <= 0) {
      toastRef.current("Registra la tasa BCV antes de vender", "error");
      return;
    }
    setCheckoutOpen(true);
  }, [itemCount, tasaNum]);

  const handleCloseCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  const handleOpenHold = useCallback(() => {
    if (itemCount === 0) {
      toastRef.current("No hay productos para guardar", "error");
      return;
    }
    setHoldModalOpen(true);
  }, [itemCount]);

  const handleConfirmHold = useCallback((label: string) => {
    const ok = useHoldQueueStore.getState().holdCurrentCart(label);
    setHoldModalOpen(false);
    if (ok) {
      toastRef.current("Venta guardada", "success");
    }
  }, []);

  const handleOpenQueue = useCallback(() => {
    setHoldDrawerOpen(true);
  }, []);

  usePosKeyboard(searchRef, handleCheckout, checkoutOpen, handleCloseCheckout, handleOpenHold, handleOpenQueue);

  const handleBarcodeScan = useCallback(() => {
    setSearch("");
  }, [setSearch]);

  useBarcodeScanner(addItem, searchRef, checkoutOpen, handleBarcodeScan);

  const handleSuccess = useCallback(() => {
    setCheckoutOpen(false);
    resetSearch();
  }, [resetSearch]);

  const handleAddUnit = useCallback((product: ProductOut) => {
    addItem(product, "UNIDAD");
  }, [addItem]);

  const handleAddBox = useCallback((product: ProductOut) => {
    addItem(product, "CAJA");
  }, [addItem]);

  return (
    <div>
      <PageHeader
        title="Punto de Venta"
        description="Registra una nueva venta"
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left panel: products */}
        <div className="space-y-4 lg:col-span-2">
          <PosTopBar
            search={search}
            searchRef={searchRef}
            hideNoStock={hideNoStock}
            onSearchChange={handleSearchChange}
            onToggleHideNoStock={setHideNoStock}
          />

          {!debouncedSearch.trim() && (
            <PromoSection
              combos={combos}
              showPromos={showPromos}
              onTogglePromos={() => setShowPromos(!showPromos)}
              onQuickAddCombo={addCombo}
              onCustomizeCombo={setCustomizingCombo}
            />
          )}

          <ProductGrid
            products={filteredProducts}
            tasa={tasaBCV}
            isOperator={isOperator}
            loading={loadingProducts}
            onAddUnit={handleAddUnit}
            onAddBox={handleAddBox}
          />

          {hasMoreFavorites && (
            <button
              onClick={handleShowMore}
              className="w-full rounded-lg py-2 text-sm text-brand-blue transition-colors hover:bg-brand-blue/5"
            >
              Ver más favoritos ({totalFavorites - 10} restantes)
            </button>
          )}
        </div>

        {/* Right panel: cart */}
        <CartPanel
          items={items}
          totals={totals}
          totalUsd={totalUsd}
          totalVes={totalVes}
          snapshotTasa={snapshotTasa}
          itemCount={itemCount}
          heldCount={heldCount}
          onCheckout={handleCheckout}
          onHold={handleOpenHold}
          onOpenQueue={handleOpenQueue}
        />
      </div>

      <CheckoutDrawer
        open={checkoutOpen}
        onClose={handleCloseCheckout}
        onSuccess={handleSuccess}
      />

      <HoldQueueDrawer
        open={holdDrawerOpen}
        onClose={() => setHoldDrawerOpen(false)}
      />

      {customizingCombo && (
        <ComboSelectorModal
          combo={customizingCombo}
          onConfirm={(selections) => addComboWithSelections(customizingCombo, selections)}
          onClose={() => setCustomizingCombo(null)}
        />
      )}

      <HoldCartModal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        onConfirm={handleConfirmHold}
      />
    </div>
  );
}
