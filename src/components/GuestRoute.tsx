// Mirror of ProtectedRoute that keeps authenticated users away from public-only pages.
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/useAuth";

interface GuestRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function GuestRoute({
  children,
  redirectTo = "/",
}: GuestRouteProps) {
  const { user, loading, passwordResetPending } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 font-semibold">A carregar...</div>
      </div>
    );
  }

  if (passwordResetPending && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }

  if (user) {
    const fallbackPath =
      typeof location.state?.from === "string"
        ? location.state.from
        : redirectTo;

    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
