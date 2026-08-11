import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut } from "@/types/api";
import type { ComboActiveOut } from "@/types/api";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import PageHeader from "@/ui-components/PageHeader";
import Table from "@/ui-components/Table";
import ToggleSwitch from "@/ui-components/ToggleSwitch";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency, formatRate } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { useCartStore, computeTotals } from "../store/cartStore";
import CartItemRow from "../components/CartItemRow";
import CheckoutDrawer from "../components/CheckoutDrawer";
import SplitAddButton from "../components/SplitAddButton";
import ComboCard from "../components/ComboCard";
import ComboSelectorModal from "../components/ComboSelectorModal";
import { usePosKeyboard } from "../hooks/usePosKeyboard";
import { memo } from "react";

const ProductRow = memo(function ProductRow({
  product,
  isOperator,
  onAddUnit,
  onAddBox,
}: {
  product: ProductOut;
  isOperator: boolean;
  onAddUnit: () => void;
  onAddBox: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0 transition-colors duration-150 hover:bg-blue-50/40">
      {!isOperator && (
        <td className="px-4 py-3 text-text-main whitespace-nowrap">{product.id}</td>
      )}
      <td className="px-4 py-3 text-text-main whitespace-nowrap">{product.nombre}</td>
      <td className="px-4 py-3 text-text-main whitespace-nowrap">
        {isOperator ? (
          product.stock_unidades > 0 ? (
            <Badge variant="success">Disponible</Badge>
          ) : (
            <Badge variant="danger">Agotado</Badge>
          )
        ) : (
          <span className={product.stock_unidades === 0 ? "text-danger font-semibold" : ""}>
            {product.stock_unidades}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-text-main whitespace-nowrap">
        {formatCurrency(product.precio_unidad_usd)}
      </td>
      <td className="px-4 py-3 text-text-main whitespace-nowrap">
        {formatCurrency(product.precio_caja_usd)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap w-16">
        <SplitAddButton
          onAddUnit={onAddUnit}
          onAddBox={onAddBox}
          disabled={product.stock_unidades === 0 || (product.precio_unidad_usd <= 0 && product.precio_caja_usd <= 0)}
        />
      </td>
    </tr>
  );
});

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

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const addCombo = useCartStore((s) => s.addCombo);
  const addComboWithSelections = useCartStore((s) => s.addComboWithSelections);
  const snapshotTasa = useCartStore((s) => s.snapshotTasa);

  const totals = useMemo(() => computeTotals(items), [items]);
  const totalUsd = useMemo(
    () => totals.monto_exento_usd + totals.base_imponible_usd + totals.monto_iva_usd,
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

  const clearSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
  }, []);

  const handleCheckout = useCallback(() => {
    if (itemCount === 0) {
      toastRef.current("Agrega al menos un producto", "error");
      return;
    }
    setCheckoutOpen(true);
  }, [itemCount]);

  const handleCloseCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  usePosKeyboard(searchRef, handleCheckout, checkoutOpen, handleCloseCheckout, clearSearch);

  const handleBarcode = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const trimmed = searchRef.current?.value?.trim() ?? "";
      if (!trimmed) return;
      const match = products.find((p) => p.codigo_barra === trimmed);
      if (!match) return;
      e.preventDefault();
      addItem(match, "UNIDAD");
      setSearch("");
      setDebouncedSearch("");
    },
    [products, addItem],
  );

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

  const handleAddUnit = useCallback(
    (p: ProductOut) => () => addItem(p, "UNIDAD"),
    [addItem],
  );

  const handleAddBox = useCallback(
    (p: ProductOut) => () => addItem(p, "CAJA"),
    [addItem],
  );

  const columns = useMemo(
    () => [
      ...(!isOperator ? [{ key: "id", header: "ID" }] : []),
      { key: "nombre", header: "Nombre" },
      {
        key: "stock_unidades",
        header: "Stock",
        render: (p: ProductOut) => {
          const isAgotado = p.stock_cajas === 0 && p.stock_unidades === 0;
          if (isOperator) {
            return isAgotado
              ? <Badge variant="danger">Agotado</Badge>
              : <Badge variant="success">Disponible</Badge>;
          }
          if (p.unidades_por_caja > 1) {
            return (
              <span className={isAgotado ? "text-danger font-semibold text-xs" : "text-xs"}>
                {p.stock_cajas} cj | {p.stock_unidades} und
              </span>
            );
          }
          return (
            <span className={isAgotado ? "text-danger font-semibold" : ""}>
              {p.stock_unidades}
            </span>
          );
        },
      },
      {
        key: "precio_unidad_usd",
        header: "Precio Ud.",
        render: (p: ProductOut) => formatCurrency(p.precio_unidad_usd),
      },
      {
        key: "precio_caja_usd",
        header: "Precio Caja",
        render: (p: ProductOut) => formatCurrency(p.precio_caja_usd),
      },
      {
        key: "precio_divisas",
        header: "Precio Div.",
        render: (p: ProductOut) => {
          if (!p.precio_divisas_unidad && !p.precio_divisas_caja) {
            return <span className="text-slate-300">-</span>;
          }
          return (
            <div className="text-xs space-y-0.5">
              {p.precio_divisas_unidad && (
                <div className="text-success font-semibold">Ud: {formatCurrency(p.precio_divisas_unidad)}</div>
              )}
              {p.precio_divisas_caja && (
                <div className="text-success font-semibold">Cj: {formatCurrency(p.precio_divisas_caja)}</div>
              )}
            </div>
          );
        },
      },
      {
        key: "acciones",
        header: "",
        exportable: false,
        className: "w-16",
        render: (p: ProductOut) => {
          const hasDivisas = p.precio_divisas_unidad || p.precio_divisas_caja;
          return (
            <div className="flex flex-col gap-1">
              <SplitAddButton
                onAddUnit={() => addItem(p, "UNIDAD")}
                onAddBox={() => addItem(p, "CAJA")}
                disabled={
                  (p.stock_cajas === 0 && p.stock_unidades === 0) ||
                  (p.precio_unidad_usd <= 0 && p.precio_caja_usd <= 0)
                }
              />
              {hasDivisas && (
                <div className="inline-flex">
                  {p.precio_divisas_unidad && (
                    <button
                      type="button"
                      disabled={p.stock_unidades === 0}
                      onClick={() => addItem(p, "UNIDAD", 1, true)}
                      className="px-1.5 py-0.5 text-[10px] font-semibold rounded-l bg-success text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title={`Agregar unidad a ${formatCurrency(p.precio_divisas_unidad)} (divisas)`}
                    >
                      $Ud
                    </button>
                  )}
                  {p.precio_divisas_caja && (
                    <button
                      type="button"
                      disabled={p.stock_unidades === 0}
                      onClick={() => addItem(p, "CAJA", 1, true)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold ${p.precio_divisas_unidad ? "rounded-r" : "rounded"} bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                      title={`Agregar caja a ${formatCurrency(p.precio_divisas_caja)} (divisas)`}
                    >
                      $Cj
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
    ],
    [isOperator, addItem],
  );

  const keyExtractor = useCallback((p: ProductOut) => p.id, []);

  const handleOpenCheckout = useCallback(() => {
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
                onKeyDown={handleBarcode}
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

          {combos.length > 0 && (
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
          )}

          <Table
            columns={columns}
            data={filteredProducts}
            keyExtractor={keyExtractor}
            loading={loadingProducts}
            emptyMessage="No se encontraron productos"
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
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-2 text-lg font-semibold text-text-main">
            <ShoppingCart className="w-5 h-5" />
            Carrito ({itemCount})
          </div>

          {itemCount === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Selecciona productos para agregar
            </p>
          ) : (
            <div className="space-y-3">
              {Object.values(items).map((item) => (
                <CartItemRow key={item.cartItemId} item={item} />
              ))}
            </div>
          )}

          <div className="bg-surface rounded-xl border border-slate-200 p-4 space-y-3">
            {tasaNum > 0 && (
              <p className="text-xs text-slate-400 text-right">
                Tasa aplicada: {formatRate(tasaNum)}
              </p>
            )}

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Exento USD</span>
                <span>{formatCurrency(totals.monto_exento_usd)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Base imponible USD</span>
                <span>{formatCurrency(totals.base_imponible_usd)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IVA USD</span>
                <span>{formatCurrency(totals.monto_iva_usd)}</span>
              </div>
              <div className="flex justify-between font-bold text-text-main border-t border-slate-200 pt-2">
                <span>Total USD</span>
                <span className="text-info">{formatCurrency(totalUsd)}</span>
              </div>
              {tasaNum > 0 && (
                <div className="flex justify-between font-bold text-text-main">
                  <span>Total VES</span>
                  <span className="text-success">{formatCurrency(totalVes, "Bs ")}</span>
                </div>
              )}
            </div>

            <Button
              variant="accent"
              className="w-full"
              disabled={itemCount === 0}
              onClick={handleOpenCheckout}
            >
              Cobrar
            </Button>
          </div>
        </div>
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
