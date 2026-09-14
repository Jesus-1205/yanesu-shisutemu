import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut, ComboActiveOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

export function usePosCatalog() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [products, setProducts] = useState<ProductOut[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [hideNoStock, setHideNoStock] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [showPromos, setShowPromos] = useState(false);
  const [combos, setCombos] = useState<ComboActiveOut[]>([]);
  const [customizingCombo, setCustomizingCombo] = useState<ComboActiveOut | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevSearchRef = useRef(`${debouncedSearch}|${showAllFavorites}`);

  const loadProducts = useCallback(async (q?: string) => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts(q ? { search: q, page_size: 100 } : { page_size: 100 });
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

  const handleShowMore = useCallback(() => {
    setShowAllFavorites(true);
  }, []);

  const hasMoreFavorites = !search && !showAllFavorites && totalFavorites > 10;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const resetSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    loadFavorites(false);
  }, [loadFavorites]);

  return {
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
  };
}
