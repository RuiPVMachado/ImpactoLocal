import { Calendar, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import { formatDurationWithHours } from "../lib/formatters";
import { Event } from "../types";

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  showApplyButton?: boolean;
}

export default function EventCard({
  event,
  onClick,
  showApplyButton = true,
}: EventCardProps) {
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
          <span className="bg-brand-secondary/10 text-brand-secondary text-xs px-3 py-1 rounded-full font-semibold">
            {event.category}
          </span>
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold ${
              event.status === "open"
                ? "bg-brand-primary/15 text-brand-primary"
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
            <span>{new Date(event.date).toLocaleDateString("pt-PT")}</span>
          </div>

          <div className="flex items-center text-sm text-brand-neutral">
            <Clock className="h-4 w-4 mr-2 text-brand-secondary" />
            <span>{formatDurationWithHours(event.duration)}</span>
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
  );
}
