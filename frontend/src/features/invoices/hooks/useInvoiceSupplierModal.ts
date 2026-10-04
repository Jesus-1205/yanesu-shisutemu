import { useCallback, useState } from "react";
import type { SupplierOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { useInvoiceFormStore } from "../store/invoiceFormStore";

export function useInvoiceSupplierModal() {
  const { toast } = useToast();
  const setField = useInvoiceFormStore((s) => s.setField);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalNombre, setSupplierModalNombre] = useState("");
  const [supplierCreated, setSupplierCreated] = useState<SupplierOut | null>(null);

  const openSupplierModal = useCallback((initialNombre: string = "") => {
    setSupplierModalNombre(initialNombre);
    setSupplierModalOpen(true);
  }, []);

  const closeSupplierModal = useCallback(() => {
    setSupplierModalOpen(false);
  }, []);

  const handleSupplierCreated = useCallback(
    (supplier: SupplierOut) => {
      setField("proveedorId", supplier.id);
      setSupplierCreated(supplier);
      toast(`Proveedor "${supplier.nombre}" creado`, "success");
    },
    [setField, toast]
  );

  return {
    supplierModalOpen,
    supplierModalNombre,
    supplierCreated,
    openSupplierModal,
    closeSupplierModal,
    handleSupplierCreated,
  };
}
