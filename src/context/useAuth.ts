import { useContext } from "react";
import { AuthContext } from "./AuthContext";

// Convenience hook that enforces AuthProvider presence and exposes the typed context value.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
