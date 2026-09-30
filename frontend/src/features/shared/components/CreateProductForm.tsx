import React from "react";
import Button from "@/ui-components/Button";
import { CreateProductContext } from "../context/CreateProductContext";
import CreateProductCompactFields from "./CreateProductCompactFields";
import CreateProductGeneralInfoFields from "./CreateProductGeneralInfoFields";
import CreateProductPricingFields from "./CreateProductPricingFields";
import type { UseCreateProductReturn } from "../hooks/useCreateProduct";

export interface CreateProductFormProps {
  hook: UseCreateProductReturn;
  compact?: boolean;
}

export const CreateProductForm: React.FC<CreateProductFormProps> = ({ hook, compact = false }) => {
  const { saving, error, handleClose, handleSubmit } = hook;

  return (
    <CreateProductContext.Provider value={hook}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className={compact ? "" : "-mx-6 max-h-[60vh] overflow-y-auto px-6"}>
          {compact ? (
            <CreateProductCompactFields />
          ) : (
            <div className="grid grid-cols-1 gap-5 pb-4 lg:grid-cols-2">
              <CreateProductGeneralInfoFields />
              <CreateProductPricingFields />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            Crear producto
          </Button>
        </div>
      </form>
    </CreateProductContext.Provider>
  );
};

export default CreateProductForm;
