export function formatDurationWithHours(duration?: string | null): string {
  if (!duration) {
    return "";
  }

  const trimmed = duration.trim();
  if (trimmed.length === 0) {
    return "";
  }

  // If already contains an "h" suffix (case-insensitive), normalize to lowercase and return
  if (/h\b/i.test(trimmed)) {
    return trimmed.replace(/H/g, "h");
  }

  // Pure numeric value (e.g., "4" or "1,5"): append the suffix directly
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
    return `${trimmed}h`;
  }

  // Extract leading numeric portion and transform occurrences of "hora(s)"
  const leadingNumericMatch = trimmed.match(/^\d+(?:[.,]\d+)?/);
  if (leadingNumericMatch) {
    const numberPortion = leadingNumericMatch[0];
    const remainder = trimmed.slice(numberPortion.length).trim();
    const cleanedRemainder = remainder.replace(/^horas?/i, "").trim();

    return cleanedRemainder.length > 0
      ? `${numberPortion}h ${cleanedRemainder}`
      : `${numberPortion}h`;
  }

  return trimmed;
}
