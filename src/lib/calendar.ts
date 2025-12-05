import type { Event } from "../types";
import { getEventEndDate } from "./datetime";

// Utilities for producing calendar-friendly timestamps and shareable URLs.

const formatDateTimeUtc = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}${String(date.getUTCDate()).padStart(2, "0")}T${String(
    date.getUTCHours()
  ).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(
    date.getUTCSeconds()
  ).padStart(2, "0")}Z`;

export const hasValidEventDate = (event: Event): boolean => {
  if (!event.date) return false;
  const start = new Date(event.date);
  return Number.isFinite(start.getTime());
};

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
