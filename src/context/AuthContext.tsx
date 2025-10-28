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
import type { OrganizationImpactStats, Profile, UserRole } from "../types";

interface AuthResponse {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

type SimpleResponse = Pick<AuthResponse, "success" | "error">;

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
  resetPassword: (email: string) => Promise<SimpleResponse>;
  updatePassword: (newPassword: string) => Promise<SimpleResponse>;
  passwordResetPending: boolean;
  completePasswordReset: () => void;
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
  city?: string | null;
  location?: string | null;
  mission?: string | null;
  vision?: string | null;
  history?: string | null;
  galleryUrls?: string[];
  impactStats?: OrganizationImpactStats | null;
};

const allowedRoles: UserRole[] = ["volunteer", "organization", "admin"];

const PASSWORD_RESET_STORAGE_KEY = "impacto-local:passwordResetPending";

function getInitialPasswordResetPending(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(PASSWORD_RESET_STORAGE_KEY) === "true";
}

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

  const mission = normalizeOptional(metadata.mission);
  const vision = normalizeOptional(metadata.vision);
  const history = normalizeOptional(metadata.history);

  const galleryUrls = Array.isArray(metadata.gallery_urls)
    ? (metadata.gallery_urls as unknown[])
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
    : [];

  return {
    email: user.email ?? emailFromMetadata ?? `${user.id}@placeholder.local`,
    name: nameFromMetadata ?? user.email ?? "Utilizador",
    type: role ?? "volunteer",
    avatarUrl: normalizeOptional(metadata.avatar_url),
    phone: normalizeOptional(metadata.phone),
    bio: normalizeOptional(metadata.bio),
    city: normalizeOptional(metadata.city),
    location: normalizeOptional(metadata.location),
    mission,
    vision,
    history,
    galleryUrls,
    impactStats: null,
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
    city: payload.city ?? null,
    location: payload.location ?? null,
    mission: payload.mission ?? null,
    vision: payload.vision ?? null,
    history: payload.history ?? null,
    galleryUrls: payload.galleryUrls ?? [],
    impactStats: payload.impactStats ?? null,
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
  const normalizeText = (value?: string | null): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const sanitizeGalleryUrls = (urls?: string[]): string[] => {
    if (!Array.isArray(urls)) return [];
    return urls
      .filter((url): url is string => typeof url === "string")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  };

  const normalizeStatValue = (
    value: number | null | undefined
  ): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    return rounded < 0 ? 0 : rounded;
  };

  const mission = normalizeText(payload.mission ?? null);
  const vision = normalizeText(payload.vision ?? null);
  const history = normalizeText(payload.history ?? null);
  const galleryUrls = sanitizeGalleryUrls(payload.galleryUrls);

  const stats = payload.impactStats ?? null;
  const statsEventsHeld = normalizeStatValue(stats?.eventsHeld);
  const statsVolunteersImpacted = normalizeStatValue(stats?.volunteersImpacted);
  const statsHoursContributed = normalizeStatValue(stats?.hoursContributed);
  const statsBeneficiariesServed = normalizeStatValue(
    stats?.beneficiariesServed
  );

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: payload.email,
      name: payload.name,
      type: payload.type,
      avatar_url: payload.avatarUrl ?? null,
      phone: payload.phone ?? null,
      bio: payload.bio ?? null,
      city: payload.city ?? null,
      location: payload.location ?? null,
      mission,
      vision,
      history,
      gallery_urls: galleryUrls,
      stats_events_held: statsEventsHeld,
      stats_volunteers_impacted: statsVolunteersImpacted,
      stats_hours_contributed: statsHoursContributed,
      stats_beneficiaries_served: statsBeneficiariesServed,
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
  const [passwordResetPending, setPasswordResetPending] = useState<boolean>(
    () => getInitialPasswordResetPending()
  );

  const markPasswordResetPending = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PASSWORD_RESET_STORAGE_KEY, "true");
    }
    setPasswordResetPending(true);
  }, []);

  const clearPasswordResetPending = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
    }
    setPasswordResetPending(false);
  }, []);

  const completePasswordReset = useCallback(() => {
    clearPasswordResetPending();
  }, [clearPasswordResetPending]);

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
          clearPasswordResetPending();
          const profile = await resolveProfile(session.user);
          setUser(profile);
        }

        if (event === "PASSWORD_RECOVERY" && session?.user) {
          markPasswordResetPending();
          const profile = await resolveProfile(session.user);
          setUser(profile);
        }

        if (event === "SIGNED_OUT") {
          clearPasswordResetPending();
          setUser(null);
        }
      }
    );

    initialise();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveProfile, clearPasswordResetPending, markPasswordResetPending]);

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
        clearPasswordResetPending();

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
    [resolveProfile, clearPasswordResetPending]
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
          clearPasswordResetPending();
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
    [resolveProfile, clearPasswordResetPending]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    clearPasswordResetPending();
  }, [clearPasswordResetPending]);

  const resetPassword = useCallback(
    async (email: string): Promise<SimpleResponse> => {
      setAuthLoading(true);
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

        if (error) throw error;

        return { success: true };
      } catch (error: unknown) {
        console.error("Password reset request error:", error);

        let message = "Não foi possível enviar o email de recuperação.";

        if (error instanceof AuthApiError || error instanceof AuthError) {
          message = error.message;
        } else if (error instanceof Error) {
          message = error.message;
        }

        return { success: false, error: message };
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const updatePassword = useCallback(
    async (newPassword: string): Promise<SimpleResponse> => {
      setAuthLoading(true);
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;

        if (data.user) {
          const profile = await resolveProfile(data.user);
          setUser(profile);
          clearPasswordResetPending();
        }

        return { success: true };
      } catch (error: unknown) {
        console.error("Password update error:", error);

        let message = "Não foi possível atualizar a password.";

        if (error instanceof AuthApiError || error instanceof AuthError) {
          message = error.message;
        } else if (error instanceof Error) {
          message = error.message;
        }

        return { success: false, error: message };
      } finally {
        setAuthLoading(false);
      }
    },
    [resolveProfile, clearPasswordResetPending]
  );

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
      isAuthenticated: !!user && !passwordResetPending,
      resetPassword,
      updatePassword,
      passwordResetPending,
      completePasswordReset,
    }),
    [
      user,
      loading,
      authLoading,
      login,
      register,
      logout,
      refreshProfile,
      resetPassword,
      updatePassword,
      passwordResetPending,
      completePasswordReset,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
