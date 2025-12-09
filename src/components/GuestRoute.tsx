// Mirror of ProtectedRoute that keeps authenticated users away from public-only pages.
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/useAuth";

/**
 * Props for the GuestRoute component.
 */
interface GuestRouteProps {
  /** The content to render if the user is not authenticated. */
  children: ReactNode;
  /** The path to redirect to if the user is authenticated (default: "/"). */
  redirectTo?: string;
}

/**
 * A wrapper component for routes that should only be accessible to unauthenticated users.
 * Redirects authenticated users to the specified path or the page they came from.
 */
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
