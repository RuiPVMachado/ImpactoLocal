import type { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthContext } from "../context/AuthContext";
import type { Profile } from "../types";

type AuthProviderValue = NonNullable<
  Parameters<typeof AuthContext.Provider>[0]["value"]
>;

const createProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "profile-id",
  email: "user@example.com",
  name: "Utilizador",
  type: "volunteer",
  avatarUrl: null,
  phone: null,
  bio: null,
  city: null,
  location: null,
  mission: null,
  vision: null,
  history: null,
  galleryUrls: [],
  impactStats: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function makeAuthValue(
  overrides: Partial<AuthProviderValue> = {}
): AuthProviderValue {
  const base: AuthProviderValue = {
    user: null,
    loading: false,
    authLoading: false,
    login: async () => ({ success: true, error: undefined }),
    register: async () => ({ success: true, error: undefined }),
    logout: async () => {},
    refreshProfile: async () => {},
    isAuthenticated: false,
    resetPassword: async () => ({ success: true, error: undefined }),
    updatePassword: async () => ({ success: true, error: undefined }),
    passwordResetPending: false,
    completePasswordReset: () => {},
    isOnline: true,
    lastProfileRefresh: null,
  };
  return { ...base, ...overrides };
}

function withAuth(ui: ReactNode, authValue: AuthProviderValue) {
  return <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>;
}

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /login", () => {
    const auth = makeAuthValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      passwordResetPending: false,
    });

    render(
      withAuth(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>,
        auth
      )
    );

    expect(screen.getByText(/login page/i)).toBeInTheDocument();
  });

  it("redirects to /reset-password when passwordResetPending is true", () => {
    const auth = makeAuthValue({
      user: createProfile({ id: "u1", type: "volunteer" }),
      isAuthenticated: true,
      loading: false,
      passwordResetPending: true,
    });

    render(
      withAuth(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reset-password"
              element={<div>Reset Password Page</div>}
            />
          </Routes>
        </MemoryRouter>,
        auth
      )
    );

    expect(screen.getByText(/reset password page/i)).toBeInTheDocument();
  });

  it("redirects role-mismatched users to /", () => {
    const auth = makeAuthValue({
      user: createProfile({ id: "u2", type: "volunteer" }),
      isAuthenticated: true,
      loading: false,
      passwordResetPending: false,
    });

    render(
      withAuth(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <div>Admin Secret</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
        auth
      )
    );

    expect(screen.getByText(/home page/i)).toBeInTheDocument();
  });

  it("renders children when authenticated and allowed", () => {
    const auth = makeAuthValue({
      user: createProfile({ id: "u3", type: "admin" }),
      isAuthenticated: true,
      loading: false,
      passwordResetPending: false,
    });

    render(
      withAuth(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <div>Admin Secret</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
        auth
      )
    );

    expect(screen.getByText(/admin secret/i)).toBeInTheDocument();
  });
});
