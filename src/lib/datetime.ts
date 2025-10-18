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
