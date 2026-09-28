import { useState, useId } from "react";
import type { CategoryOut, SupplierOut } from "@/types/api";
import type { UseProductFormReturn } from "../hooks/useProductForm";
import { ProductFormGeneralInfo } from "./ProductFormGeneralInfo";
import { ProductFormPricing } from "./ProductFormPricing";
import Button from "@/ui-components/Button";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";

export interface ProductFormProps {
  formAPI: UseProductFormReturn;
  isOperator: boolean;
  saving: boolean;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function ProductForm({
  formAPI,
  isOperator,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const uid = useId();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const fieldId = (name: string) => `${uid}-${name}`;

  const handleCategoryCreated = (cat: CategoryOut) => {
    formAPI.onCategoryCreated(cat);
    setCategoryModalOpen(false);
  };

  const handleSupplierCreated = (sup: SupplierOut) => {
    formAPI.onSupplierCreated(sup);
    setSupplierModalOpen(false);
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductFormGeneralInfo
          formAPI={formAPI}
          isOperator={isOperator}
          onOpenCreateCategory={() => setCategoryModalOpen(true)}
          onOpenCreateSupplier={() => setSupplierModalOpen(true)}
          fieldId={fieldId}
        />

        <ProductFormPricing
          formAPI={formAPI}
          isOperator={isOperator}
          fieldId={fieldId}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" loading={saving}>
          {submitLabel}
        </Button>
      </div>

      <CreateCategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={handleCategoryCreated}
      />
      <CreateSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={handleSupplierCreated}
      />
    </form>
  );
}
