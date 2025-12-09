// Reusable CTA that opens a pre-filled Google Calendar event for the given record.
import type { MouseEvent } from "react";
import { CalendarPlus, ExternalLink } from "lucide-react";
import type { Event } from "../types";
import { buildGoogleCalendarUrl, hasValidEventDate } from "../lib/calendar";

/**
 * Props for the AddToCalendarButton component.
 */
interface AddToCalendarButtonProps {
  /** The event object containing details like title, date, and location. */
  event: Event;
  /** Optional CSS classes to apply to the button. */
  className?: string;
  /** The visual style of the button (default: "primary"). */
  variant?: "primary" | "ghost";
  /** The size of the button (default: "md"). */
  size?: "md" | "sm";
  /** The text label for the button (default: "Adicionar ao calendário"). */
  label?: string;
}

/**
 * A button that opens a Google Calendar event creation page pre-filled with event details.
 * It handles invalid dates gracefully by disabling the button.
 */
export default function AddToCalendarButton({
  event,
  className = "",
  variant = "primary",
  size = "md",
  label = "Adicionar ao calendário",
}: AddToCalendarButtonProps) {
  const hasValidDate = hasValidEventDate(event);

  const baseStyles =
    variant === "primary"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "border border-gray-300 text-gray-700 hover:bg-gray-50";

  const sizeStyles =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  const handleClick = (eventClick: MouseEvent<HTMLButtonElement>) => {
    eventClick.stopPropagation();
    if (!hasValidDate) {
      return;
    }

    const url = buildGoogleCalendarUrl(event);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${baseStyles} ${sizeStyles} ${className}`}
      onClick={handleClick}
      disabled={!hasValidDate}
      title={
        hasValidDate
          ? "Abrir no Google Calendar"
          : "Este evento ainda não tem data confirmada."
      }
    >
      <CalendarPlus className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      <span>{label}</span>
      <ExternalLink className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}
