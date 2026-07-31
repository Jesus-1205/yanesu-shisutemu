import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user?.rol_nombre === "ADMINISTRADOR") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/sales/new" replace />;
}
