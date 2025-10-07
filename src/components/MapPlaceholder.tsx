import { MapPin, Navigation } from 'lucide-react';

interface MapPlaceholderProps {
  address: string;
  lat?: number;
  lng?: number;
}

export default function MapPlaceholder({ address, lat, lng }: MapPlaceholderProps) {
  const googleMapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const directionsUrl = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  const embedUrl = lat && lng
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
            className="flex-1 flex items-center justify-center bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold"
          >
            <MapPin className="h-5 w-5 mr-2" />
            Ver no Google Maps
          </a>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center border-2 border-emerald-600 text-emerald-600 px-4 py-3 rounded-lg hover:bg-emerald-50 transition font-semibold"
          >
            <Navigation className="h-5 w-5 mr-2" />
            Como Chegar
          </a>
        </div>
      </div>
    </div>
  );
}
