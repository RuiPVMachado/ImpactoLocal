// Date/time helpers focused on handling browser-local inputs and free-form durations.

export function getLocalDateTimeInputValue(date: Date): string {
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(time - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function getNowLocalDateTimeInputValue(): string {
  return getLocalDateTimeInputValue(new Date());
}

export const MIN_EVENT_START_LEEWAY_MS = 60_000;

// Accepts multiple duration formats ("1h30", "90m", "1:30") to keep forms forgiving.
export function parseDurationToMinutes(duration?: string | null): number {
  if (!duration) {
    return 0;
  }

  const trimmed = duration.trim().toLowerCase();
  if (trimmed.length === 0) {
    return 0;
  }

  const sanitized = trimmed.replace(/,/g, ".");

  const colonMatch = sanitized.match(
    /^(\d{1,3})(?:\s*(?::|h)\s*(\d{1,2}))\s*(?:m(?:in(?:s|utos?)?)?)?$/
  );
  if (colonMatch) {
    const hours = Number.parseInt(colonMatch[1], 10);
    const minutes = Number.parseInt(colonMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Math.max(0, hours * 60 + minutes);
    }
  }

  const normalized = sanitized
    .replace(/(\d)([a-z])/gi, "$1 $2")
    .replace(/([a-z])(\d)/gi, "$1 $2");

  const unitMatches = normalized.matchAll(
    /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hora|horas|hour|hours|m|min|mins|minute|minutes|minuto|minutos)/g
  );

  let totalMinutes = 0;
  for (const match of unitMatches) {
    const [, value, unit] = match;
    const numericValue = Number.parseFloat(value);
    if (!Number.isFinite(numericValue)) {
      continue;
    }

    if (/^h|^hr|^hora|^hour/.test(unit)) {
      totalMinutes += numericValue * 60;
    } else {
      totalMinutes += numericValue;
    }
  }

  if (totalMinutes > 0) {
    return Math.max(0, Math.round(totalMinutes));
  }

  const numeric = Number.parseFloat(sanitized);
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.round(numeric * 60));
  }

  return 0;
}

export function normalizeDurationParts(
  hoursInput: number,
  minutesInput: number
): { hours: number; minutes: number } {
  const safeHours = Number.isFinite(hoursInput)
    ? Math.max(0, Math.floor(hoursInput))
    : 0;
  const safeMinutes = Number.isFinite(minutesInput)
    ? Math.max(0, Math.floor(minutesInput))
    : 0;

  const overflowHours = Math.floor(safeMinutes / 60);
  const normalizedMinutes = safeMinutes % 60;

  return {
    hours: safeHours + overflowHours,
    minutes: normalizedMinutes,
  };
}

export function formatDurationFromParts(
  hoursInput: number,
  minutesInput: number
): string {
  const { hours, minutes } = normalizeDurationParts(hoursInput, minutesInput);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) {
    return "0m";
  }

  return parts.join(" ");
}

export function splitDurationToParts(duration?: string | null): {
  hours: number;
  minutes: number;
} {
  const totalMinutes = parseDurationToMinutes(duration);
  if (totalMinutes <= 0) {
    return { hours: 0, minutes: 0 };
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

export function getEventEndDate(
  startDateInput: string | number | Date,
  duration?: string | null
): Date | null {
  const startDate =
    startDateInput instanceof Date
      ? new Date(startDateInput.getTime())
      : new Date(startDateInput);

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const durationMinutes = parseDurationToMinutes(duration);
  if (durationMinutes <= 0) {
    return null;
  }

  return new Date(startDate.getTime() + durationMinutes * 60_000);
}
