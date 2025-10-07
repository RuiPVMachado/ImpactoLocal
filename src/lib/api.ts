import { supabase } from "./supabase";
import type {
  AdminMetrics,
  Application,
  ApplicationStats,
  Event,
  OrganizationDashboardSummary,
  Profile,
  ProfileSummary,
  UserRole,
  VolunteerApplication,
} from "../types";

type EventFilters = {
  category?: string;
  searchTerm?: string;
  status?: "open" | "closed" | "completed";
  limit?: number;
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
};

type UpdateEventPayload = Partial<
  Omit<CreateEventPayload, "organizationId">
> & {
  status?: "open" | "closed" | "completed";
};

type UpdateProfilePayload = {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
};

type ApplicationPayload = {
  eventId: string;
  volunteerId: string;
  message?: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  type: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
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
  image_url: string | null;
  created_at: string;
  updated_at: string;
  organization?: ProfileSummaryRow | null;
};

type ApplicationRow = {
  id: string;
  event_id: string;
  volunteer_id: string;
  status: "pending" | "approved" | "rejected";
  applied_at: string;
  updated_at: string;
  message?: string | null;
  event?: EventRow | null;
  volunteer?: ProfileSummaryRow | null;
};

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  name: row.name,
  type: row.type,
  avatarUrl: row.avatar_url ?? null,
  phone: row.phone ?? null,
  bio: row.bio ?? null,
  location: row.location ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

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
  event: row.event ? toEvent(row.event) : undefined,
});

const toVolunteerApplication = (row: ApplicationRow): VolunteerApplication => ({
  ...toApplication(row),
  volunteer: toProfileSummary(row.volunteer),
});

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

export async function updateProfileById(
  id: string,
  payload: UpdateProfilePayload
): Promise<Profile> {
  const updatePayload = {
    name: payload.name,
    phone: payload.phone,
    bio: payload.bio,
    location: payload.location,
    avatar_url: payload.avatarUrl,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toProfile(data);
}

export async function fetchEvents(
  filters: EventFilters = {}
): Promise<Event[]> {
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
    query = query.or(
      `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`
    );
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toEvent);
}

export async function fetchEventById(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
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
    .eq("id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data ? toEvent(data) : null;
}

export async function checkExistingApplication(
  eventId: string,
  volunteerId: string
): Promise<Application | null> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `*,
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
        )`
    )
    .eq("event_id", eventId)
    .eq("volunteer_id", volunteerId)
    .maybeSingle();

  if (error) throw error;
  return data ? toApplication(data) : null;
}

export async function applyToEvent(
  payload: ApplicationPayload
): Promise<Application> {
  const { data, error } = await supabase
    .from("applications")
    .insert({
      event_id: payload.eventId,
      volunteer_id: payload.volunteerId,
      message: payload.message ?? null,
    })
    .select(
      `*,
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
        )`
    )
    .single();

  if (error) throw error;
  return toApplication(data);
}

export async function cancelApplication(
  applicationId: string,
  volunteerId: string
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", applicationId)
    .eq("volunteer_id", volunteerId);

  if (error) throw error;
}

export async function fetchApplicationsByVolunteer(
  volunteerId: string
): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `*,
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
        )`
    )
    .eq("volunteer_id", volunteerId)
    .order("applied_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toApplication);
}

export async function fetchApplicationsForOrganization(
  organizationId: string,
  status: "pending" | "approved" | "rejected" | "all" = "all"
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
): Promise<VolunteerApplication> {
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
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
          organization_id,
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
    .single();

  if (error) throw error;
  if (data.event.organization_id !== organizationId) {
    throw new Error("Not authorized to update this application");
  }

  return toVolunteerApplication(data);
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
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
      date: payload.date,
      duration: payload.duration,
      volunteers_needed: payload.volunteersNeeded,
      image_url: payload.imageUrl ?? null,
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
  if (payload.date !== undefined) updatePayload.date = payload.date;
  if (payload.duration !== undefined) updatePayload.duration = payload.duration;
  if (payload.volunteersNeeded !== undefined) {
    updatePayload.volunteers_needed = payload.volunteersNeeded;
  }
  if (payload.imageUrl !== undefined)
    updatePayload.image_url = payload.imageUrl;
  if (payload.status !== undefined) updatePayload.status = payload.status;

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
  organizationId: string
): Promise<Event[]> {
  const { data, error } = await supabase
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
    .order("date", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toEvent);
}

export async function fetchOrganizationDashboard(
  organizationId: string
): Promise<{
  summary: OrganizationDashboardSummary;
  upcomingEvents: Event[];
  pendingApplications: VolunteerApplication[];
  applicationStats: ApplicationStats;
}> {
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
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );

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
  };
}

export async function fetchAdminMetrics(): Promise<{
  metrics: AdminMetrics;
  latestUsers: Profile[];
  latestEvents: Event[];
}> {
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
