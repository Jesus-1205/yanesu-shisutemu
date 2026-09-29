import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { Supplier } from "../types";

const PAGE_SIZE = 20;

export function useSuppliersList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState("");

  const fetchSuppliers = useCallback(async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSuppliersPaginated({ page: pageNum, page_size: PAGE_SIZE });
      setSuppliers(res.items);
      setTotalPages(res.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSuppliers(page);
  }, [fetchSuppliers, page]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && suppliers.length > 0) {
      const id = Number(openId);
      const supplier = suppliers.find((s) => s.id === id);
      if (supplier) {
        setSelectedSupplierId(id);
        setSelectedSupplierName(supplier.nombre);
        setDrawerOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, suppliers, setSearchParams]);

  const openDrawer = useCallback((supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    setSelectedSupplierName(supplier.nombre);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const refetch = useCallback(() => {
    fetchSuppliers(page);
  }, [fetchSuppliers, page]);

  return {
    suppliers,
    loading,
    error,
    page,
    totalPages,
    setPage,
    refetch,
    drawerOpen,
    selectedSupplierId,
    selectedSupplierName,
    openDrawer,
    closeDrawer,
  };
}
