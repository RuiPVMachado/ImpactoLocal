import { supabase } from "./supabase";
import { notifyApplicationSubmitted } from "./notifications";
import { MIN_EVENT_START_LEEWAY_MS } from "./datetime";

/**
 * Centralized data-access helpers that wrap Supabase queries and edge functions.
 * This module handles all interactions with the backend, including:
 * - Fetching and updating events
 * - Managing user profiles and organizations
 * - Handling volunteer applications
 * - Admin operations
 */
import type {
  AdminMetrics,
  Application,
  ApplicationStats,
  Event,
  Notification,
  OrganizationDashboardSummary,
  OrganizationImpactStats,
  OrganizationDirectoryEntry,
  OrganizationPublicProfile,
  Profile,
  ProfileSummary,
  UserRole,
  VolunteerApplication,
  ApplicationStatus,
  VolunteerStatistics,
} from "../types";

/**
 * Filters for querying events.
 */
type EventFilters = {
  category?: string;
  searchTerm?: string;
  status?: "open" | "closed" | "completed";
  limit?: number;
  page?: number;
  pageSize?: number;
};

/**
 * Generic paginated response structure.
 */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
};

type CreateEventPayload = {
  organizationId: string;
  title: string;
  description: string;
  category: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  date: string;
  duration: string;
  volunteersNeeded: number;
  imageUrl?: string | null;
  postEventSummary?: string | null;
  postEventGalleryUrls?: string[] | null;
};

type UpdateEventPayload = Partial<
  Omit<CreateEventPayload, "organizationId">
> & {
  status?: "open" | "closed" | "completed";
};

type ApplicationPayload = {
  eventId: string;
  volunteerId: string;
  message?: string | null;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
};

type UpdateProfilePayload = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  city?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  mission?: string | null;
  vision?: string | null;
  history?: string | null;
  galleryUrls?: string[] | null;
  impactStats?: OrganizationImpactStats | null;
};

type NotificationStatus = "sent" | "failed" | "skipped";

type UpdateApplicationStatusResult = {
  application: VolunteerApplication;
  notificationStatus: NotificationStatus;
  notificationError?: string | null;
};

type ProcessExpiredEventsResponse =
  | {
      success: true;
      completedEventIds: string[];
      skippedEventIds: string[];
      completedCount: number;
      processedAt: string;
    }
  | {
      success: false;
      error?: string;
    };

type ProcessExpiredEventsSuccessResponse = Extract<
  ProcessExpiredEventsResponse,
  { success: true }
>;

type ContactMessagePayload = {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
};

type ContactMessageResponse =
  | { success: true; messageId?: string }
  | { success: false; error?: string };

type ListOrganizationsFunctionResponse =
  | { success: true; data: OrganizationDirectoryEntry[] }
  | { success: false; error?: string };

type PublicOrganizationProfileFunctionResponse =
  | { success: true; data: OrganizationPublicProfile }
  | { success: false; error?: string };

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  type: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  city?: string | null;
  location?: string | null;
  mission?: string | null;
  vision?: string | null;
  history?: string | null;
  gallery_urls?: string[] | null;
  stats_events_held?: number | null;
  stats_volunteers_impacted?: number | null;
  stats_hours_contributed?: number | null;
  stats_beneficiaries_served?: number | null;
  created_at: string;
  updated_at: string;
};

type ProfileSummaryRow = {
  id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  type?: UserRole | null;
};

type EventRow = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  category: string;
  address: string;
  lat: number | null;
  lng: number | null;
  date: string;
  duration: string;
  volunteers_needed: number | null;
  volunteers_registered: number | null;
  post_event_summary: string | null;
  post_event_gallery_urls: string[] | null;
  status: "open" | "closed" | "completed";
  image_url: string | null;
  created_at: string;
  updated_at: string;
  organization?: ProfileSummaryRow | null;
};

type ApplicationRow = {
  id: string;
  event_id: string;
  volunteer_id: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  message?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime_type?: string | null;
  attachment_size_bytes?: number | null;
  event?: EventRow | null;
  volunteer?: ProfileSummaryRow | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: Notification["type"];
  title: string;
  message: string;
  status?: ApplicationStatus | null;
  link?: string | null;
  read: boolean;
  created_at: string;
};

type AdminManagePayload =
  | {
      action: "update_profile";
      id: string;
      name: string;
      type: UserRole;
    }
  | {
      action: "delete_profile";
      id: string;
    }
  | {
      action: "update_event";
      id: string;
      updates: {
        title?: string;
        status?: Event["status"];
        volunteersNeeded?: number;
        date?: string | null;
      };
    }
  | {
      action: "delete_event";
      id: string;
    };

type AdminManageResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string };

// Joined select used across application fetches to avoid duplicating relationship trees.
const APPLICATION_SELECT = `*,
        event:events(
          *,
          organization:profiles!events_organization_id_fkey(
            id,
            name,
            email,
            avatar_url,
            bio,
            type
          )
        ),
        volunteer:profiles!applications_volunteer_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`;

function isPermissionDeniedError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "42501" || code === "PGRST301" || code === "PGRST302") {
      return true;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.toLowerCase();
    return (
      message.includes("permission denied") ||
      message.includes("not authorized") ||
      message.includes("rls")
    );
  }

  return false;
}

// Defensive parsing so we can tolerate stats saved as strings.
const parseStatNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

// Shape a raw profile row into the normalized object the UI expects.
const toProfile = (row: ProfileRow): Profile => {
  const galleryUrls = Array.isArray(row.gallery_urls)
    ? row.gallery_urls
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
    : [];

  const eventsHeld = parseStatNumber(row.stats_events_held);
  const volunteersImpacted = parseStatNumber(row.stats_volunteers_impacted);
  const hoursContributed = parseStatNumber(row.stats_hours_contributed);
  const beneficiariesServed = parseStatNumber(row.stats_beneficiaries_served);

  // Always return an impactStats object structure, even if all values are null
  // This ensures the UI can always access the stats fields
  const impactStats = {
    eventsHeld,
    volunteersImpacted,
    hoursContributed,
    beneficiariesServed,
  };

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    type: row.type,
    avatarUrl: row.avatar_url ?? null,
    phone: row.phone ?? null,
    bio: row.bio ?? null,
    city: row.city ?? null,
    location: row.location ?? null,
    mission: row.mission ?? null,
    vision: row.vision ?? null,
    history: row.history ?? null,
    galleryUrls,
    impactStats,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toProfileSummary = (
  row: ProfileSummaryRow | null | undefined
): ProfileSummary | undefined => {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    type: row.type ?? undefined,
  };
};

// Map the events table plus optional joined organization into a typed Event.
const toEvent = (row: EventRow): Event => ({
  id: row.id,
  organizationId: row.organization_id,
  title: row.title,
  description: row.description,
  category: row.category,
  location: {
    address: row.address,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  },
  date: row.date,
  duration: row.duration,
  volunteersNeeded: row.volunteers_needed ?? 0,
  volunteersRegistered: row.volunteers_registered ?? 0,
  status: row.status,
  postEventSummary: row.post_event_summary ?? null,
  postEventGalleryUrls: row.post_event_gallery_urls ?? [],
  imageUrl: row.image_url ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  organization: toProfileSummary(row.organization),
});

const toApplication = (row: ApplicationRow): Application => ({
  id: row.id,
  eventId: row.event_id,
  volunteerId: row.volunteer_id,
  status: row.status,
  appliedAt: row.applied_at,
  updatedAt: row.updated_at,
  message: row.message ?? null,
  attachmentPath: row.attachment_path ?? null,
  attachmentName: row.attachment_name ?? null,
  attachmentMimeType: row.attachment_mime_type ?? null,
  attachmentSizeBytes: row.attachment_size_bytes ?? null,
  event: row.event ? toEvent(row.event) : undefined,
});

const toVolunteerApplication = (row: ApplicationRow): VolunteerApplication => ({
  ...toApplication(row),
  volunteer: toProfileSummary(row.volunteer),
});

const toNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  status: row.status ?? null,
  link: row.link ?? null,
  read: row.read ?? false,
  createdAt: row.created_at,
});

// Fan-out notification to the organization as soon as an application arrives.
const handleApplicationSubmissionNotification = (
  application: VolunteerApplication,
  messageOverride?: string
): VolunteerApplication => {
  const organizationEmail = application.event?.organization?.email ?? null;
  const organizationId = application.event?.organization?.id ?? null;
  const eventId = application.event?.id ?? null;
  const volunteerEmail = application.volunteer?.email ?? null;

  if (
    organizationEmail &&
    volunteerEmail &&
    application.event &&
    organizationId
  ) {
    void notifyApplicationSubmitted({
      organizationId,
      organizationEmail,
      volunteerName: application.volunteer?.name ?? "Voluntário",
      volunteerEmail,
      eventTitle: application.event.title,
      eventId: eventId ?? undefined,
      applicationId: application.id,
      eventDate: application.event.date,
      message: messageOverride ?? application.message ?? undefined,
      hasAttachment: Boolean(application.attachmentPath),
      attachmentName: application.attachmentName ?? undefined,
    });
  }

  return application;
};

const EXPIRED_EVENTS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let lastExpiredEventsCheck = 0;
let expiredEventsProcessingPromise: Promise<void> | null = null;

export async function processExpiredEvents(
  options: { dryRun?: boolean } = {}
): Promise<ProcessExpiredEventsSuccessResponse> {
  const { dryRun = false } = options;

  const { data, error } = await supabase.functions.invoke(
    "process-expired-events",
    {
      body: { dryRun },
    }
  );

  if (error) {
    console.error("Falha ao invocar process-expired-events", error);
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
        ? ((error as { message: string }).message ?? "").trim()
        : "Falha ao processar eventos expirados.";

    throw new Error(
      message.length > 0 ? message : "Falha ao processar eventos expirados."
    );
  }

  const payload = data as ProcessExpiredEventsResponse | null;

  if (!payload) {
    throw new Error("Resposta inválida ao processar eventos expirados.");
  }

  if (!payload.success) {
    const message = payload.error?.trim();
    throw new Error(
      message && message.length > 0
        ? message
        : "Falha ao concluir eventos expirados."
    );
  }

  return payload;
}

// Rate-limited guard that keeps event lifecycles up to date in the background.
async function ensureExpiredEventsProcessed(): Promise<void> {
  const now = Date.now();

  if (expiredEventsProcessingPromise) {
    await expiredEventsProcessingPromise;
    return;
  }

  if (now - lastExpiredEventsCheck < EXPIRED_EVENTS_REFRESH_INTERVAL_MS) {
    return;
  }

  lastExpiredEventsCheck = now;

  const processing: Promise<void> = (async () => {
    try {
      await processExpiredEvents();
    } catch (error) {
      console.warn(
        "Falha ao concluir eventos expirados automaticamente",
        error
      );
    }
  })();

  expiredEventsProcessingPromise = processing.finally(() => {
    expiredEventsProcessingPromise = null;
  });

  await expiredEventsProcessingPromise;
}

// Public edge function fallback used when RLS blocks direct table reads.
async function fetchOrganizationsDirectoryViaFunction(): Promise<
  OrganizationDirectoryEntry[]
> {
  const { data, error } = await supabase.functions.invoke("list-organizations");

  if (error) {
    console.error("Falha ao invocar list-organizations", error);
    throw error;
  }

  const payload = data as ListOrganizationsFunctionResponse | null;

  if (!payload?.success || !payload.data) {
    const reason =
      payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Não foi possível carregar as organizações.";
    throw new Error(reason);
  }

  return payload.data;
}

async function fetchOrganizationPublicProfileViaFunction(
  organizationId: string
): Promise<OrganizationPublicProfile | null> {
  const { data, error } = await supabase.functions.invoke(
    "public-organization-profile",
    {
      body: { organizationId },
    }
  );

  if (error) {
    console.error("Falha ao invocar public-organization-profile", error);
    throw error;
  }

  const payload = data as PublicOrganizationProfileFunctionResponse | null;

  if (!payload?.success || !payload.data) {
    const reason =
      payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : null;

    if (reason) {
      console.warn("public-organization-profile retornou erro", reason);
    }

    return null;
  }

  return payload.data;
}

// Thin wrapper around the admin-manage function that injects the current JWT.
async function invokeAdminManage<T>(payload: AdminManagePayload): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Falha ao obter sessão atual", sessionError);
    throw new Error("Não foi possível validar a sessão do utilizador.");
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("Sessão expirada. Inicie sessão novamente para continuar.");
  }

  const { data, error } = await supabase.functions.invoke("admin-manage", {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("admin-manage function error", error);
    if (isPermissionDeniedError(error)) {
      throw new Error("Não tem permissões para realizar esta ação.");
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
    ) {
      const status = (error as { status: number }).status;
      if (status === 401 || status === 403) {
        throw new Error("Não tem permissões para realizar esta ação.");
      }
    }
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? ((error as { message?: unknown }).message as string | undefined)
        : undefined;
    throw new Error(message ?? "Falha ao comunicar com o servidor.");
  }

  const response = data as AdminManageResponse<T> | null;

  if (!response) {
    throw new Error("Resposta inválida do servidor.");
  }

  if (!response.success) {
    const message = response.error?.trim();
    throw new Error(
      message && message.length > 0
        ? message
        : "A operação administrativa falhou."
    );
  }

  return response.data;
}

// Matches loose duration strings ("1h30", "90m", etc.) so stats stay consistent.
const parseDurationToHours = (duration: string | null | undefined): number => {
  if (!duration) return 0;

  const normalized = duration.trim().toLowerCase();
  if (!normalized) return 0;

  const colonMatch = normalized.match(/^\s*(\d{1,2})[:h](\d{1,2})\s*$/);
  if (colonMatch) {
    const hours = Number.parseInt(colonMatch[1], 10);
    const minutes = Number.parseInt(colonMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Math.max(0, hours + minutes / 60);
    }
  }

  let totalHours = 0;

  const hourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*h/);
  if (hourMatch) {
    const value = Number.parseFloat(hourMatch[1].replace(",", "."));
    if (Number.isFinite(value)) {
      totalHours += value;
    }
  }

  const minuteMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*m/);
  if (minuteMatch) {
    const value = Number.parseFloat(minuteMatch[1].replace(",", "."));
    if (Number.isFinite(value)) {
      totalHours += value / 60;
    }
  }

  if (totalHours > 0) {
    return Math.max(0, totalHours);
  }

  const numericMatch = normalized.match(/\d+(?:[.,]\d+)?/);
  if (numericMatch) {
    const value = Number.parseFloat(numericMatch[0].replace(",", "."));
    if (Number.isFinite(value)) {
      if (normalized.includes("min")) {
        return Math.max(0, value / 60);
      }
      return Math.max(0, value);
    }
  }

  return 0;
};

type ManageApplicationAction = "cancel" | "approve" | "reject" | "reapply";

type ManageApplicationInvokeResponse = {
  success: boolean;
  error?: string;
  data?: {
    application: ApplicationRow;
    notificationStatus?: NotificationStatus;
    notificationError?: string | null;
  };
};

// Shared helper for every application action so we do not duplicate invocation code.
async function invokeManageApplication(params: {
  action: ManageApplicationAction;
  applicationId: string;
  actorId: string;
  message?: string;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
}): Promise<{
  application: VolunteerApplication;
  notificationStatus: NotificationStatus;
  notificationError: string | null;
}> {
  const {
    action,
    applicationId,
    actorId,
    message,
    attachmentPath,
    attachmentName,
    attachmentMimeType,
    attachmentSizeBytes,
  } = params;

  const bodyPayload: Record<string, unknown> = {
    action,
    applicationId,
    actorId,
  };

  if (message !== undefined) bodyPayload.message = message;
  if (attachmentPath !== undefined) bodyPayload.attachmentPath = attachmentPath;
  if (attachmentName !== undefined) bodyPayload.attachmentName = attachmentName;
  if (attachmentMimeType !== undefined)
    bodyPayload.attachmentMimeType = attachmentMimeType;
  if (attachmentSizeBytes !== undefined)
    bodyPayload.attachmentSizeBytes = attachmentSizeBytes;

  const { data, error } = await supabase.functions.invoke(
    "manage-application",
    {
      body: bodyPayload,
    }
  );

  if (error) {
    console.error("Failed to invoke manage-application function", {
      action,
      applicationId,
      actorId,
      error,
    });
    throw error;
  }

  const payload = data as ManageApplicationInvokeResponse | null;

  if (!payload?.success || !payload.data) {
    const reason = payload?.error ?? "Resposta inválida do servidor.";
    console.error("manage-application returned an error", {
      action,
      applicationId,
      actorId,
      error: reason,
    });
    throw new Error(reason);
  }

  const { application, notificationStatus, notificationError } = payload.data;

  return {
    application: toVolunteerApplication(application),
    notificationStatus: notificationStatus ?? "skipped",
    notificationError: notificationError ?? null,
  };
}

/** Load a single profile row or return null if it does not exist. */
export async function fetchProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch profile", error);
    throw error;
  }

  return data ? toProfile(data) : null;
}

/** Persist profile updates while normalizing optional fields and auth metadata. */
export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<Profile> {
  const normalizeOptional = (
    value: string | null | undefined
  ): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const { id } = payload;
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const phone = normalizeOptional(payload.phone);
  const bio = normalizeOptional(payload.bio);
  const city = normalizeOptional(payload.city);
  const location = normalizeOptional(payload.location);
  const mission = normalizeOptional(payload.mission);
  const vision = normalizeOptional(payload.vision);
  const history = normalizeOptional(payload.history);
  const avatarUrl =
    payload.avatarUrl === undefined
      ? undefined
      : normalizeOptional(payload.avatarUrl);

  const sanitizeGalleryUrls = (urls: string[] | null | undefined): string[] => {
    if (!Array.isArray(urls)) return [];
    return urls
      .filter((url): url is string => typeof url === "string")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  };

  const galleryUrls =
    payload.galleryUrls === undefined
      ? undefined
      : sanitizeGalleryUrls(payload.galleryUrls);

  const normalizeStatValue = (
    value: number | null | undefined
  ): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    return rounded < 0 ? 0 : rounded;
  };

  let normalizedImpactStats:
    | {
        eventsHeld: number | null;
        volunteersImpacted: number | null;
        hoursContributed: number | null;
        beneficiariesServed: number | null;
      }
    | undefined;

  if (payload.impactStats !== undefined) {
    normalizedImpactStats = {
      eventsHeld: normalizeStatValue(payload.impactStats?.eventsHeld),
      volunteersImpacted: normalizeStatValue(
        payload.impactStats?.volunteersImpacted
      ),
      hoursContributed: normalizeStatValue(
        payload.impactStats?.hoursContributed
      ),
      beneficiariesServed: normalizeStatValue(
        payload.impactStats?.beneficiariesServed
      ),
    };
  }

  if (!id) {
    throw new Error("ID do perfil é obrigatório.");
  }

  if (!name) {
    throw new Error("O nome é obrigatório.");
  }

  if (!email) {
    throw new Error("O email é obrigatório.");
  }

  const updatePayload: Record<string, unknown> = {
    name,
    email,
    phone,
    bio,
    city,
    location,
    mission,
    vision,
    history,
    updated_at: new Date().toISOString(),
  };

  if (avatarUrl !== undefined) {
    updatePayload.avatar_url = avatarUrl;
  }

  if (galleryUrls !== undefined) {
    updatePayload.gallery_urls = galleryUrls;
  }

  if (normalizedImpactStats !== undefined) {
    updatePayload.stats_events_held = normalizedImpactStats.eventsHeld;
    updatePayload.stats_volunteers_impacted =
      normalizedImpactStats.volunteersImpacted;
    updatePayload.stats_hours_contributed =
      normalizedImpactStats.hoursContributed;
    updatePayload.stats_beneficiaries_served =
      normalizedImpactStats.beneficiariesServed;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error("Failed to update profile", error);
    throw error;
  }

  if (!data) {
    throw new Error("Perfil não encontrado.");
  }

  const metadata: Record<string, string | string[] | null | undefined> = {
    name,
    phone: phone ?? undefined,
    bio: bio ?? undefined,
    city: city ?? undefined,
    location: location ?? undefined,
    mission: mission ?? undefined,
    vision: vision ?? undefined,
    history: history ?? undefined,
  };

  if (avatarUrl !== undefined) {
    metadata.avatar_url = avatarUrl;
  }

  if (galleryUrls !== undefined) {
    metadata.gallery_urls = galleryUrls;
  }

  const { error: authMetadataError } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (authMetadataError) {
    console.warn("Failed to update auth metadata", authMetadataError);
  }

  return toProfile(data);
}

/** Send contact messages via the send-contact-message edge function. */
export async function submitContactMessage(
  payload: ContactMessagePayload
): Promise<void> {
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const subject = payload.subject?.trim() ?? "";
  const message = payload.message.trim();

  if (!name) {
    throw new Error("O nome é obrigatório.");
  }

  if (!email) {
    throw new Error("O email é obrigatório.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Introduza um email válido.");
  }

  if (!message || message.length < 10) {
    throw new Error("A mensagem deve ter pelo menos 10 caracteres.");
  }

  const { data, error } = await supabase.functions.invoke(
    "send-contact-message",
    {
      body: {
        name,
        email,
        subject: subject.length > 0 ? subject : null,
        message,
      },
    }
  );

  if (error) {
    console.error("Falha ao enviar mensagem de contacto", error);
    throw error;
  }

  const response = data as ContactMessageResponse | null;

  if (!response?.success) {
    const reason = response?.error ?? "Não foi possível enviar a mensagem.";
    throw new Error(reason);
  }
}

/** List public events with optional pagination and graceful permission fallbacks. */
export async function fetchEvents(
  filters: EventFilters = {}
): Promise<Event[] | PaginatedResponse<Event>> {
  await ensureExpiredEventsProcessed();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? filters.limit ?? 20;
  const usePagination =
    filters.page !== undefined || filters.pageSize !== undefined;

  const selectWithOrganization = `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`;

  const applyFilters = (
    selectStatement: string,
    countMode: "exact" | "estimated" = "exact"
  ) => {
    let query = supabase
      .from("events")
      .select(
        selectStatement,
        countMode === "exact" ? { count: "exact" } : undefined
      )
      .order("date", { ascending: true });

    if (filters.status) {
      query = query.eq("status", filters.status);
    } else {
      query = query.eq("status", "open");
    }

    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.trim();
      if (term) {
        const sanitizedTerm = term.replace(/'/g, "''");
        query = query.or(
          `title.ilike.%${sanitizedTerm}%,description.ilike.%${sanitizedTerm}%,address.ilike.%${sanitizedTerm}%`
        );
      }
    }

    if (usePagination) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    } else if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  };

  const { data, error, count } = await applyFilters(selectWithOrganization);

  if (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(
        "Falling back to public events query without organization join due to permission error",
        error
      );
      const { data: fallbackData, error: fallbackError } = await applyFilters(
        "*",
        "estimated"
      );

      if (fallbackError) {
        throw fallbackError;
      }

      const events = (fallbackData ?? []).map((row) =>
        toEvent(row as unknown as EventRow)
      );

      if (usePagination) {
        // For fallback, we can't get exact count, so estimate
        const estimatedTotal =
          events.length === pageSize
            ? page * pageSize + pageSize
            : page * pageSize;
        return {
          data: events,
          total: estimatedTotal,
          page,
          pageSize,
          totalPages: Math.ceil(estimatedTotal / pageSize),
          hasMore: events.length === pageSize,
        };
      }

      return events;
    }

    throw error;
  }

  const events = (data ?? []).map((row) => toEvent(row as unknown as EventRow));

  if (usePagination) {
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    return {
      data: events,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  return events;
}

/** Create or re-activate a volunteer application, then trigger notifications. */
export async function applyToEvent(
  payload: ApplicationPayload
): Promise<Application> {
  const existingResponse = await supabase
    .from("applications")
    .select(APPLICATION_SELECT)
    .eq("event_id", payload.eventId)
    .eq("volunteer_id", payload.volunteerId)
    .maybeSingle<ApplicationRow>();

  if (existingResponse.error) throw existingResponse.error;

  const existingApplication = existingResponse.data ?? null;

  if (existingApplication) {
    if (existingApplication.status !== "cancelled") {
      throw new Error("Já existe uma candidatura ativa para este evento.");
    }

    const { application: reactivated } = await invokeManageApplication({
      action: "reapply",
      applicationId: existingApplication.id,
      actorId: payload.volunteerId,
      message: payload.message ?? undefined,
      attachmentPath: payload.attachmentPath,
      attachmentName: payload.attachmentName,
      attachmentMimeType: payload.attachmentMimeType,
      attachmentSizeBytes: payload.attachmentSizeBytes,
    });

    return handleApplicationSubmissionNotification(
      reactivated,
      payload.message ?? undefined
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      event_id: payload.eventId,
      volunteer_id: payload.volunteerId,
      message: payload.message ?? null,
      attachment_path:
        payload.attachmentPath !== undefined ? payload.attachmentPath : null,
      attachment_name:
        payload.attachmentName !== undefined ? payload.attachmentName : null,
      attachment_mime_type:
        payload.attachmentMimeType !== undefined
          ? payload.attachmentMimeType
          : null,
      attachment_size_bytes:
        payload.attachmentSizeBytes !== undefined
          ? payload.attachmentSizeBytes
          : null,
    })
    .select(APPLICATION_SELECT)
    .single<ApplicationRow>();

  if (error) throw error;

  const application = handleApplicationSubmissionNotification(
    toVolunteerApplication(data),
    payload.message ?? undefined
  );

  return application;
}

/** Read a single event, tolerating RLS by retrying without the organization join. */
export async function fetchEventById(eventId: string): Promise<Event | null> {
  await ensureExpiredEventsProcessed();

  const selectWithOrganization = `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`;

  const executeQuery = async (selectStatement: string) =>
    supabase
      .from("events")
      .select(selectStatement)
      .eq("id", eventId)
      .maybeSingle();

  const { data, error } = await executeQuery(selectWithOrganization);

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    if (isPermissionDeniedError(error)) {
      console.warn(
        "Falling back to single event query without organization join due to permission error",
        error
      );

      const { data: fallbackData, error: fallbackError } = await executeQuery(
        "*"
      );

      if (fallbackError) {
        if (fallbackError.code === "PGRST116") {
          return null;
        }
        throw fallbackError;
      }

      return fallbackData ? toEvent(fallbackData as unknown as EventRow) : null;
    }

    throw error;
  }

  return data ? toEvent(data as unknown as EventRow) : null;
}

export async function checkExistingApplication(
  eventId: string,
  volunteerId: string
): Promise<Application | null> {
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_SELECT)
    .eq("event_id", eventId)
    .eq("volunteer_id", volunteerId)
    .maybeSingle();

  if (error) throw error;
  return data ? toApplication(data) : null;
}

export async function cancelApplication(
  applicationId: string,
  volunteerId: string
): Promise<Application> {
  const { application } = await invokeManageApplication({
    action: "cancel",
    applicationId,
    actorId: volunteerId,
  });

  return application;
}

/** Fetch volunteer applications with optional pagination for profile dashboards. */
export async function fetchApplicationsByVolunteer(
  volunteerId: string,
  options?: { page?: number; pageSize?: number }
): Promise<Application[] | PaginatedResponse<Application>> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const usePagination =
    options?.page !== undefined || options?.pageSize !== undefined;

  let query = supabase
    .from("applications")
    .select(APPLICATION_SELECT, usePagination ? { count: "exact" } : undefined)
    .eq("volunteer_id", volunteerId)
    .order("applied_at", { ascending: false });

  if (usePagination) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const applications = (data ?? []).map(toApplication);

  if (usePagination) {
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    return {
      data: applications,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  return applications;
}

/** Aggregate volunteer stats locally so dashboards stay responsive. */
export async function fetchVolunteerStatistics(
  volunteerId: string
): Promise<VolunteerStatistics> {
  await ensureExpiredEventsProcessed();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `status,
        event:events!inner(
          id,
          date,
          duration,
          status
        )`
    )
    .eq("volunteer_id", volunteerId);

  if (error) throw error;

  type ApplicationWithEvent = {
    status: ApplicationStatus;
    event:
      | {
          id?: string | null;
          date?: string | null;
          duration?: string | null;
          status?: Event["status"] | null;
        }
      | Array<{
          id?: string | null;
          date?: string | null;
          duration?: string | null;
          status?: Event["status"] | null;
        }>
      | null;
  };

  const rows = (data ?? []) as ApplicationWithEvent[];
  const now = new Date();

  let totalHoursAccumulator = 0;
  let eventsAttended = 0;
  let eventsCompleted = 0;

  for (const row of rows) {
    const rawEvent = row.event;
    const event = Array.isArray(rawEvent)
      ? rawEvent[0] ?? null
      : rawEvent ?? null;
    if (!event) continue;

    const eventDate = event.date ? new Date(event.date) : null;
    const eventDateValid =
      eventDate !== null && !Number.isNaN(eventDate.getTime());
    const hasEventPassed = eventDateValid
      ? eventDate.getTime() <= now.getTime()
      : false;

    const isApproved = row.status === "approved";
    const isEventCompleted = event.status === "completed";

    if (isApproved && (hasEventPassed || isEventCompleted)) {
      eventsAttended += 1;
      totalHoursAccumulator += parseDurationToHours(event.duration);
    }

    if (isApproved && isEventCompleted) {
      eventsCompleted += 1;
    }
  }

  const totalApplications = rows.length;
  const totalVolunteerHours = Math.max(
    0,
    Math.round(totalHoursAccumulator * 10) / 10
  );
  const participationRate =
    totalApplications > 0
      ? Math.min(1, Math.max(0, eventsAttended / totalApplications))
      : 0;

  return {
    totalVolunteerHours,
    eventsAttended,
    eventsCompleted,
    participationRate,
    totalApplications,
  };
}

export async function fetchNotifications(
  userId: string,
  options: { unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  if (!userId) return [];

  const { unreadOnly = false } = options;

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch notifications", error);
    throw error;
  }

  return (data ?? []).map((row) => toNotification(row as NotificationRow));
}

export async function markNotificationsAsRead(
  notificationIds: string[]
): Promise<void> {
  if (notificationIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", notificationIds);

  if (error) {
    console.error("Failed to mark notifications as read", error);
    throw error;
  }
}

export async function fetchApplicationsForOrganization(
  organizationId: string,
  status: ApplicationStatus | "all" = "all"
): Promise<VolunteerApplication[]> {
  let query = supabase
    .from("applications")
    .select(
      `*,
        volunteer:profiles!applications_volunteer_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        ),
        event:events!inner(
          *,
          organization:profiles!events_organization_id_fkey(
            id,
            name,
            email,
            avatar_url,
            bio,
            type
          )
        )`
    )
    .eq("event.organization_id", organizationId)
    .order("applied_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toVolunteerApplication);
}

export async function updateApplicationStatus(
  applicationId: string,
  organizationId: string,
  status: "pending" | "approved" | "rejected"
): Promise<UpdateApplicationStatusResult> {
  const action: ManageApplicationAction =
    status === "approved" ? "approve" : "reject";

  const { application, notificationStatus, notificationError } =
    await invokeManageApplication({
      action,
      applicationId,
      actorId: organizationId,
    });

  return {
    application,
    notificationStatus,
    notificationError,
  };
}

/** Validate payloads on the client before inserting a new event row. */
export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const eventDate = new Date(payload.date);
  if (!Number.isFinite(eventDate.getTime())) {
    throw new Error("Data do evento inválida.");
  }

  const now = Date.now();
  if (eventDate.getTime() < now - MIN_EVENT_START_LEEWAY_MS) {
    throw new Error(
      "A data do evento deve ser igual ou posterior ao momento atual."
    );
  }

  const normalizedDateIso = eventDate.toISOString();

  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: payload.organizationId,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      address: payload.address,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      date: normalizedDateIso,
      duration: payload.duration,
      volunteers_needed: payload.volunteersNeeded,
      image_url: payload.imageUrl ?? null,
      post_event_summary: payload.postEventSummary ?? null,
      post_event_gallery_urls: payload.postEventGalleryUrls ?? [],
      status: "open",
    })
    .select(
      `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`
    )
    .single();

  if (error) throw error;
  return toEvent(data);
}

export async function updateEvent(
  eventId: string,
  organizationId: string,
  payload: UpdateEventPayload
): Promise<Event> {
  let normalizedDateIso: string | undefined;

  if (payload.date !== undefined) {
    const candidateDate = new Date(payload.date);
    if (!Number.isFinite(candidateDate.getTime())) {
      throw new Error("Data do evento inválida.");
    }

    const now = Date.now();
    const candidateTime = candidateDate.getTime();
    const inPastBeyondLeeway = candidateTime < now - MIN_EVENT_START_LEEWAY_MS;

    if (inPastBeyondLeeway) {
      const { data: existing, error: existingError } = await supabase
        .from("events")
        .select("date")
        .eq("id", eventId)
        .eq("organization_id", organizationId)
        .maybeSingle<{ date: string | null }>();

      if (existingError) {
        throw existingError;
      }

      if (!existing || !existing.date) {
        throw new Error("Evento não encontrado.");
      }

      const originalDate = new Date(existing.date);
      const originalTime = originalDate.getTime();
      const canKeepOriginalDate =
        Number.isFinite(originalTime) &&
        Math.abs(candidateTime - originalTime) <= MIN_EVENT_START_LEEWAY_MS;

      if (!canKeepOriginalDate) {
        throw new Error(
          "A data do evento deve ser igual ou posterior ao momento atual."
        );
      }
    }

    normalizedDateIso = candidateDate.toISOString();
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.title !== undefined) updatePayload.title = payload.title;
  if (payload.description !== undefined)
    updatePayload.description = payload.description;
  if (payload.category !== undefined) updatePayload.category = payload.category;
  if (payload.address !== undefined) updatePayload.address = payload.address;
  if (payload.lat !== undefined) updatePayload.lat = payload.lat;
  if (payload.lng !== undefined) updatePayload.lng = payload.lng;
  if (normalizedDateIso !== undefined) {
    updatePayload.date = normalizedDateIso;
  }
  if (payload.duration !== undefined) updatePayload.duration = payload.duration;
  if (payload.volunteersNeeded !== undefined) {
    updatePayload.volunteers_needed = payload.volunteersNeeded;
  }
  if (payload.imageUrl !== undefined)
    updatePayload.image_url = payload.imageUrl;
  if (payload.status !== undefined) updatePayload.status = payload.status;
  if (payload.postEventSummary !== undefined) {
    updatePayload.post_event_summary =
      payload.postEventSummary === null ? null : payload.postEventSummary;
  }
  if (payload.postEventGalleryUrls !== undefined) {
    updatePayload.post_event_gallery_urls = payload.postEventGalleryUrls;
  }

  const { data, error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .select(
      `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`
    )
    .single();

  if (error) throw error;
  return toEvent(data);
}

export async function deleteEvent(
  eventId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

export async function fetchOrganizationEvents(
  organizationId: string,
  options?: { page?: number; pageSize?: number }
): Promise<Event[] | PaginatedResponse<Event>> {
  await ensureExpiredEventsProcessed();

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const usePagination =
    options?.page !== undefined || options?.pageSize !== undefined;

  let query = supabase
    .from("events")
    .select(
      `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`,
      usePagination ? { count: "exact" } : undefined
    )
    .eq("organization_id", organizationId)
    .order("date", { ascending: true });

  if (usePagination) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const events = (data ?? []).map(toEvent);

  if (usePagination) {
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    return {
      data: events,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  return events;
}

export async function fetchOrganizationPublicProfile(
  organizationId: string
): Promise<OrganizationPublicProfile | null> {
  if (!organizationId) {
    return null;
  }

  await ensureExpiredEventsProcessed();

  const loadViaFunction = async () =>
    fetchOrganizationPublicProfileViaFunction(organizationId);

  let session:
    | Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
    | null = null;

  try {
    const sessionResponse = await supabase.auth.getSession();
    session = sessionResponse.data.session ?? null;
  } catch (error) {
    console.warn(
      "Falha ao determinar sessão atual; a obter perfil público da organização via função.",
      error
    );
    return loadViaFunction();
  }

  if (!session) {
    return loadViaFunction();
  }

  try {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", organizationId)
      .eq("type", "organization")
      .maybeSingle<ProfileRow>();

    if (profileError) throw profileError;
    if (!profileRow) {
      return null;
    }

    const organization = toProfile(profileRow);

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select(
        `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`
      )
      .eq("organization_id", organizationId)
      .order("date", { ascending: false });

    if (eventsError) throw eventsError;

    const events = (eventsData ?? []).map(toEvent);

    const now = new Date();
    const fallbackEventsHeld = events.filter(
      (event) => new Date(event.date).getTime() < now.getTime()
    ).length;
    const fallbackVolunteersImpacted = events.reduce(
      (total, event) => total + (event.volunteersRegistered ?? 0),
      0
    );

    const mergedImpactStats: OrganizationImpactStats = {
      eventsHeld: organization.impactStats?.eventsHeld ?? fallbackEventsHeld,
      volunteersImpacted:
        organization.impactStats?.volunteersImpacted ??
        fallbackVolunteersImpacted,
      hoursContributed: organization.impactStats?.hoursContributed ?? null,
      beneficiariesServed:
        organization.impactStats?.beneficiariesServed ?? null,
    };

    return {
      organization: {
        ...organization,
        impactStats: mergedImpactStats,
      },
      events,
    };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(
        "Sem permissões para ler perfil diretamente; a recorrer à função pública.",
        error
      );
      return loadViaFunction();
    }
    throw error;
  }
}

export async function fetchOrganizationsDirectory(): Promise<
  OrganizationDirectoryEntry[]
> {
  await ensureExpiredEventsProcessed();

  let session:
    | Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
    | null = null;

  try {
    const sessionResponse = await supabase.auth.getSession();
    session = sessionResponse.data.session ?? null;
  } catch (error) {
    console.warn(
      "Falha ao determinar sessão atual; a listar organizações via função pública.",
      error
    );
    return fetchOrganizationsDirectoryViaFunction();
  }

  if (!session) {
    return fetchOrganizationsDirectoryViaFunction();
  }

  try {
    const { data: organizationRows, error: organizationsError } = await supabase
      .from("profiles")
      .select("*")
      .eq("type", "organization")
      .order("name", { ascending: true });

    if (organizationsError) {
      throw organizationsError;
    }

    const organizations = (organizationRows ?? []).map(toProfile);

    if (organizations.length === 0) {
      return [];
    }

    const organizationIds = organizations.map(
      (organization) => organization.id
    );

    const { data: eventsRows, error: eventsError } = await supabase
      .from("events")
      .select(
        `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`
      )
      .in("organization_id", organizationIds)
      .eq("status", "open")
      .order("date", { ascending: true });

    if (eventsError) {
      throw eventsError;
    }

    const events = (eventsRows ?? []).map((row) =>
      toEvent(row as unknown as EventRow)
    );

    const eventsByOrganization = new Map<string, Event[]>();

    for (const event of events) {
      const existing = eventsByOrganization.get(event.organizationId);
      if (existing) {
        existing.push(event);
      } else {
        eventsByOrganization.set(event.organizationId, [event]);
      }
    }

    return organizations.map((organization) => {
      const activeEvents = [
        ...(eventsByOrganization.get(organization.id) ?? []),
      ];
      activeEvents.sort(
        (first, second) =>
          new Date(first.date).getTime() - new Date(second.date).getTime()
      );

      return {
        organization,
        activeEvents,
      };
    });
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(
        "Sem permissões para ler perfis diretamente; a utilizar função pública.",
        error
      );
      return fetchOrganizationsDirectoryViaFunction();
    }
    throw error;
  }
}

export async function fetchOrganizationDashboard(
  organizationId: string
): Promise<{
  summary: OrganizationDashboardSummary;
  upcomingEvents: Event[];
  pendingApplications: VolunteerApplication[];
  applicationStats: ApplicationStats;
  applicationsByEvent: Record<string, ApplicationStats>;
}> {
  await ensureExpiredEventsProcessed();

  const [eventsResponse, applications] = await Promise.all([
    supabase
      .from("events")
      .select("id, status, volunteers_needed, volunteers_registered, date")
      .eq("organization_id", organizationId),
    fetchApplicationsForOrganization(organizationId, "all"),
  ]);

  if (eventsResponse.error) throw eventsResponse.error;

  type EventStatsRecord = {
    id: string;
    status: "open" | "closed" | "completed";
    volunteers_needed: number | null;
    volunteers_registered: number | null;
    date: string;
  };

  const events = (eventsResponse.data ?? []) as EventStatsRecord[];
  const organizationApplications: VolunteerApplication[] = applications;

  const stats = events.reduce<{
    totalEvents: number;
    openEvents: number;
    volunteersNeeded: number;
    volunteersRegistered: number;
  }>(
    (acc, event) => {
      acc.totalEvents += 1;
      if (event.status === "open") acc.openEvents += 1;
      acc.volunteersNeeded += event.volunteers_needed ?? 0;
      acc.volunteersRegistered += event.volunteers_registered ?? 0;
      return acc;
    },
    {
      totalEvents: 0,
      openEvents: 0,
      volunteersNeeded: 0,
      volunteersRegistered: 0,
    }
  );

  const applicationStats = organizationApplications.reduce<ApplicationStats>(
    (acc, application) => {
      if (application.status === "pending") acc.pending += 1;
      if (application.status === "approved") acc.approved += 1;
      if (application.status === "rejected") acc.rejected += 1;
      if (application.status === "cancelled") acc.cancelled += 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  );

  const applicationsByEvent = organizationApplications.reduce<
    Record<string, ApplicationStats>
  >((acc, application) => {
    const eventId = application.eventId;
    if (!eventId) {
      return acc;
    }

    if (!acc[eventId]) {
      acc[eventId] = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    }

    if (application.status === "pending") acc[eventId].pending += 1;
    if (application.status === "approved") acc[eventId].approved += 1;
    if (application.status === "rejected") acc[eventId].rejected += 1;
    if (application.status === "cancelled") acc[eventId].cancelled += 1;

    return acc;
  }, {});

  const upcomingEventIds = events
    .filter((event) => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
    .map((event) => event.id);

  let mappedUpcoming: Event[] = [];

  if (upcomingEventIds.length > 0) {
    const { data: upcomingEventsWithDetails, error } = await supabase
      .from("events")
      .select(
        `*,
          organization:profiles!events_organization_id_fkey(
            id,
            name,
            email,
            avatar_url,
            bio,
            type
          )`
      )
      .in("id", upcomingEventIds);

    if (error) throw error;

    mappedUpcoming = (upcomingEventsWithDetails ?? []).map(toEvent);
  }

  const pendingApplications = organizationApplications.filter(
    (application) => application.status === "pending"
  );

  return {
    summary: {
      totalEvents: stats.totalEvents,
      openEvents: stats.openEvents,
      pendingApplications: applicationStats.pending,
      approvedVolunteers: stats.volunteersRegistered,
    },
    upcomingEvents: mappedUpcoming,
    pendingApplications,
    applicationStats,
    applicationsByEvent,
  };
}

export async function fetchAdminMetrics(): Promise<{
  metrics: AdminMetrics;
  latestUsers: Profile[];
  latestEvents: Event[];
}> {
  await ensureExpiredEventsProcessed();

  const [
    usersCount,
    volunteersCount,
    organizationsCount,
    adminsCount,
    eventsCount,
    applicationsCount,
    pendingApplicationsCount,
    latestUsers,
    latestEvents,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("type", "volunteer"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("type", "organization"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("type", "admin"),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select(
        `*,
            organization:profiles!events_organization_id_fkey(
              id,
              name,
              email,
              avatar_url,
              bio,
              type
            )`
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const metrics: AdminMetrics = {
    totalUsers: usersCount.count ?? 0,
    volunteers: volunteersCount.count ?? 0,
    organizations: organizationsCount.count ?? 0,
    admins: adminsCount.count ?? 0,
    totalEvents: eventsCount.count ?? 0,
    totalApplications: applicationsCount.count ?? 0,
    pendingApplications: pendingApplicationsCount.count ?? 0,
  };

  if (latestUsers.error) throw latestUsers.error;
  if (latestEvents.error) throw latestEvents.error;

  return {
    metrics,
    latestUsers: (latestUsers.data ?? []).map(toProfile),
    latestEvents: (latestEvents.data ?? []).map(toEvent),
  };
}

const sanitizeSearchTerm = (term?: string | null) =>
  term ? term.replace(/[\n\r%_]/g, "").trim() : "";

export async function fetchAdminProfiles(params?: {
  search?: string;
  type?: UserRole | "all";
  limit?: number;
}): Promise<Profile[]> {
  const { search, type = "all", limit = 100 } = params ?? {};
  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type !== "all") {
    query = query.eq("type", type);
  }

  const sanitized = sanitizeSearchTerm(search);
  if (sanitized) {
    query = query.or(
      `name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,id.ilike.%${sanitized}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(toProfile);
}

export async function fetchAdminEvents(params?: {
  search?: string;
  limit?: number;
}): Promise<Event[]> {
  const { search, limit = 100 } = params ?? {};

  let query = supabase
    .from("events")
    .select(
      `*,
        organization:profiles!events_organization_id_fkey(
          id,
          name,
          email,
          avatar_url,
          bio,
          type
        )`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const sanitized = sanitizeSearchTerm(search);
  if (sanitized) {
    query = query.or(
      `title.ilike.%${sanitized}%,category.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(toEvent);
}

export async function adminUpdateProfile(params: {
  id: string;
  name: string;
  type: UserRole;
}): Promise<Profile> {
  const { id, name, type } = params;

  const { profile } = await invokeAdminManage<{ profile: ProfileRow }>({
    action: "update_profile",
    id,
    name,
    type,
  });

  return toProfile(profile);
}

export async function adminDeleteProfile(profileId: string): Promise<void> {
  await invokeAdminManage<{ profileId: string }>({
    action: "delete_profile",
    id: profileId,
  });
}

export async function adminUpdateEvent(
  eventId: string,
  updates: {
    title?: string;
    status?: Event["status"];
    volunteersNeeded?: number;
    date?: string | null;
  }
): Promise<Event> {
  const payload: {
    title?: string;
    status?: Event["status"];
    volunteersNeeded?: number;
    date?: string | null;
  } = {};

  if (updates.title !== undefined) {
    payload.title = updates.title;
  }

  if (updates.status !== undefined) {
    payload.status = updates.status;
  }

  if (updates.volunteersNeeded !== undefined) {
    payload.volunteersNeeded = updates.volunteersNeeded;
  }

  if (updates.date !== undefined) {
    payload.date = updates.date;
  }

  const { event } = await invokeAdminManage<{ event: EventRow }>({
    action: "update_event",
    id: eventId,
    updates: payload,
  });

  return toEvent(event);
}

export async function adminDeleteEvent(eventId: string): Promise<void> {
  await invokeAdminManage<{ eventId: string }>({
    action: "delete_event",
    id: eventId,
  });
}
