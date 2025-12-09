/**
 * Shared Google Maps configuration primitives used by the map explorer.
 */
export const GOOGLE_MAPS_LIBRARIES: ("places" | "drawing" | "geometry")[] = [
  "places",
  "drawing",
  "geometry",
];

/**
 * Default center coordinates for the map (Porto, Portugal).
 */
export const DEFAULT_MAP_CENTER = {
  lat: 41.1579, // Porto, Portugal
  lng: -8.6291,
};

/**
 * Default search radius in meters (15km).
 */
export const DEFAULT_SEARCH_RADIUS_METERS = 15000; // 15km radius by default

/**
 * Default zoom level for the map.
 */
export const DEFAULT_MAP_ZOOM = 12;

/**
 * Custom map style inspired by Idealista.
 */
export const IDEALISTA_MAP_STYLE: google.maps.MapTypeStyle[] = [
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a4a4a" }],
  },
  {
    featureType: "landscape",
    elementType: "all",
    stylers: [{ color: "#f5f5f2" }, { saturation: 10 }, { lightness: 20 }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#e6e6e6" }],
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }, { lightness: 100 }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d6d6d6" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b6b6b" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visualization: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#d4ebf2" }, { lightness: 10 }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a4a4a" }],
  },
];

/**
 * Retrieves the Google Maps API key from environment variables.
 * Throws an error if the key is missing.
 * @returns The Google Maps API key.
 */
export function getGoogleMapsApiKey(): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing environment variable: VITE_GOOGLE_MAPS_API_KEY");
  }
  return apiKey;
}
