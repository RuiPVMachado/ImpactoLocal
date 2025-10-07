export const GOOGLE_MAPS_LIBRARIES: "places"[] = ["places"];

export const DEFAULT_MAP_CENTER = {
  lat: 38.7223, // Lisbon, Portugal
  lng: -9.1393,
};

export const DEFAULT_SEARCH_RADIUS_METERS = 15000; // 15km radius by default

export function getGoogleMapsApiKey(): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing environment variable: VITE_GOOGLE_MAPS_API_KEY");
  }
  return apiKey;
}
