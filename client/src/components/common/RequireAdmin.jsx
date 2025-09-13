// src/components/common/RequireAdmin.jsx
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAdmin({ isAuthenticated, user, children }) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  if (user?.role !== "admin") {
    return <Navigate to="/unauth-page" replace />;
  }
  return <>{children}</>;
}
