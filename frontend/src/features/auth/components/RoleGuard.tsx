import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface RoleGuardProps {
  allowedRoles: string[];
  children?: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // O un spinner de carga
  }

  if (!user || !allowedRoles.includes(user.rol_nombre)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
