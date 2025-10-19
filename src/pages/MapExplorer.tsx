import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
  Autocomplete,
  DrawingManager,
  Polygon,
  Circle,
} from "@react-google-maps/api";
import { Filter, MapPin, MousePointer2, Trash2, Building2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchEvents } from "../lib/api";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_SEARCH_RADIUS_METERS,
  GOOGLE_MAPS_LIBRARIES,
  IDEALISTA_MAP_STYLE,
  getGoogleMapsApiKey,
} from "../lib/googleMaps";
import type { Event } from "../types";

type PolygonArea = {
  type: "polygon";
  paths: google.maps.LatLngLiteral[];
};

type CircleArea = {
  type: "circle";
  center: google.maps.LatLngLiteral;
  radius: number;
};

type ActiveArea = PolygonArea | CircleArea | null;

type DrawMode = "polygon" | "circle" | null;

type VolunteerPlace = {
  id: string;
  name: string;
  location: google.maps.LatLngLiteral;
  address?: string;
  placeId?: string;
};

const MAX_VOLUNTEER_RESULTS = 60;
const VOLUNTEER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const NEXT_PAGE_DELAY_MS = 200;
const VOLUNTEER_FALLBACK_RADIUS_METERS = DEFAULT_SEARCH_RADIUS_METERS;

const MapExplorer = () => {
  const googleMapsApiKey = useMemo(() => getGoogleMapsApiKey(), []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "map-explorer-script",
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [activeArea, setActiveArea] = useState<ActiveArea>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [volunteerPlaces, setVolunteerPlaces] = useState<VolunteerPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [showOrganizations, setShowOrganizations] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const polygonListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const geocodeQueueRef = useRef<Set<string>>(new Set());
  const processedGeocodeRef = useRef<Set<string>>(new Set());
  const volunteerRequestIdRef = useRef(0);
  const volunteerCacheRef = useRef(
    new Map<string, { timestamp: number; places: VolunteerPlace[] }>()
  );

  const eventIcon = useMemo<google.maps.Symbol | undefined>(() => {
    if (!isLoaded || !window.google?.maps) {
      return undefined;
    }

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: "#059669",
      fillOpacity: 0.9,
      strokeColor: "#10b981",
      strokeOpacity: 1,
      strokeWeight: 2,
      scale: 8,
    } satisfies google.maps.Symbol;
  }, [isLoaded]);

  const companyIcon = useMemo<google.maps.Symbol | undefined>(() => {
    if (!isLoaded || !window.google?.maps) {
      return undefined;
    }

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: "#2563eb",
      fillOpacity: 0.85,
      strokeColor: "#1d4ed8",
      strokeOpacity: 1,
      strokeWeight: 2,
      scale: 7,
    } satisfies google.maps.Symbol;
  }, [isLoaded]);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        const data = await fetchEvents();
        if (!isMounted) {
          return;
        }
        setEvents(data);
      } catch (error) {
        console.error("Falha ao carregar eventos", error);
        if (isMounted) {
          toast.error(
            "Não foi possível carregar os eventos. Tente novamente mais tarde."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingEvents(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setMapCenter(DEFAULT_MAP_CENTER);
  }, []);

  useEffect(() => {
    if (!isLoaded || !window.google?.maps) {
      return;
    }

    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (
      !isLoaded ||
      !geocoderRef.current ||
      !window.google?.maps ||
      events.length === 0
    ) {
      return;
    }

    const queue = events
      .filter((event) => {
        const hasCoords =
          typeof event.location.lat === "number" &&
          typeof event.location.lng === "number";
        const address = event.location.address?.trim();

        if (hasCoords || !address) {
          return false;
        }

        if (processedGeocodeRef.current.has(event.id)) {
          return false;
        }

        if (geocodeQueueRef.current.has(event.id)) {
          return false;
        }

        geocodeQueueRef.current.add(event.id);
        return true;
      })
      .map((event) => ({
        id: event.id,
        address: event.location.address!.trim(),
      }));

    if (queue.length === 0) {
      return;
    }

    let cancelled = false;

    const processNext = () => {
      if (cancelled) {
        return;
      }

      const next = queue.shift();
      if (!next) {
        return;
      }

      try {
        geocoderRef.current!.geocode(
          { address: next.address },
          (results, status) => {
            if (cancelled) {
              return;
            }

            if (
              status === google.maps.GeocoderStatus.OK &&
              Array.isArray(results) &&
              results[0]?.geometry?.location
            ) {
              const location = results[0].geometry.location;
              const lat = location.lat();
              const lng = location.lng();

              processedGeocodeRef.current.add(next.id);

              setEvents((previous) =>
                previous.map((event) =>
                  event.id === next.id
                    ? {
                        ...event,
                        location: {
                          ...event.location,
                          lat,
                          lng,
                        },
                      }
                    : event
                )
              );
            } else if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
              processedGeocodeRef.current.add(next.id);
            } else if (status !== google.maps.GeocoderStatus.OK) {
              console.warn(
                `Falha ao geocodificar endereço do evento ${next.id}:`,
                status
              );
            }

            geocodeQueueRef.current.delete(next.id);

            if (!cancelled && queue.length > 0) {
              window.setTimeout(processNext, 200);
            }
          }
        );
      } catch (error) {
        geocodeQueueRef.current.delete(next.id);
        if (!cancelled) {
          console.warn(
            `Erro inesperado ao geocodificar endereço do evento ${next.id}:`,
            error
          );
          if (queue.length > 0) {
            window.setTimeout(processNext, 400);
          }
        }
      }
    };

    processNext();

    return () => {
      cancelled = true;
    };
  }, [events, isLoaded]);

  const eventsWithCoordinates = useMemo(
    () =>
      events.filter(
        (event) =>
          typeof event.location.lat === "number" &&
          typeof event.location.lng === "number"
      ),
    [events]
  );

  const pendingGeocodeCount = useMemo(
    () =>
      events.filter((event) => {
        const hasCoords =
          typeof event.location.lat === "number" &&
          typeof event.location.lng === "number";
        const hasAddress = Boolean(event.location.address?.trim());
        return !hasCoords && hasAddress;
      }).length,
    [events]
  );

  const missingCoordinatesCount = useMemo(
    () =>
      events.filter(
        (event) =>
          typeof event.location.lat !== "number" ||
          typeof event.location.lng !== "number"
      ).length,
    [events]
  );

  const unresolvedWithoutAddress = Math.max(
    missingCoordinatesCount - pendingGeocodeCount,
    0
  );

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      styles: IDEALISTA_MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      backgroundColor: "#f4f4f2",
      gestureHandling: "greedy",
    }),
    []
  );

  const drawingManagerOptions =
    useMemo<google.maps.drawing.DrawingManagerOptions>(
      () => ({
        drawingMode:
          drawMode === "polygon"
            ? google.maps.drawing.OverlayType.POLYGON
            : drawMode === "circle"
            ? google.maps.drawing.OverlayType.CIRCLE
            : null,
        drawingControl: false,
        polygonOptions: {
          fillColor: "#34d399",
          fillOpacity: 0.25,
          strokeColor: "#059669",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          editable: false,
          clickable: false,
        },
        circleOptions: {
          fillColor: "#34d399",
          fillOpacity: 0.15,
          strokeColor: "#059669",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          editable: false,
          clickable: false,
        },
      }),
      [drawMode]
    );

  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon
      .getPath()
      .getArray()
      .map((point) => ({ lat: point.lat(), lng: point.lng() }));

    polygon.setMap(null);

    if (path.length < 3) {
      toast.error("Desenhe pelo menos três pontos para criar um polígono.");
      setDrawMode(null);
      return;
    }

    setActiveArea({ type: "polygon", paths: path });
    setDrawMode(null);

    if (mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((vertex) => bounds.extend(vertex));
      mapRef.current.fitBounds(bounds, 48);
    }
  }, []);

  const handleCircleComplete = useCallback((circle: google.maps.Circle) => {
    const center = circle.getCenter();
    if (!center) {
      circle.setMap(null);
      setDrawMode(null);
      return;
    }

    const newArea: CircleArea = {
      type: "circle",
      center: { lat: center.lat(), lng: center.lng() },
      radius: circle.getRadius(),
    };

    circle.setMap(null);

    setActiveArea(newArea);
    setDrawMode(null);
    setMapCenter(newArea.center);

    if (mapRef.current) {
      const bounds = circle.getBounds();
      if (bounds) {
        mapRef.current.fitBounds(bounds, 48);
      }
    }
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const updatePolygonFromRef = useCallback(() => {
    const polygon = polygonRef.current;
    if (!polygon) return;

    const path = polygon
      .getPath()
      .getArray()
      .map((point) => ({ lat: point.lat(), lng: point.lng() }));

    setActiveArea((current) => {
      if (!current || current.type !== "polygon") {
        return current;
      }
      return { ...current, paths: path };
    });
  }, []);

  const handlePolygonLoad = useCallback(
    (polygon: google.maps.Polygon) => {
      polygonRef.current = polygon;

      polygonListenersRef.current = [
        polygon.getPath().addListener("set_at", updatePolygonFromRef),
        polygon.getPath().addListener("insert_at", updatePolygonFromRef),
        polygon.getPath().addListener("remove_at", updatePolygonFromRef),
      ];
    },
    [updatePolygonFromRef]
  );

  const handlePolygonUnmount = useCallback(() => {
    polygonListenersRef.current.forEach((listener) => listener.remove());
    polygonListenersRef.current = [];
    polygonRef.current = null;
  }, []);

  const updateCircleFromRef = useCallback(() => {
    const circle = circleRef.current;
    if (!circle) {
      return;
    }

    const center = circle.getCenter();
    const radius = circle.getRadius();

    if (!center || !Number.isFinite(radius)) {
      return;
    }

    const nextCenter = {
      lat: Number(center.lat().toFixed(6)),
      lng: Number(center.lng().toFixed(6)),
    };

    setActiveArea((current) => {
      if (
        current?.type === "circle" &&
        Math.abs(current.radius - radius) < 0.5 &&
        Math.abs(current.center.lat - nextCenter.lat) < 0.000001 &&
        Math.abs(current.center.lng - nextCenter.lng) < 0.000001
      ) {
        return current;
      }

      return {
        type: "circle",
        center: nextCenter,
        radius,
      } satisfies CircleArea;
    });
  }, []);

  const handleCircleLoad = useCallback((circle: google.maps.Circle) => {
    circleRef.current = circle;
  }, []);

  const handleCircleUnmount = useCallback(() => {
    circleRef.current = null;
  }, []);

  const handleIdle = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;

    const nextCenter = {
      lat: Number(center.lat().toFixed(6)),
      lng: Number(center.lng().toFixed(6)),
    };

    setMapCenter((prev) => {
      if (
        Math.abs(prev.lat - nextCenter.lat) < 0.000001 &&
        Math.abs(prev.lng - nextCenter.lng) < 0.000001
      ) {
        return prev;
      }
      return nextCenter;
    });
  }, []);

  const clearActiveArea = useCallback(() => {
    polygonListenersRef.current.forEach((listener) => listener.remove());
    polygonListenersRef.current = [];
    polygonRef.current = null;
    circleRef.current = null;
    setActiveArea(null);
    setDrawMode(null);
    setSelectedEventId(null);
    setSelectedPlaceId(null);
  }, []);

  const handlePlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place || !place.geometry || !place.geometry.location) return;

    const location = place.geometry.location;
    const newCenter = { lat: location.lat(), lng: location.lng() };
    setMapCenter(newCenter);
    clearActiveArea();

    if (mapRef.current) {
      mapRef.current.panTo(newCenter);
      mapRef.current.setZoom(14);
    }
  }, [clearActiveArea]);

  const filteredEvents = useMemo(() => {
    if (!window.google?.maps) {
      return eventsWithCoordinates;
    }

    const polygonInstance =
      activeArea?.type === "polygon"
        ? new window.google.maps.Polygon({ paths: activeArea.paths })
        : null;

    const circleCenter =
      activeArea?.type === "circle"
        ? new window.google.maps.LatLng(
            activeArea.center.lat,
            activeArea.center.lng
          )
        : null;
    const circleRadius =
      activeArea?.type === "circle" ? activeArea.radius : null;

    const containsLocation =
      window.google?.maps.geometry?.poly?.containsLocation;
    const computeDistanceBetween =
      window.google?.maps.geometry?.spherical?.computeDistanceBetween;

    return eventsWithCoordinates.filter((event) => {
      const { lat, lng } = event.location;
      if (typeof lat !== "number" || typeof lng !== "number") return false;

      const position = new window.google.maps.LatLng(lat, lng);

      if (polygonInstance) {
        if (containsLocation) {
          return containsLocation(position, polygonInstance);
        }
        return true;
      }

      if (
        circleCenter &&
        typeof circleRadius === "number" &&
        computeDistanceBetween
      ) {
        const distance = computeDistanceBetween(position, circleCenter);
        return distance <= circleRadius;
      }

      return true;
    });
  }, [activeArea, eventsWithCoordinates]);

  const volunteerSearchParams = useMemo(() => {
    if (activeArea?.type === "circle") {
      const adjustedRadius = Math.min(
        Math.max(activeArea.radius * 1.1, 500),
        50000
      );
      return {
        center: activeArea.center,
        radius: adjustedRadius,
      };
    }

    if (activeArea?.type === "polygon" && window.google?.maps) {
      try {
        const bounds = new window.google.maps.LatLngBounds();
        activeArea.paths.forEach((vertex) => bounds.extend(vertex));
        const center = bounds.getCenter();

        let radius = VOLUNTEER_FALLBACK_RADIUS_METERS;

        const computeDistance =
          window.google.maps.geometry?.spherical?.computeDistanceBetween;

        if (computeDistance) {
          const centerLatLng = new window.google.maps.LatLng(
            center.lat(),
            center.lng()
          );

          const maxDistance = activeArea.paths.reduce((max, vertex) => {
            const distance = computeDistance(
              centerLatLng,
              new window.google.maps.LatLng(vertex.lat, vertex.lng)
            );
            return Math.max(max, distance ?? 0);
          }, 0);

          if (maxDistance > 0) {
            radius = Math.min(Math.max(maxDistance * 1.2, 500), 50000);
          }
        }

        return {
          center: { lat: center.lat(), lng: center.lng() },
          radius,
        };
      } catch (error) {
        console.warn("Não foi possível calcular o centro do polígono", error);
      }
    }

    return {
      center: mapCenter,
      radius: VOLUNTEER_FALLBACK_RADIUS_METERS,
    };
  }, [activeArea, mapCenter]);

  const filteredVolunteerPlaces = useMemo(() => {
    if (!showOrganizations) {
      return [] as VolunteerPlace[];
    }

    if (!window.google?.maps) {
      return volunteerPlaces;
    }

    const polygonInstance =
      activeArea?.type === "polygon"
        ? new window.google.maps.Polygon({ paths: activeArea.paths })
        : null;

    const circleCenter =
      activeArea?.type === "circle"
        ? new window.google.maps.LatLng(
            activeArea.center.lat,
            activeArea.center.lng
          )
        : null;
    const circleRadius =
      activeArea?.type === "circle" ? activeArea.radius : null;

    const containsLocation =
      window.google?.maps.geometry?.poly?.containsLocation;
    const computeDistanceBetween =
      window.google?.maps.geometry?.spherical?.computeDistanceBetween;

    return volunteerPlaces.filter((place) => {
      const { lat, lng } = place.location;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return false;
      }

      const position = new window.google.maps.LatLng(lat, lng);

      if (polygonInstance) {
        if (containsLocation) {
          return containsLocation(position, polygonInstance);
        }
        return true;
      }

      if (
        circleCenter &&
        typeof circleRadius === "number" &&
        computeDistanceBetween
      ) {
        const distance = computeDistanceBetween(position, circleCenter);
        return distance <= circleRadius;
      }

      return true;
    });
  }, [activeArea, showOrganizations, volunteerPlaces]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return filteredEvents.find((event) => event.id === selectedEventId) ?? null;
  }, [filteredEvents, selectedEventId]);

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return (
      filteredVolunteerPlaces.find((place) => place.id === selectedPlaceId) ??
      null
    );
  }, [filteredVolunteerPlaces, selectedPlaceId]);

  useEffect(() => {
    if (
      selectedEventId &&
      !filteredEvents.some((event) => event.id === selectedEventId)
    ) {
      setSelectedEventId(null);
    }
  }, [filteredEvents, selectedEventId]);

  useEffect(() => {
    if (
      selectedPlaceId &&
      !filteredVolunteerPlaces.some((place) => place.id === selectedPlaceId)
    ) {
      setSelectedPlaceId(null);
    }
  }, [filteredVolunteerPlaces, selectedPlaceId]);

  const loadVolunteerPlaces = useCallback(
    (location: google.maps.LatLngLiteral, radius: number) => {
      if (!mapRef.current || !window.google?.maps?.places) {
        return;
      }

      const requestId = volunteerRequestIdRef.current + 1;
      volunteerRequestIdRef.current = requestId;

      const cacheKey = `${location.lat.toFixed(5)},${location.lng.toFixed(
        5
      )}|${Math.round(radius)}`;

      const cached = volunteerCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < VOLUNTEER_CACHE_TTL_MS) {
        setVolunteerPlaces(cached.places);
        setPlacesLoading(false);
        return;
      }

      setPlacesLoading(true);

      const service = new window.google.maps.places.PlacesService(
        mapRef.current
      );

      const maxRadius = Math.min(radius, 50000);
      const geometry = window.google.maps.geometry ?? null;
      const originLatLng = new window.google.maps.LatLng(
        location.lat,
        location.lng
      );

      const aggregatedPlaces = new Map<string, VolunteerPlace>();

      const sortPlaces = (places: Iterable<VolunteerPlace>) => {
        const array = Array.from(places);

        if (!geometry?.spherical) {
          return array.sort((a, b) =>
            a.name.localeCompare(b.name, "pt", { sensitivity: "base" })
          );
        }

        return array.sort((a, b) => {
          const distanceA = geometry.spherical.computeDistanceBetween(
            originLatLng,
            new window.google.maps.LatLng(a.location.lat, a.location.lng)
          );

          const distanceB = geometry.spherical.computeDistanceBetween(
            originLatLng,
            new window.google.maps.LatLng(b.location.lat, b.location.lng)
          );

          if (Math.abs(distanceA - distanceB) > 1) {
            return distanceA - distanceB;
          }

          return a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
        });
      };

      const pushResults = (
        results: google.maps.places.PlaceResult[] | null
      ) => {
        if (!results) {
          return;
        }

        for (const place of results) {
          if (!place.geometry?.location) {
            continue;
          }

          const placeId = place.place_id ?? `${place.name}-${place.vicinity}`;
          if (!placeId || aggregatedPlaces.has(placeId)) {
            continue;
          }

          aggregatedPlaces.set(placeId, {
            id: placeId,
            name: place.name ?? "Organização de voluntariado",
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            address:
              place.formatted_address ??
              place.vicinity ??
              "Morada não disponível",
            placeId: place.place_id ?? undefined,
          });

          if (aggregatedPlaces.size >= MAX_VOLUNTEER_RESULTS) {
            break;
          }
        }

        if (volunteerRequestIdRef.current === requestId) {
          setVolunteerPlaces(sortPlaces(aggregatedPlaces.values()));
        }
      };

      const fetchPages = async (
        request:
          | google.maps.places.PlaceSearchRequest
          | google.maps.places.TextSearchRequest,
        searchFn: (
          req:
            | google.maps.places.PlaceSearchRequest
            | google.maps.places.TextSearchRequest,
          callback: (
            results: google.maps.places.PlaceResult[] | null,
            status: google.maps.places.PlacesServiceStatus,
            pagination: google.maps.places.PlaceSearchPagination | null
          ) => void
        ) => void
      ) => {
        await new Promise<void>((resolve) => {
          const handleResults = (
            results: google.maps.places.PlaceResult[] | null,
            status: google.maps.places.PlacesServiceStatus,
            pagination: google.maps.places.PlaceSearchPagination | null
          ) => {
            if (volunteerRequestIdRef.current !== requestId) {
              resolve();
              return;
            }

            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results
            ) {
              pushResults(results);
            } else if (
              status !== window.google.maps.places.PlacesServiceStatus.OK &&
              status !==
                window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            ) {
              console.warn("Falha ao obter empresas de voluntariado", status);
            }

            if (
              pagination &&
              pagination.hasNextPage &&
              aggregatedPlaces.size < MAX_VOLUNTEER_RESULTS
            ) {
              window.setTimeout(() => {
                pagination.nextPage();
              }, NEXT_PAGE_DELAY_MS);
              return;
            }

            resolve();
          };

          searchFn(request, handleResults);
        });
      };

      const run = async () => {
        try {
          const nearbyRequest: google.maps.places.PlaceSearchRequest = {
            location,
            radius: maxRadius,
            keyword: "voluntariado",
            type: "point_of_interest",
          };

          await fetchPages(nearbyRequest, service.nearbySearch.bind(service));

          if (volunteerRequestIdRef.current !== requestId) {
            return;
          }

          if (aggregatedPlaces.size === 0) {
            const textSearchRequest: google.maps.places.TextSearchRequest = {
              location,
              radius: maxRadius,
              query: "associação de voluntariado",
            };

            await fetchPages(
              textSearchRequest,
              service.textSearch.bind(service)
            );

            if (volunteerRequestIdRef.current !== requestId) {
              return;
            }
          }

          const finalResults = sortPlaces(aggregatedPlaces.values());

          volunteerCacheRef.current.set(cacheKey, {
            timestamp: Date.now(),
            places: finalResults,
          });

          setVolunteerPlaces(finalResults);
        } catch (error) {
          if (volunteerRequestIdRef.current === requestId) {
            console.warn(
              "Erro inesperado ao carregar empresas de voluntariado",
              error
            );
            setVolunteerPlaces([]);
          }
        } finally {
          if (volunteerRequestIdRef.current === requestId) {
            setPlacesLoading(false);
          }
        }
      };

      run();
    },
    []
  );

  const volunteerCenter = volunteerSearchParams.center;
  const volunteerRadius = volunteerSearchParams.radius;

  useEffect(() => {
    if (!isLoaded || !showOrganizations) {
      setVolunteerPlaces([]);
      return;
    }

    if (!volunteerCenter) {
      return;
    }

    loadVolunteerPlaces(volunteerCenter, volunteerRadius);
  }, [
    isLoaded,
    loadVolunteerPlaces,
    showOrganizations,
    volunteerCenter,
    volunteerRadius,
  ]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Erro ao carregar o mapa
          </h1>
          <p className="text-gray-600">
            Não foi possível carregar o Google Maps. Verifique a sua ligação à
            Internet e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Mapa Interativo de Oportunidades
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Explore eventos de voluntariado e organizações próximas com filtros
            por localização, raio de distância e áreas desenhadas no mapa.
          </p>
        </div>

        <div
          className="grid gap-6 lg:grid-cols-[360px_1fr]"
          style={{ height: "calc(100vh - 13rem)" }}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 overflow-y-auto">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <Filter className="h-5 w-5" />
              <span>Filtros e Camadas</span>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Pesquisar localização
                </p>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(instance) => {
                      autocompleteRef.current = instance;
                    }}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input
                      type="text"
                      placeholder="Introduza morada ou coordenadas"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                  </Autocomplete>
                ) : (
                  <div className="h-[46px] w-full animate-pulse rounded-lg bg-gray-200" />
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Utilize a pesquisa para definir o ponto de referência do mapa.
                </p>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Ferramenta de desenho
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDrawMode("polygon")}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      drawMode === "polygon"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-600"
                    }`}
                  >
                    <MousePointer2 className="h-4 w-4" />
                    Polígono livre
                  </button>
                  <button
                    onClick={() => setDrawMode("circle")}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      drawMode === "circle"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-600"
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    Círculo por raio
                  </button>
                  {activeArea && (
                    <button
                      onClick={clearActiveArea}
                      className="ml-auto flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpar área
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Desenhe uma área de interesse diretamente no mapa. Ao fechar a
                  forma, os eventos serão filtrados automaticamente.
                </p>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Camadas visíveis
                </p>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showEvents}
                    onChange={(event) => setShowEvents(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Mostrar eventos
                </label>
                <label className="mt-2 flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showOrganizations}
                    onChange={(event) =>
                      setShowOrganizations(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Mostrar empresas de voluntariado
                </label>
                <div className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                  {loadingEvents ? (
                    <p className="text-emerald-700">A carregar eventos...</p>
                  ) : (
                    <p>
                      Eventos encontrados:{" "}
                      <strong>{filteredEvents.length}</strong>
                    </p>
                  )}
                  {showOrganizations && (
                    <p className="mt-1">
                      Empresas visíveis:{" "}
                      <strong>{filteredVolunteerPlaces.length}</strong>
                      {placesLoading ? " (a carregar...)" : ""}
                      {!placesLoading &&
                        filteredVolunteerPlaces.length !==
                          volunteerPlaces.length && (
                          <span className="ml-1 text-[11px] text-emerald-700/80">
                            (de {volunteerPlaces.length} resultados)
                          </span>
                        )}
                    </p>
                  )}
                  {showOrganizations &&
                    !placesLoading &&
                    volunteerPlaces.length > 0 &&
                    filteredVolunteerPlaces.length === 0 && (
                      <p className="mt-1 text-emerald-700">
                        Nenhuma organização dentro da área selecionada.
                      </p>
                    )}
                  {showOrganizations &&
                    !placesLoading &&
                    volunteerPlaces.length === 0 && (
                      <p className="mt-1 text-emerald-700">
                        Não encontrámos organizações de voluntariado nesta área.
                      </p>
                    )}
                  {pendingGeocodeCount > 0 && (
                    <p className="mt-1 text-emerald-700">
                      A localizar automaticamente {pendingGeocodeCount}{" "}
                      evento(s) pela morada indicada...
                    </p>
                  )}
                  {unresolvedWithoutAddress > 0 && (
                    <p className="mt-1 text-amber-700">
                      Nota: {unresolvedWithoutAddress} evento(s) sem morada
                      válida não aparecem no mapa.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-full rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            {!isLoaded ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
                  <p className="mt-4 text-gray-600">A carregar mapa...</p>
                </div>
              </div>
            ) : (
              <GoogleMap
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                onIdle={handleIdle}
                center={mapCenter}
                zoom={DEFAULT_MAP_ZOOM}
                options={mapOptions}
                mapContainerClassName="w-full h-full"
              >
                <DrawingManager
                  onPolygonComplete={handlePolygonComplete}
                  onCircleComplete={handleCircleComplete}
                  options={drawingManagerOptions}
                />

                {activeArea?.type === "polygon" && (
                  <Polygon
                    paths={activeArea.paths}
                    options={{
                      fillColor: "#34d399",
                      fillOpacity: 0.2,
                      strokeColor: "#059669",
                      strokeWeight: 2,
                      editable: true,
                    }}
                    onLoad={handlePolygonLoad}
                    onUnmount={handlePolygonUnmount}
                    onMouseUp={updatePolygonFromRef}
                    onDragEnd={updatePolygonFromRef}
                  />
                )}

                {activeArea?.type === "circle" && (
                  <Circle
                    center={activeArea.center}
                    radius={activeArea.radius}
                    options={{
                      fillColor: "#34d399",
                      fillOpacity: 0.15,
                      strokeColor: "#059669",
                      strokeWeight: 2,
                      editable: true,
                    }}
                    onLoad={handleCircleLoad}
                    onUnmount={handleCircleUnmount}
                    onCenterChanged={updateCircleFromRef}
                    onRadiusChanged={updateCircleFromRef}
                  />
                )}

                {showEvents &&
                  filteredEvents.map((event) => {
                    const { lat, lng } = event.location;
                    if (typeof lat !== "number" || typeof lng !== "number") {
                      return null;
                    }

                    return (
                      <Marker
                        key={event.id}
                        position={{ lat, lng }}
                        icon={eventIcon}
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setSelectedPlaceId(null);
                        }}
                      />
                    );
                  })}

                {showOrganizations &&
                  filteredVolunteerPlaces.map((place) => (
                    <Marker
                      key={place.id}
                      position={place.location}
                      icon={companyIcon}
                      onClick={() => {
                        setSelectedPlaceId(place.id);
                        setSelectedEventId(null);
                      }}
                    />
                  ))}

                {showEvents &&
                  selectedEvent &&
                  selectedEvent.location.lat &&
                  selectedEvent.location.lng && (
                    <InfoWindow
                      position={{
                        lat: selectedEvent.location.lat,
                        lng: selectedEvent.location.lng,
                      }}
                      onCloseClick={() => setSelectedEventId(null)}
                    >
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedEvent.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {selectedEvent.date}
                        </p>
                        <a
                          href={`/events/${selectedEvent.id}`}
                          className="mt-2 inline-block text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Ver detalhes do evento →
                        </a>
                      </div>
                    </InfoWindow>
                  )}

                {showOrganizations && selectedPlace && (
                  <InfoWindow
                    position={selectedPlace.location}
                    onCloseClick={() => setSelectedPlaceId(null)}
                  >
                    <div className="max-w-xs">
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedPlace.name}
                      </p>
                      {selectedPlace.address && (
                        <p className="mt-1 text-xs text-gray-600">
                          {selectedPlace.address}
                        </p>
                      )}
                      {selectedPlace.placeId && (
                        <a
                          href={`https://www.google.com/maps/place/?q=place_id:${selectedPlace.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          Ver no Google Maps
                        </a>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapExplorer;
