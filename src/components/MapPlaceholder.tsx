// Lightweight map embed with fallbacks when lat/lng are missing.
import { MapPin, Navigation } from "lucide-react";

/**
 * Props for the MapPlaceholder component.
 */
interface MapPlaceholderProps {
  /** The address to display or search for. */
  address: string;
  /** Optional latitude coordinate. */
  lat?: number;
  /** Optional longitude coordinate. */
  lng?: number;
}

/**
 * A component that displays a map embed or a placeholder if coordinates are missing.
 * Provides links to open the location in Google Maps.
 */
export default function MapPlaceholder({
  address,
  lat,
  lng,
}: MapPlaceholderProps) {
  const googleMapsUrl =
    lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address
        )}`;

  const directionsUrl =
    lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          address
        )}`;

  const embedUrl =
    lat && lng
      ? `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`
      : null;

  return (
    <div className="space-y-4">
      {embedUrl && (
        <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-md">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Event Location Map"
          ></iframe>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start mb-4">
          <MapPin className="h-6 w-6 text-emerald-600 mr-3 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Endereço</h3>
            <p className="text-gray-700">{address}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center bg-brand-secondary text-white px-4 py-3 rounded-lg transition font-semibold hover:bg-brand-secondary/90"
          >
            <MapPin className="h-5 w-5 mr-2" />
            Ver no Google Maps
          </a>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center border-2 border-brand-secondary text-brand-secondary px-4 py-3 rounded-lg transition font-semibold hover:bg-brand-secondary hover:text-white"
          >
            <Navigation className="h-5 w-5 mr-2" />
            Como Chegar
          </a>
        </div>
      </div>
    </div>
  );
}
