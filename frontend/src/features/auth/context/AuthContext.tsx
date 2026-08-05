import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "@/services/api";
import type { UserOut } from "@/types/api";

const DEV_MODE = import.meta.env.VITE_SKIP_AUTH === "true" || localStorage.getItem("skip-auth") === "true";

const DEV_USER: UserOut = {
  id: 1,
  username: "dev",
  email: "dev@yanesu.test",
  nombre_completo: "Usuario Desarrollo",
  rol_id: 1,
  rol_nombre: "ADMINISTRADOR",
  is_active: true,
  created_at: new Date().toISOString(),
};

interface AuthContextType {
  user: UserOut | null;
  loading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupAdmin: (data: {
    username: string;
    email: string;
    password: string;
    nombre_completo: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(DEV_MODE ? DEV_USER : null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (DEV_MODE) {
      setLoading(false);
      return;
    }
    api.getSetupStatus()
      .then((res) => {
        if (res.needs_setup) {
          setNeedsSetup(true);
          setLoading(false);
        } else {
          api.me()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
        }
      })
      .catch(() => {
        api.me()
          .then(setUser)
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password);
    setUser(u);
    setNeedsSetup(false);
  }, []);

  const logout = useCallback(async () => {
    if (DEV_MODE) {
      setUser(null);
      return;
    }
    await api.logout();
    setUser(null);
  }, []);

  const setupAdmin = useCallback(async (data: {
    username: string;
    email: string;
    password: string;
    nombre_completo: string;
  }) => {
    const u = await api.setupAdmin(data);
    setUser(u);
    setNeedsSetup(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, needsSetup, login, logout, setupAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
