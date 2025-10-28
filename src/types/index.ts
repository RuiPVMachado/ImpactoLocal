export type UserRole = "volunteer" | "organization" | "admin";

export interface Profile {
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
}

export interface OrganizationImpactStats {
  eventsHeld?: number | null;
  volunteersImpacted?: number | null;
  hoursContributed?: number | null;
  beneficiariesServed?: number | null;
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
  postEventSummary?: string | null;
  postEventGalleryUrls?: string[];
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: ProfileSummary;
}

export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface Application {
  id: string;
  eventId: string;
  volunteerId: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  message?: string | null;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
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
  cancelled: number;
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

export interface VolunteerStatistics {
  totalVolunteerHours: number;
  eventsAttended: number;
  eventsCompleted: number;
  participationRate: number;
  totalApplications: number;
}

export type NotificationType =
  | "application_approved"
  | "application_rejected"
  | "application_updated"
  | "new_event"
  | "event_reminder"
  | "event_cancelled";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status?: ApplicationStatus | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export interface OrganizationPublicProfile {
  organization: Profile;
  events: Event[];
}

export interface OrganizationDirectoryEntry {
  organization: Profile;
  activeEvents: Event[];
}
