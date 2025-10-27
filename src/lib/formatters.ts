import { parseDurationToMinutes } from "./datetime";

export function formatDurationWithHours(duration?: string | null): string {
  const totalMinutes = parseDurationToMinutes(duration);
  if (totalMinutes <= 0) {
    return "";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}
