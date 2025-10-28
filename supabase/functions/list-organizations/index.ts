import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Variáveis de ambiente em falta.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("type", "organization")
      .order("name", { ascending: true });

    if (profilesError) {
      throw profilesError;
    }

    const organizations = (profileRows ?? []).map(toProfile);

    if (organizations.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const events = (eventsRows ?? []).map((row) => toEvent(row as EventRow));

    const eventsByOrganization = new Map<string, Event[]>();

    for (const event of events) {
      const existing = eventsByOrganization.get(event.organizationId);
      if (existing) {
        existing.push(event);
      } else {
        eventsByOrganization.set(event.organizationId, [event]);
      }
    }

    const payload = organizations.map((organization) => {
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

    return new Response(JSON.stringify({ success: true, data: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("list-organizations error", error);
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseStatNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function sanitizeGallery(urls: unknown): string[] {
  if (!Array.isArray(urls)) {
    return [];
  }

  return urls
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toProfile(row: ProfileRow): Profile {
  const galleryUrls = sanitizeGallery(row.gallery_urls);
  const eventsHeld = parseStatNumber(row.stats_events_held);
  const volunteersImpacted = parseStatNumber(row.stats_volunteers_impacted);
  const hoursContributed = parseStatNumber(row.stats_hours_contributed);
  const beneficiariesServed = parseStatNumber(row.stats_beneficiaries_served);

  const hasImpactStats = [
    eventsHeld,
    volunteersImpacted,
    hoursContributed,
    beneficiariesServed,
  ].some((value) => value !== null);

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
    impactStats: hasImpactStats
      ? {
          eventsHeld,
          volunteersImpacted,
          hoursContributed,
          beneficiariesServed,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProfileSummary(
  row: ProfileSummaryRow | null | undefined
): ProfileSummary | undefined {
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    type: row.type ?? undefined,
  };
}

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    category: row.category,
    location: {
      address: row.address,
      lat: typeof row.lat === "number" ? row.lat : null,
      lng: typeof row.lng === "number" ? row.lng : null,
    },
    date: row.date,
    duration: row.duration,
    volunteersNeeded: row.volunteers_needed ?? 0,
    volunteersRegistered: row.volunteers_registered ?? 0,
    status: row.status,
    postEventSummary: row.post_event_summary ?? null,
    postEventGalleryUrls: sanitizeGallery(row.post_event_gallery_urls),
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    organization: toProfileSummary(row.organization),
  };
}

type UserRole = "volunteer" | "organization" | "admin";

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
  status: "open" | "closed" | "completed";
  post_event_summary: string | null;
  post_event_gallery_urls: string[] | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  organization?: ProfileSummaryRow | null;
};

type OrganizationImpactStats = {
  eventsHeld?: number | null;
  volunteersImpacted?: number | null;
  hoursContributed?: number | null;
  beneficiariesServed?: number | null;
};

type Profile = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

type ProfileSummary = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  type?: UserRole;
};

type Event = {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: string;
  location: {
    address: string;
    lat?: number | null;
    lng?: number | null;
  };
  date: string;
  duration: string;
  volunteersNeeded: number;
  volunteersRegistered: number;
  status: "open" | "closed" | "completed";
  postEventSummary?: string | null;
  postEventGalleryUrls?: string[];
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: ProfileSummary;
};
