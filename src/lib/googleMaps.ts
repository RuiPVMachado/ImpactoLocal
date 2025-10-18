export const GOOGLE_MAPS_LIBRARIES: ("places" | "drawing" | "geometry")[] = [
  "places",
  "drawing",
  "geometry",
];

export const DEFAULT_MAP_CENTER = {
  lat: 38.7223, // Lisbon, Portugal
  lng: -9.1393,
};

export const DEFAULT_SEARCH_RADIUS_METERS = 15000; // 15km radius by default

export const DEFAULT_MAP_ZOOM = 12;

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
    stylers: [{ visibility: "off" }],
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

export function getGoogleMapsApiKey(): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing environment variable: VITE_GOOGLE_MAPS_API_KEY");
  }
  return apiKey;
}
