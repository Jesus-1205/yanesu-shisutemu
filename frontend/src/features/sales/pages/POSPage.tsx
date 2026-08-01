import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingCart } from "lucide-react";
import { api } from "@/services/api";
import type { ProductOut } from "@/types/api";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import PageHeader from "@/ui-components/PageHeader";
import Table from "@/ui-components/Table";
import ToggleSwitch from "@/ui-components/ToggleSwitch";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency, formatRate } from "@/lib/utils";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCartStore } from "../store/cartStore";
import CartItemRow from "../components/CartItemRow";
import CheckoutDrawer from "../components/CheckoutDrawer";
import SplitAddButton from "../components/SplitAddButton";
import { usePosKeyboard } from "../hooks/usePosKeyboard";

export default function POSPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [search, setSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [hideNoStock, setHideNoStock] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.itemCount);
  const getTotals = useCartStore((s) => s.getTotals);
  const getTotalUsd = useCartStore((s) => s.getTotalUsd);
  const getTotalVes = useCartStore((s) => s.getTotalVes);
  const snapshotTasa = useCartStore((s) => s.snapshotTasa);

  const loadProducts = useCallback(async (q?: string) => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts(q ? { search: q } : undefined);
      setProducts(data.items);
    } catch {
      toast("Error al cargar productos", "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadProducts(search || undefined), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, loadProducts]);

  const totals = getTotals();
  const totalUsd = getTotalUsd();
  const totalVes = getTotalVes();
  const tasaNum = snapshotTasa;

  const filteredProducts = (hideNoStock
    ? products.filter((p) => p.stock_unidades > 0)
    : [...products]
  ).sort((a, b) => {
    const aHasStock = a.stock_unidades > 0 ? 0 : 1;
    const bHasStock = b.stock_unidades > 0 ? 0 : 1;
    if (aHasStock !== bHasStock) return aHasStock - bHasStock;
    return a.nombre.localeCompare(b.nombre, "es");
  });

  usePosKeyboard(
    searchRef,
    () => {
      if (itemCount() === 0) {
        toast("Agrega al menos un producto", "error");
        return;
      }
      setCheckoutOpen(true);
    },
    checkoutOpen,
    () => setCheckoutOpen(false),
  );

  const handleBarcode = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const trimmed = search.trim();
      if (!trimmed) return;
      const match = products.find((p) => p.codigo_barra === trimmed);
      if (!match) return;
      e.preventDefault();
      addItem(match, "UNIDAD");
      setSearch("");
    },
    [search, products, addItem],
  );

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
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleBarcode}
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

          <Table
            columns={[
              ...(!isOperator ? [{ key: "id", header: "ID" }] : []),
              { key: "nombre", header: "Nombre" },
              {
                key: "stock_unidades",
                header: "Stock",
                render: (p: ProductOut) => {
                  if (isOperator) {
                    return p.stock_unidades > 0
                      ? <Badge variant="success">Disponible</Badge>
                      : <Badge variant="danger">Agotado</Badge>;
                  }
                  return (
                    <span className={p.stock_unidades === 0 ? "text-danger font-semibold" : ""}>
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
                key: "acciones",
                header: "",
                exportable: false,
                className: "w-16",
                render: (p: ProductOut) => (
                  <SplitAddButton
                    onAddUnit={() => addItem(p, "UNIDAD")}
                    onAddBox={() => addItem(p, "CAJA")}
                    disabled={p.stock_unidades === 0}
                  />
                ),
              },
            ]}
            data={filteredProducts}
            keyExtractor={(p) => p.id}
            loading={loadingProducts}
            emptyMessage="No se encontraron productos"
          />
        </div>

        {/* Right panel: cart */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-2 text-lg font-semibold text-text-main">
            <ShoppingCart className="w-5 h-5" />
            Carrito ({itemCount()})
          </div>

          {itemCount() === 0 ? (
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

            {tasaNum <= 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span>⚠ Registra la tasa BCV antes de cobrar</span>
                <button
                  type="button"
                  onClick={() => navigate("/exchange-rates")}
                  className="font-semibold text-brand-blue hover:underline"
                >
                  Ir a tasas
                </button>
              </div>
            )}

            <Button
              variant="accent"
              className="w-full"
              disabled={itemCount() === 0}
              onClick={() => {
                if (itemCount() === 0) {
                  toast("Agrega al menos un producto", "error");
                  return;
                }
                if (tasaNum <= 0) {
                  toast("Registra la tasa BCV antes de vender", "error");
                  return;
                }
                setCheckoutOpen(true);
              }}
            >
              Cobrar
            </Button>
          </div>
        </div>
      </div>

      <CheckoutDrawer
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={() => {
          setCheckoutOpen(false);
          navigate("/sales");
        }}
      />
    </div>
  );
}
