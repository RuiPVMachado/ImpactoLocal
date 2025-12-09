// Rich preview card summarizing an event with schedule, location, and CTA hooks.
import { Calendar, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import { getEventEndDate } from "../lib/datetime";
import { formatDurationWithHours } from "../lib/formatters";
import { Event } from "../types";
import AddToCalendarButton from "./AddToCalendarButton";

/**
 * Props for the EventCard component.
 */
interface EventCardProps {
  /** The event object to display. */
  event: Event;
  /** Optional callback function when the card is clicked. */
  onClick?: () => void;
  /** Whether to show the "Inscrever-se" button (default: true). */
  showApplyButton?: boolean;
}

/**
 * A card component that displays a summary of an event.
 * Includes the event image, title, date, location, and action buttons.
 */
export default function EventCard({
  event,
  onClick,
  showApplyButton = true,
}: EventCardProps) {
  const startDate = new Date(event.date);
  const hasValidStart = !Number.isNaN(startDate.getTime());

  const formattedDate = hasValidStart
    ? startDate.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Data por confirmar";

  const formattedStartTime = hasValidStart
    ? startDate.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const endDate = hasValidStart
    ? getEventEndDate(startDate, event.duration)
    : null;
  const formattedEndTime = endDate
    ? endDate.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const timeDisplay = formattedStartTime
    ? formattedEndTime
      ? `Horário: ${formattedStartTime} - ${formattedEndTime}`
      : `Horário: ${formattedStartTime}`
    : "Horário por confirmar";

  const durationLabel = formatDurationWithHours(event.duration);

  return (
    <div
      className="group relative bg-white rounded-2xl shadow-soft overflow-hidden border border-brand-secondary/10 transition-all duration-200 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-brand-secondary/20 focus-within:-translate-y-1 focus-within:shadow-lg focus-within:border-brand-secondary/20"
      onClick={onClick}
    >
      <div className="h-60 bg-brand-secondary/10 flex items-center justify-center">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Calendar className="h-16 w-16 text-brand-secondary" />
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-brand-secondary text-white text-xs px-3 py-1 rounded-full font-semibold">
            {event.category}
          </span>
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold ${
              event.status === "open"
                ? "bg-brand-primary text-white"
                : event.status === "closed"
                ? "bg-rose-100 text-rose-700"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {event.status === "open"
              ? "Aberto"
              : event.status === "closed"
              ? "Fechado"
              : "Concluído"}
          </span>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
        <p className="text-brand-neutral text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-brand-neutral">
            <Users className="h-4 w-4 mr-2 text-brand-secondary" />
            <span className="font-semibold">
              {event.organization?.name ?? "Organização"}
            </span>
          </div>

          <div className="flex items-center text-sm text-brand-neutral">
            <MapPin className="h-4 w-4 mr-2 text-brand-secondary" />
            <span>{event.location.address}</span>
          </div>

          <div className="flex items-center text-sm text-brand-neutral">
            <Calendar className="h-4 w-4 mr-2 text-brand-secondary" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-start text-sm text-brand-neutral">
            <Clock className="h-4 w-4 mr-2 mt-0.5 text-brand-secondary" />
            <div>
              <span className="block">{timeDisplay}</span>
              {durationLabel && (
                <span className="block text-xs text-brand-neutral">
                  Duração: {durationLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-brand-secondary/10">
          <div className="text-sm">
            <span className="font-semibold text-brand-secondary">
              {event.volunteersRegistered}
            </span>
            <span className="text-brand-neutral">
              {" "}
              / {event.volunteersNeeded} voluntários
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AddToCalendarButton
              event={event}
              variant="ghost"
              size="sm"
              label="Calendário"
            />
            {showApplyButton && (
              <button
                type="button"
                onClick={(eventClick) => {
                  eventClick.stopPropagation();
                  onClick?.();
                }}
                className="flex items-center text-brand-secondary text-sm font-semibold transition hover:text-brand-secondary/80"
              >
                Ver Detalhes
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
