export type UserRole = "volunteer" | "organization" | "admin";

export interface Profile {
  id: string;
  email: string;
  name: string;
  type: UserRole;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProfileSummary = Pick<Profile, "id" | "name"> & {
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  type?: UserRole;
};

export interface EventLocation {
  address: string;
  lat?: number | null;
  lng?: number | null;
}

export interface Event {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: string;
  location: EventLocation;
  date: string;
  duration: string;
  volunteersNeeded: number;
  volunteersRegistered: number;
  status: "open" | "closed" | "completed";
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: ProfileSummary;
}

export interface Application {
  id: string;
  eventId: string;
  volunteerId: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: string;
  updatedAt: string;
  message?: string | null;
  event?: Event;
}

export interface VolunteerApplication extends Application {
  volunteer?: ProfileSummary;
}

export interface OrganizationDashboardSummary {
  totalEvents: number;
  openEvents: number;
  pendingApplications: number;
  approvedVolunteers: number;
}

export interface ApplicationStats {
  pending: number;
  approved: number;
  rejected: number;
}

export interface AdminMetrics {
  totalUsers: number;
  totalEvents: number;
  totalApplications: number;
  volunteers: number;
  organizations: number;
  admins: number;
  pendingApplications: number;
}
