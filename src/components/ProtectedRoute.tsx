import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/useAuth";
import type { UserRole } from "../types";

/**
 * Props for the ProtectedRoute component.
 */
interface ProtectedRouteProps {
  /** The content to render if the user is authorized. */
  children: ReactNode;
  /** Optional list of roles allowed to access the route. */
  allowedRoles?: UserRole[];
  /** The path to redirect to if unauthorized (default: "/login"). */
  redirectTo?: string;
}

/**
 * Guards child routes by waiting for auth state, redirecting anonymous users,
 * enforcing password-reset flow, and optionally filtering by user role.
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, loading, passwordResetPending } = useAuth();
  const location = useLocation();

  // Keep the page skeleton accessible until the auth state resolves.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 font-semibold">A carregar...</div>
      </div>
    );
  }

  // Bounce anonymous visitors to the desired entry point.
  if (!user) {
    return (
      <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
    );
  }

  // Force users to finish resetting their password before hitting other pages.
  if (passwordResetPending && location.pathname !== "/reset-password") {
    return (
      <Navigate
        to="/reset-password"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Deny access when the current role is outside the allowed list.
  if (allowedRoles && !allowedRoles.includes(user.type)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
