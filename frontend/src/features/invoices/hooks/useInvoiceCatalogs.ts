import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { CategoryOut, ProductOut, SupplierOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { useInvoiceFormStore } from "../store/invoiceFormStore";

export interface ComboboxOption {
  value: number;
  label: string;
  subtitle?: string;
}

export interface UseInvoiceCatalogsReturn {
  suppliers: SupplierOut[];
  products: ProductOut[];
  categoryModalOpen: boolean;
  productModalOpen: boolean;
  setCategoryModalOpen: (open: boolean) => void;
  setProductModalOpen: (open: boolean) => void;
  handleSearchProducts: (query: string) => Promise<ComboboxOption[]>;
  handleSearchSuppliers: (query: string) => Promise<ComboboxOption[]>;
  handleSupplierCreated: (supplier: SupplierOut) => void;
  handleCategoryCreated: (cat: CategoryOut) => void;
  handleProductCreated: (product: ProductOut) => void;
}

export function useInvoiceCatalogs(): UseInvoiceCatalogsReturn {
  const { toast } = useToast();
  const store = useInvoiceFormStore();

  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  const handleSearchProducts = useCallback(async (query: string) => {
    const data = await api.getProducts({ search: query || undefined });
    setProducts(data.items);
    return data.items.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.codigo_barra || undefined,
    }));
  }, []);

  const handleSearchSuppliers = useCallback(async (query: string) => {
    const data = await api.getSuppliers({ search: query || undefined });
    setSuppliers(data);
    return data.map((s) => ({
      value: s.id,
      label: s.nombre,
    }));
  }, []);

  const handleSupplierCreated = useCallback((supplier: SupplierOut) => {
    setSuppliers((prev) => [...prev, supplier]);
    store.setField("proveedorId", supplier.id);
    toast(`Proveedor "${supplier.nombre}" creado`, "success");
  }, [store, toast]);

  const handleCategoryCreated = useCallback((cat: CategoryOut) => {
    toast(`Categoría "${cat.nombre}" creada`, "success");
  }, [toast]);

  const handleProductCreated = useCallback((product: ProductOut) => {
    setProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
    toast(`Producto "${product.nombre}" creado`, "success");
  }, [toast]);

  return {
    suppliers,
    products,
    categoryModalOpen,
    productModalOpen,
    setCategoryModalOpen,
    setProductModalOpen,
    handleSearchProducts,
    handleSearchSuppliers,
    handleSupplierCreated,
    handleCategoryCreated,
    handleProductCreated,
  };
}
