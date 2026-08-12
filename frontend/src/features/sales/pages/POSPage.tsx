import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut } from "@/types/api";
import type { ComboActiveOut } from "@/types/api";
import PageHeader from "@/ui-components/PageHeader";
import ToggleSwitch from "@/ui-components/ToggleSwitch";
import { useToast } from "@/ui-components/Toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { useCartStore, computeTotals } from "../store/cartStore";
import CheckoutDrawer from "../components/CheckoutDrawer";
import ComboCard from "../components/ComboCard";
import ComboSelectorModal from "../components/ComboSelectorModal";
import ProductGrid from "../components/ProductGrid";
import CartPanel from "../components/CartPanel";
import { usePosKeyboard } from "../hooks/usePosKeyboard";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";

export default function POSPage() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [hideNoStock, setHideNoStock] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);

  const [combos, setCombos] = useState<ComboActiveOut[]>([]);
  const [customizingCombo, setCustomizingCombo] = useState<ComboActiveOut | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevSearchRef = useRef(`${debouncedSearch}|${showAllFavorites}`);

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const addCombo = useCartStore((s) => s.addCombo);
  const addComboWithSelections = useCartStore((s) => s.addComboWithSelections);
  const snapshotTasa = useCartStore((s) => s.snapshotTasa);

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

  const loadProducts = useCallback(async (q?: string) => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts(q ? { search: q } : undefined);
      setProducts(data.items);
    } catch {
      toastRef.current("Error al cargar productos", "error");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadFavorites = useCallback(async (showAll = false) => {
    setLoadingProducts(true);
    try {
      const limit = showAll ? 50 : 10;
      const data = await api.getFavoriteProducts(limit);
      setProducts(data.items);
      setTotalFavorites(data.total);
    } catch {
      toastRef.current("Error al cargar favoritos", "error");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites(false);
    api.getActiveCombos().then(setCombos).catch(() => {});
  }, [loadFavorites]);

  useEffect(() => {
    useExchangeRateStore.getState().loadTasa();
  }, []);

  useEffect(() => {
    const current = `${debouncedSearch}|${showAllFavorites}`;
    if (prevSearchRef.current === current) return;
    prevSearchRef.current = current;
    clearTimeout(debounceRef.current);
    if (!debouncedSearch.trim()) {
      loadFavorites(showAllFavorites);
    } else {
      loadProducts(debouncedSearch);
    }
    return () => clearTimeout(debounceRef.current);
  }, [debouncedSearch, loadProducts, loadFavorites, showAllFavorites]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setDebouncedSearch("");
    } else {
      debounceRef.current = setTimeout(() => {
        setDebouncedSearch(search);
      }, 300);
    }
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const tasaNum = snapshotTasa;
  const tasaBCV = useExchangeRateStore((s) => s.tasa);

  const filteredProducts = useMemo(
    () =>
      (hideNoStock
        ? products.filter((p) => p.stock_unidades > 0)
        : [...products]
      ).sort((a, b) => {
        const aHasStock = a.stock_unidades > 0 ? 0 : 1;
        const bHasStock = b.stock_unidades > 0 ? 0 : 1;
        if (aHasStock !== bHasStock) return aHasStock - bHasStock;
        return a.nombre.localeCompare(b.nombre, "es");
      }),
    [products, hideNoStock],
  );

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

  usePosKeyboard(searchRef, handleCheckout, checkoutOpen, handleCloseCheckout);

  const handleBarcodeScan = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
  }, []);

  useBarcodeScanner(addItem, searchRef, checkoutOpen, handleBarcodeScan);

  const handleShowMore = useCallback(() => {
    setShowAllFavorites(true);
  }, []);

  const hasMoreFavorites = !search && !showAllFavorites && totalFavorites > 10;

  const handleSuccess = useCallback(() => {
    setCheckoutOpen(false);
    setSearch("");
    setDebouncedSearch("");
    loadFavorites(false);
  }, [loadFavorites]);

  const handleAddUnit = useCallback((product: ProductOut) => {
    addItem(product, "UNIDAD");
  }, [addItem]);

  const handleAddBox = useCallback((product: ProductOut) => {
    addItem(product, "CAJA");
  }, [addItem]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <div>
      <PageHeader
        title="Punto de Venta"
        description="Registra una nueva venta"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left panel: products */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                placeholder="Buscar productos o escanear código de barras..."
                value={search}
                onChange={handleSearchChange}
                onFocus={(e) => e.target.select()}
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                autoFocus
              />
            </div>
            <div className="shrink-0">
              <ToggleSwitch
                label="Ocultar sin stock"
                checked={hideNoStock}
                onChange={(e) => setHideNoStock(e.target.checked)}
              />
            </div>
          </div>

          {combos.length > 0 && !debouncedSearch.trim() && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide">
                Promociones
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {combos.map((combo) => (
                  <ComboCard
                    key={combo.id}
                    combo={combo}
                    onQuickAdd={() => addCombo(combo)}
                    onCustomize={() => setCustomizingCombo(combo)}
                  />
                ))}
              </div>
            </div>
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
              className="w-full py-2 text-sm text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors"
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
          onCheckout={handleCheckout}
        />
      </div>

      <CheckoutDrawer
        open={checkoutOpen}
        onClose={handleCloseCheckout}
        onSuccess={handleSuccess}
      />

      {customizingCombo && (
        <ComboSelectorModal
          combo={customizingCombo}
          onConfirm={(selections) => addComboWithSelections(customizingCombo, selections)}
          onClose={() => setCustomizingCombo(null)}
        />
      )}
    </div>
  );
}
