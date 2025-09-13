// src/components/common/check-auth.jsx
import { Navigate, useLocation } from "react-router-dom";

function CheckAuth({ isAuthenticated, user, children }) {
  const location = useLocation();

  // Root should be public landing
  if (location.pathname === "/") {
    return <Navigate to="/shop/home" replace />;
  }

  // If already logged in, don't show auth pages
  const isAuthPage =
    location.pathname.startsWith("/auth/login") ||
    location.pathname.startsWith("/auth/register");

  if (isAuthenticated && isAuthPage) {
    return user?.role === "admin"
      ? <Navigate to="/admin/dashboard" replace />
      : <Navigate to="/shop/home" replace />;
  }

  // Do NOT block public shop routes here.
  return <>{children}</>;
}

export default CheckAuth;
