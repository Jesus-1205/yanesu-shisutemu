import { createContext, useContext, type ReactNode } from "react";
import { useAuthLogic, type UseAuthLogicReturn, type SetupAdminData } from "../hooks/useAuthLogic";
import type { UserOut } from "@/types/api";

export type AuthContextType = UseAuthLogicReturn;
export type { SetupAdminData, UserOut };

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthLogic();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
