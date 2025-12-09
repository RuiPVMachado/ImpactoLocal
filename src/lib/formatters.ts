import { parseDurationToMinutes } from "./datetime";

/**
 * Presentation helpers that keep duration strings consistent across the UI.
 */

/**
 * Formats a duration string into a human-readable format with hours and minutes.
 * Examples: "1h 30m", "2h", "45m".
 * @param duration The duration string to format.
 * @returns The formatted duration string.
 */
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
