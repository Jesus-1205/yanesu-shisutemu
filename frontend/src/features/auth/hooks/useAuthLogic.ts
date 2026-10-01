import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { UserOut } from "@/types/api";

export interface SetupAdminData {
  username: string;
  email: string;
  password: string;
  nombre_completo: string;
}

export interface UseAuthLogicReturn {
  user: UserOut | null;
  loading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupAdmin: (data: SetupAdminData) => Promise<void>;
}

export function useAuthLogic(): UseAuthLogicReturn {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let isMounted = true;

    api.getSetupStatus()
      .then((res) => {
        if (!isMounted) return;
        if (res.needs_setup) {
          setNeedsSetup(true);
          setLoading(false);
        } else {
          api.me()
            .then((u) => {
              if (isMounted) setUser(u);
            })
            .catch(() => {
              if (isMounted) setUser(null);
            })
            .finally(() => {
              if (isMounted) setLoading(false);
            });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        api.me()
          .then((u) => {
            if (isMounted) setUser(u);
          })
          .catch(() => {
            if (isMounted) setUser(null);
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password);
    setUser(u);
    setNeedsSetup(false);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const setupAdmin = useCallback(async (data: SetupAdminData) => {
    const u = await api.setupAdmin(data);
    setUser(u);
    setNeedsSetup(false);
  }, []);

  return {
    user,
    loading,
    needsSetup,
    login,
    logout,
    setupAdmin,
  };
}
