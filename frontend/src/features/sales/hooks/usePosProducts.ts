import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api";
import type { ProductOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";

export function usePosProducts(debouncedSearch: string = "") {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [hideNoStock, setHideNoStock] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);

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
  }, [loadFavorites]);

  useEffect(() => {
    const current = `${debouncedSearch}|${showAllFavorites}`;
    if (prevSearchRef.current === current) return;
    prevSearchRef.current = current;
    if (!debouncedSearch.trim()) {
      loadFavorites(showAllFavorites);
    } else {
      loadProducts(debouncedSearch);
    }
  }, [debouncedSearch, loadProducts, loadFavorites, showAllFavorites]);

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

  const hasMoreFavorites = !debouncedSearch && !showAllFavorites && totalFavorites > 10;

  const reloadFavorites = useCallback(() => {
    setShowAllFavorites(false);
    loadFavorites(false);
  }, [loadFavorites]);

  return {
    products,
    loadingProducts,
    hideNoStock,
    setHideNoStock,
    filteredProducts,
    hasMoreFavorites,
    totalFavorites,
    handleShowMore,
    loadFavorites,
    loadProducts,
    reloadFavorites,
  };
}
