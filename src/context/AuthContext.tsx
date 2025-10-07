import {
  createContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  AuthApiError,
  AuthError,
  type AuthChangeEvent,
  type PostgrestError,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { fetchProfileById } from "../lib/api";
import type { Profile, UserRole } from "../types";

interface AuthResponse {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (
    email: string,
    password: string,
    name: string,
    type: UserRole
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "code" in error &&
    "details" in error
  );
}

type ProfileUpsertPayload = {
  email: string;
  name: string;
  type: UserRole;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
};

const allowedRoles: UserRole[] = ["volunteer", "organization", "admin"];

function extractProfilePayloadFromUser(user: User): ProfileUpsertPayload {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const emailFromMetadata =
    typeof metadata.email === "string" && metadata.email.trim().length > 0
      ? metadata.email.trim()
      : undefined;

  const nameFromMetadata =
    typeof metadata.name === "string" && metadata.name.trim().length > 0
      ? metadata.name.trim()
      : undefined;

  const rawType =
    typeof metadata.type === "string" && metadata.type.trim().length > 0
      ? metadata.type.trim()
      : undefined;
  const role =
    rawType && allowedRoles.includes(rawType as UserRole)
      ? (rawType as UserRole)
      : undefined;

  const normalizeOptional = (value: unknown): string | null => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  };

  return {
    email: user.email ?? emailFromMetadata ?? `${user.id}@placeholder.local`,
    name: nameFromMetadata ?? user.email ?? "Utilizador",
    type: role ?? "volunteer",
    avatarUrl: normalizeOptional(metadata.avatar_url),
    phone: normalizeOptional(metadata.phone),
    bio: normalizeOptional(metadata.bio),
    location: normalizeOptional(metadata.location),
  };
}

function buildProfileFromAuthUser(user: User): Profile {
  const payload = extractProfilePayloadFromUser(user);
  return {
    id: user.id,
    email: payload.email,
    name: payload.name,
    type: payload.type,
    avatarUrl: payload.avatarUrl ?? null,
    phone: payload.phone ?? null,
    bio: payload.bio ?? null,
    location: payload.location ?? null,
    createdAt: user.created_at ?? new Date().toISOString(),
    updatedAt: user.updated_at ?? new Date().toISOString(),
  };
}

async function safeFetchProfileById(
  userId: string,
  timeoutMs = 5000
): Promise<Profile | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race<Profile | null>([
      fetchProfileById(userId),
      timeoutPromise,
    ]);
  } catch (error) {
    console.error(`Failed to fetch profile for user ${userId}`, error);
    return null;
  }
}

async function createProfileRecord(
  userId: string,
  payload: ProfileUpsertPayload
) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: payload.email,
      name: payload.name,
      type: payload.type,
      avatar_url: payload.avatarUrl ?? null,
      phone: payload.phone ?? null,
      bio: payload.bio ?? null,
      location: payload.location ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

async function syncProfileFromAuthUser(user: User): Promise<Profile | null> {
  const payload = extractProfilePayloadFromUser(user);

  try {
    await createProfileRecord(user.id, payload);
  } catch (error) {
    console.error(`Failed to upsert profile for user ${user.id}`, error);
    return null;
  }

  return safeFetchProfileById(user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const resolveProfile = useCallback(
    async (authUser: User): Promise<Profile> => {
      const existingProfile = await safeFetchProfileById(authUser.id);
      if (existingProfile) {
        return existingProfile;
      }

      const fallbackProfile = buildProfileFromAuthUser(authUser);

      void (async () => {
        const syncedProfile = await syncProfileFromAuthUser(authUser);
        if (syncedProfile) {
          setUser((current) =>
            current && current.id === authUser.id ? syncedProfile : current
          );
        }
      })();

      return fallbackProfile;
    },
    [setUser]
  );

  useEffect(() => {
    let mounted = true;

    const initialise = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await resolveProfile(session.user);
          if (mounted) {
            setUser(profile);
          }
        }
      } catch (error) {
        console.error("Failed to retrieve session", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          const profile = await resolveProfile(session.user);
          setUser(profile);
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    initialise();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveProfile]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      setAuthLoading(true);
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        if (!data.user) {
          return {
            success: false,
            error: "Não foi possível obter os dados do utilizador.",
          };
        }

        const profile = await resolveProfile(data.user);
        setUser(profile);

        return { success: true };
      } catch (error: unknown) {
        console.error("Login error:", error);

        let message = "Não foi possível iniciar sessão.";
        let requiresEmailConfirmation = false;

        if (error instanceof AuthApiError || error instanceof AuthError) {
          const normalizedMessage = error.message.toLowerCase();

          if (normalizedMessage.includes("email not confirmed")) {
            requiresEmailConfirmation = true;
            message = "Confirme o seu email antes de iniciar sessão.";
          } else if (normalizedMessage.includes("invalid login credentials")) {
            message = "Credenciais inválidas. Verifique o email e a password.";
          } else {
            message = error.message;
          }
        } else if (isPostgrestError(error)) {
          const normalizedMessage = error.message.toLowerCase();

          if (error.code === "42P01") {
            message =
              "A base de dados ainda não está configurada. Execute o schema no Supabase para criar a tabela 'profiles' e restantes tabelas.";
          } else if (normalizedMessage.includes("row-level security")) {
            message =
              "Não foi possível carregar o perfil. Verifique as políticas RLS da tabela profiles no Supabase.";
          } else if (error.details) {
            message = error.details;
          } else if (error.hint) {
            message = error.hint;
          } else {
            message = error.message;
          }
        } else if (error instanceof Error) {
          message = error.message;
        }

        return { success: false, error: message, requiresEmailConfirmation };
      } finally {
        setAuthLoading(false);
      }
    },
    [resolveProfile]
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      type: UserRole
    ): Promise<AuthResponse> => {
      setAuthLoading(true);
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name,
              type,
            },
          },
        });

        if (error) throw error;

        if (data.user && data.session) {
          const profile = await resolveProfile(data.user);
          setUser(profile);
        }

        return {
          success: true,
          requiresEmailConfirmation: !data.session,
        };
      } catch (error: unknown) {
        console.error("Registration error:", error);

        let message = "Não foi possível concluir o registo.";
        if (error instanceof AuthApiError) {
          const normalizedMessage = error.message.toLowerCase();

          if (error.status === 422) {
            message =
              "Email inválido. Verifique o formato e se o domínio é permitido.";
          } else if (normalizedMessage.includes("user already registered")) {
            message =
              "Já existe uma conta com este email. Inicie sessão ou recupere a password.";
          } else {
            message = error.message || message;
          }
        } else if (isPostgrestError(error)) {
          if (error.code === "42P01") {
            message =
              "A base de dados ainda não está configurada. Execute o schema no Supabase para criar a tabela 'profiles' e restantes tabelas.";
          } else if (error.details) {
            message = error.details;
          } else if (error.hint) {
            message = error.hint;
          } else {
            message = error.message;
          }
        } else if (error instanceof Error) {
          message = error.message;
        }

        return { success: false, error: message };
      } finally {
        setAuthLoading(false);
      }
    },
    [resolveProfile]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      if (!authUser) return;

      const profile = await resolveProfile(authUser);
      setUser(profile);
    } catch (error) {
      console.error("Failed to refresh profile", error);
    }
  }, [resolveProfile]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      authLoading,
      login,
      register,
      logout,
      refreshProfile,
      isAuthenticated: !!user,
    }),
    [user, loading, authLoading, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
