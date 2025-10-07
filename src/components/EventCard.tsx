import { Calendar, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import { Event } from "../types";

interface EventCardProps {
  event: Event;
  onApply?: (eventId: string) => void;
  showApplyButton?: boolean;
  onClick?: () => void;
}

export default function EventCard({
  event,
  onApply,
  showApplyButton = true,
  onClick,
}: EventCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
      onClick={onClick}
    >
      <div className="h-48 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Calendar className="h-16 w-16 text-white" />
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">
            {event.category}
          </span>
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold ${
              event.status === "open"
                ? "bg-green-100 text-green-800"
                : event.status === "closed"
                ? "bg-red-100 text-red-800"
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
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="h-4 w-4 mr-2 text-emerald-600" />
            <span className="font-semibold">
              {event.organization?.name ?? "Organização"}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 text-emerald-600" />
            <span>{event.location.address}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
            <span>{new Date(event.date).toLocaleDateString("pt-PT")}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2 text-emerald-600" />
            <span>{event.duration}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm">
            <span className="font-semibold text-emerald-600">
              {event.volunteersRegistered}
            </span>
            <span className="text-gray-600">
              {" "}
              / {event.volunteersNeeded} voluntários
            </span>
          </div>

          {showApplyButton && event.status === "open" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApply?.(event.id);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-semibold"
            >
              Candidatar
            </button>
          ) : (
            <button className="flex items-center text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition">
              Ver Detalhes
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
