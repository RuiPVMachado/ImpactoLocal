import {
  createContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
  useRef,
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
  // New additions
  isOnline: boolean;
  lastProfileRefresh: Date | null;
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
const PROFILE_CACHE_KEY = "impacto-local:profileCache";
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Auto-refresh interval (15 minutes)
const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000;

// Rate limit for refreshProfile (1 second between calls)
const REFRESH_RATE_LIMIT_MS = 1000;

interface CachedProfile {
  profile: Profile;
  timestamp: number;
  userId: string;
}

function getCachedProfile(userId: string): Profile | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedProfile = JSON.parse(cached);
    const now = Date.now();

    // Validate cache: same user, not expired, and has valid profile data
    if (
      parsed.userId === userId &&
      parsed.timestamp &&
      now - parsed.timestamp < PROFILE_CACHE_TTL &&
      parsed.profile &&
      parsed.profile.id === userId &&
      parsed.profile.email &&
      parsed.profile.name
    ) {
      return parsed.profile;
    }

    // Clean up expired or invalid cache
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
    return null;
  } catch (error) {
    // If cache is corrupted, clear it
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROFILE_CACHE_KEY);
    }
    console.warn("Failed to read cached profile", error);
    return null;
  }
}

function setCachedProfile(userId: string, profile: Profile): void {
  if (typeof window === "undefined") return;

  try {
    const cached: CachedProfile = {
      profile,
      timestamp: Date.now(),
      userId,
    };
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn("Failed to cache profile", error);
  }
}

function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_CACHE_KEY);
}

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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) - these are permanent failures
      if (
        error instanceof AuthApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429 // But retry on rate limits
      ) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) break;

      // Exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function safeFetchProfileById(
  userId: string,
  timeoutMs = 5000,
  useRetry = true
): Promise<Profile | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  const fetchProfile = async (): Promise<Profile | null> => {
    const profile = await fetchProfileById(userId);
    if (profile) {
      setCachedProfile(userId, profile);
    }
    return profile;
  };

  try {
    if (useRetry) {
      const result = await Promise.race<Profile | null>([
        retryWithBackoff(fetchProfile, 2, 500),
        timeoutPromise,
      ]);
      return result;
    } else {
      return await Promise.race<Profile | null>([
        fetchProfile(),
        timeoutPromise,
      ]);
    }
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

  return safeFetchProfileById(user.id, 5000, false);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [passwordResetPending, setPasswordResetPending] = useState<boolean>(
    () => getInitialPasswordResetPending()
  );
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [lastProfileRefresh, setLastProfileRefresh] = useState<Date | null>(
    null
  );

  // Rate limiting for refreshProfile
  const lastRefreshRef = useRef<number>(0);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
    async (authUser: User, useCache = true): Promise<Profile> => {
      try {
        // Try cache first if enabled
        if (useCache) {
          const cached = getCachedProfile(authUser.id);
          if (cached) {
            return cached;
          }
        }

        // Try fetching from database
        try {
          const existingProfile = await safeFetchProfileById(authUser.id);
          if (existingProfile) {
            return existingProfile;
          }
        } catch (fetchError) {
          console.warn("Failed to fetch profile from database", fetchError);
          // Continue to fallback
        }

        // Fallback to building from auth user metadata
        const fallbackProfile = buildProfileFromAuthUser(authUser);

        // Attempt to sync in background (non-blocking)
        void (async () => {
          try {
            const syncedProfile = await syncProfileFromAuthUser(authUser);
            if (syncedProfile) {
              setUser((current) =>
                current && current.id === authUser.id ? syncedProfile : current
              );
              setLastProfileRefresh(new Date());
            }
          } catch (syncError) {
            console.warn("Failed to sync profile", syncError);
          }
        })();

        return fallbackProfile;
      } catch (error) {
        // Ultimate fallback - always return a profile even if everything fails
        console.error("Critical error in resolveProfile", error);
        return buildProfileFromAuthUser(authUser);
      }
    },
    [setUser]
  );

  // Auto-refresh profile periodically
  useEffect(() => {
    if (!user || !isOnline) {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      return;
    }

    const userId = user.id;
    autoRefreshIntervalRef.current = setInterval(async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser && authUser.id === userId) {
          const profile = await resolveProfile(authUser, false); // Force fresh fetch
          setUser((current) =>
            current && current.id === userId ? profile : current
          );
          setLastProfileRefresh(new Date());
        }
      } catch (error) {
        console.warn("Auto-refresh profile failed", error);
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [user, isOnline, resolveProfile]);

  useEffect(() => {
    let mounted = true;

    const initialise = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          try {
            const profile = await resolveProfile(session.user);
            if (mounted) {
              setUser(profile);
              setLastProfileRefresh(new Date());
            }
          } catch (profileError) {
            console.error("Failed to resolve profile", profileError);
            // Continue even if profile resolution fails
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
          if (mounted) {
            setUser(profile);
            setLastProfileRefresh(new Date());
          }
        }

        if (event === "PASSWORD_RECOVERY" && session?.user) {
          markPasswordResetPending();
          const profile = await resolveProfile(session.user);
          if (mounted) {
            setUser(profile);
            setLastProfileRefresh(new Date());
          }
        }

        if (event === "SIGNED_OUT") {
          clearPasswordResetPending();
          clearCachedProfile();
          if (mounted) {
            setUser(null);
            setLastProfileRefresh(null);
          }
        }

        if (event === "TOKEN_REFRESHED" && session?.user) {
          // Silently refresh profile when token is refreshed
          void (async () => {
            const profile = await resolveProfile(session.user, false);
            if (mounted) {
              setUser((current) =>
                current && current.id === session.user.id ? profile : current
              );
              setLastProfileRefresh(new Date());
            }
          })();
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

        const profile = await resolveProfile(data.user, false); // Fresh fetch on login
        setUser(profile);
        setLastProfileRefresh(new Date());
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
          const profile = await resolveProfile(data.user, false);
          setUser(profile);
          setLastProfileRefresh(new Date());
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
    clearCachedProfile();
    clearPasswordResetPending();
    setLastProfileRefresh(null);
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
          const profile = await resolveProfile(data.user, false);
          setUser(profile);
          setLastProfileRefresh(new Date());
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
    // Rate limiting: prevent multiple rapid calls
    const now = Date.now();
    if (now - lastRefreshRef.current < REFRESH_RATE_LIMIT_MS) {
      return;
    }
    lastRefreshRef.current = now;

    // Don't refresh if offline
    if (!isOnline) {
      console.warn("Cannot refresh profile: offline");
      return;
    }

    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      if (!authUser) return;

      const profile = await resolveProfile(authUser, false); // Force fresh fetch
      setUser(profile);
      setLastProfileRefresh(new Date());
    } catch (error) {
      console.error("Failed to refresh profile", error);
    }
  }, [resolveProfile, isOnline]);

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
      isOnline,
      lastProfileRefresh,
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
      isOnline,
      lastProfileRefresh,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
