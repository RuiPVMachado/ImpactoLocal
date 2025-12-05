// Re-export admin helpers so consumers can import from a single lib entrypoint.
export {
  adminUpdateProfile,
  adminDeleteProfile,
  adminUpdateEvent,
  adminDeleteEvent,
  fetchAdminEvents,
  fetchAdminMetrics,
  fetchAdminProfiles,
} from "./api";
