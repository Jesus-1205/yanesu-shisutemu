import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "@/services/api";
import type { UserOut } from "@/types/api";

const DEV_MODE = import.meta.env.VITE_SKIP_AUTH === "true" || localStorage.getItem("skip-auth") === "true";

const DEV_USER: UserOut = {
  id: 1,
  username: "dev",
  email: "dev@licoreria.test",
  nombre_completo: "Usuario Desarrollo",
  rol_id: 1,
  rol_nombre: "ADMINISTRADOR",
  is_active: true,
  created_at: new Date().toISOString(),
};

interface AuthContextType {
  user: UserOut | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(DEV_MODE ? DEV_USER : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEV_MODE) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    if (DEV_MODE) {
      setUser(null);
      return;
    }
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
