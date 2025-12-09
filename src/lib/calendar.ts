import type { Event } from "../types";
import { getEventEndDate } from "./datetime";

/**
 * Utilities for producing calendar-friendly timestamps and shareable URLs.
 */

/**
 * Formats a Date object into a UTC string suitable for calendar URLs.
 * Format: YYYYMMDDTHHmmSSZ
 * @param date The date to format.
 * @returns The formatted date string.
 */
const formatDateTimeUtc = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}${String(date.getUTCDate()).padStart(2, "0")}T${String(
    date.getUTCHours()
  ).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(
    date.getUTCSeconds()
  ).padStart(2, "0")}Z`;

/**
 * Checks if an event has a valid date.
 * @param event The event to check.
 * @returns True if the event has a valid date, false otherwise.
 */
export const hasValidEventDate = (event: Event): boolean => {
  if (!event.date) return false;
  const start = new Date(event.date);
  return Number.isFinite(start.getTime());
};

/**
 * Derives the end date of an event.
 * Uses the event duration if available, otherwise falls back to a default duration.
 * @param event The event to calculate the end date for.
 * @param fallbackHours The number of hours to add if duration is missing (default: 1).
 * @returns The calculated end date or null if the start date is invalid.
 */
const deriveEventEnd = (event: Event, fallbackHours = 1): Date | null => {
  const startDate = new Date(event.date);
  if (!Number.isFinite(startDate.getTime())) {
    return null;
  }

  const calculatedEnd = getEventEndDate(startDate, event.duration);
  if (calculatedEnd) {
    return calculatedEnd;
  }

  const fallback = new Date(
    startDate.getTime() + fallbackHours * 60 * 60 * 1000
  );
  return fallback;
};

/**
 * Builds a Google Calendar URL for adding an event.
 * @param event The event to add to the calendar.
 * @param options Optional overrides for description and location.
 * @returns The Google Calendar URL or null if the event date is invalid.
 */
export const buildGoogleCalendarUrl = (
  event: Event,
  options: {
    descriptionOverride?: string;
    locationOverride?: string;
  } = {}
): string | null => {
  // Abort early if the event date can't be parsed; Google rejects invalid ranges.
  if (!hasValidEventDate(event)) {
    return null;
  }

  const start = new Date(event.date);
  const end = deriveEventEnd(event);
  if (!end) {
    return null;
  }

  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: options.descriptionOverride ?? event.description ?? "",
    location: options.locationOverride ?? event.location?.address ?? "",
    dates: `${formatDateTimeUtc(start)}/${formatDateTimeUtc(end)}`,
  });

  return `${baseUrl}?${params.toString()}`;
};
