import { createContext, useContext } from "react";
import type { UseCreateProductReturn } from "../hooks/useCreateProduct";

export const CreateProductContext = createContext<UseCreateProductReturn | null>(null);

export function useCreateProductContext(): UseCreateProductReturn {
  const context = useContext(CreateProductContext);
  if (!context) {
    throw new Error("useCreateProductContext must be used within a CreateProductContext.Provider");
  }
  return context;
}
