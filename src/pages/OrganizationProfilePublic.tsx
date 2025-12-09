import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Target,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchOrganizationPublicProfile } from "../lib/api";
import type { OrganizationPublicProfile } from "../types";

const formatDate = (iso?: string | null) => {
  if (!iso) {
    return "Data por confirmar";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Data por confirmar";
  }

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getActiveDurationLabel = (iso?: string | null): string | null => {
  if (!iso) {
    return null;
  }

  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  if (diffMs <= 0) {
    return "menos de 24 horas";
  }
  // ...existing code...
};

/**
 * The Organization Public Profile page component.
 * Displays public information about an organization, including its mission, history, and events.
 */
export default function OrganizationProfilePublic() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<OrganizationPublicProfile | null>(
    null
  );

  let years = now.getFullYear() - createdAt.getFullYear();
  let months = now.getMonth() - createdAt.getMonth();
  let days = now.getDate() - createdAt.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += previousMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.max(0, Math.floor(diffMs / 86_400_000));

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ano${years > 1 ? "s" : ""}`);
  }

  if (months > 0) {
    parts.push(`${months} mês${months > 1 ? "es" : ""}`);
  }

  if (parts.length > 0) {
    return parts.join(" e ");
  }

  if (totalDays >= 7) {
    const weeks = Math.floor(totalDays / 7);
    return `${weeks} semana${weeks > 1 ? "s" : ""}`;
  }

  if (totalDays > 0) {
    return `${totalDays} dia${totalDays > 1 ? "s" : ""}`;
  }

  return "menos de 24 horas";
}

const sanitizeGalleryUrls = (urls?: string[] | null): string[] => {
  if (!Array.isArray(urls)) {
    return [];
  }

  return urls
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
};

const COMPLETED_EVENTS_PREVIEW_LIMIT = 4;

export default function OrganizationProfilePublic() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [data, setData] = useState<OrganizationPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCompletedYear, setSelectedCompletedYear] =
    useState<string>("all");
  const [showAllCompletedEvents, setShowAllCompletedEvents] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!organizationId) {
        setErrorMessage("Organização não encontrada.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const profile = await fetchOrganizationPublicProfile(organizationId);
        if (!active) {
          return;
        }

        if (!profile) {
          setErrorMessage("Organização não encontrada.");
          return;
        }

        setData(profile);
      } catch (error) {
        console.error("Erro ao carregar perfil público da organização", error);
        if (!active) {
          return;
        }
        setErrorMessage("Não foi possível carregar a organização.");
        toast.error("Não foi possível carregar a organização.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [organizationId]);

  const organization = data?.organization ?? null;
  const events = useMemo(() => data?.events ?? [], [data?.events]);

  const activeEvents = useMemo(() => {
    return events
      .filter((event) => event.status === "open")
      .sort((first, second) => {
        const firstTime = new Date(first.date).getTime();
        const secondTime = new Date(second.date).getTime();
        if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) {
          return 0;
        }
        return firstTime - secondTime;
      });
  }, [events]);

  const completedEvents = useMemo(() => {
    return events
      .filter((event) => event.status === "completed")
      .sort((first, second) => {
        const firstTime = new Date(first.date).getTime();
        const secondTime = new Date(second.date).getTime();
        if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) {
          return 0;
        }
        return secondTime - firstTime;
      });
  }, [events]);

  const pastEvents = useMemo(() => {
    return events
      .filter((event) => event.status === "closed")
      .sort((first, second) => {
        const firstTime = new Date(first.date).getTime();
        const secondTime = new Date(second.date).getTime();
        if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) {
          return 0;
        }
        return secondTime - firstTime;
      });
  }, [events]);

  const completedEventYears = useMemo(() => {
    const yearSet = new Set<string>();

    completedEvents.forEach((event) => {
      const eventDate = new Date(event.date ?? "");
      const eventTime = eventDate.getTime();
      if (Number.isFinite(eventTime)) {
        yearSet.add(String(eventDate.getFullYear()));
      }
    });

    return Array.from(yearSet).sort(
      (first, second) => Number(second) - Number(first)
    );
  }, [completedEvents]);

  useEffect(() => {
    setSelectedCompletedYear("all");
    setShowAllCompletedEvents(false);
  }, [completedEvents.length]);

  const filteredCompletedEvents = useMemo(() => {
    if (selectedCompletedYear === "all") {
      return completedEvents;
    }

    return completedEvents.filter((event) => {
      const eventDate = new Date(event.date ?? "");
      const eventTime = eventDate.getTime();
      if (!Number.isFinite(eventTime)) {
        return false;
      }

      return String(eventDate.getFullYear()) === selectedCompletedYear;
    });
  }, [completedEvents, selectedCompletedYear]);

  const displayedCompletedEvents = useMemo(() => {
    if (showAllCompletedEvents) {
      return filteredCompletedEvents;
    }

    return filteredCompletedEvents.slice(0, COMPLETED_EVENTS_PREVIEW_LIMIT);
  }, [filteredCompletedEvents, showAllCompletedEvents]);

  const hasMoreCompletedEvents =
    filteredCompletedEvents.length > COMPLETED_EVENTS_PREVIEW_LIMIT;

  const galleryItems = useMemo(
    () => sanitizeGalleryUrls(organization?.galleryUrls),
    [organization?.galleryUrls]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-secondary" />
          <p className="text-gray-600 font-medium">
            A carregar informação da organização...
          </p>
        </div>
      </div>
    );
  }

  if (!organization || errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
            <Building2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Organização indisponível
          </h1>
          <p className="text-gray-600 mb-6">
            {errorMessage ??
              "Não foi possível encontrar a organização que procura."}
          </p>
          <Link
            to="/organizacoes"
            className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/20 px-4 py-2 text-sm font-semibold text-brand-secondary transition hover:border-brand-secondary/40 hover:text-brand-secondary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à lista de organizações
          </Link>
        </div>
      </div>
    );
  }

  const initials = organization.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  const impactStats = organization.impactStats ?? null;
  const activeDurationLabel = getActiveDurationLabel(organization.createdAt);
  const memberSinceLabel = formatDate(organization.createdAt);

  const rawCity = organization.city?.trim() ?? "";
  const rawLocation = organization.location?.trim() ?? "";
  const locationParts = [rawCity, rawLocation].filter(
    (part) => part.length > 0
  );
  const displayLocation = locationParts.join(" • ");
  const searchQuery = [rawLocation, rawCity]
    .filter((part) => part.length > 0)
    .join(", ");

  const locationDetails = searchQuery
    ? (() => {
        const encodedQuery = encodeURIComponent(searchQuery);
        return {
          primaryLocation: displayLocation || searchQuery,
          mapEmbedUrl: `https://maps.google.com/maps?q=${encodedQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`,
        };
      })()
    : {
        primaryLocation: "",
        mapEmbedUrl: null as string | null,
        googleMapsUrl: null as string | null,
        directionsUrl: null as string | null,
      };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            to="/organizacoes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-secondary transition hover:text-brand-secondary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar às organizações
          </Link>
        </div>

        <header className="rounded-3xl bg-white shadow-soft p-6 md:p-10 border border-brand-secondary/15">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {organization.avatarUrl ? (
              <img
                src={organization.avatarUrl}
                alt={`Logo da organização ${organization.name}`}
                className="h-24 w-24 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-brand-secondary/10 text-3xl font-semibold text-brand-secondary">
                {initials || <Building2 className="h-10 w-10" />}
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-col gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    {organization.name}
                  </h1>
                  {displayLocation && (
                    <p className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-5 w-5" />
                      {displayLocation}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-brand-neutral">
                    Organização de voluntariado registada na ImpactoLocal
                  </p>
                </div>

                {activeDurationLabel && (
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-brand-neutral">
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-secondary/10 px-3 py-1 font-semibold text-brand-secondary">
                      <Clock3 className="h-4 w-4" />
                      Tempo na ImpactoLocal: {activeDurationLabel}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-brand-neutral/70">
                      Membro desde {memberSinceLabel}
                    </span>
                  </div>
                )}
              </div>

              {organization.bio && (
                <p className="mt-6 text-gray-700 leading-relaxed">
                  {organization.bio}
                </p>
              )}
            </div>
          </div>
        </header>

        {(locationDetails.primaryLocation ||
          organization.email ||
          organization.phone ||
          activeDurationLabel) && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr,1.4fr]">
            <div className="rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Detalhes da organização
              </h2>
              <dl className="space-y-5">
                {activeDurationLabel && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                      Tempo na ImpactoLocal
                    </dt>
                    <dd className="mt-2 flex items-center gap-2 text-gray-800">
                      <Clock3 className="h-5 w-5 text-brand-secondary" />
                      <span className="font-medium">{activeDurationLabel}</span>
                    </dd>
                    <dd className="mt-1 text-sm text-gray-500">
                      Membro desde {memberSinceLabel}
                    </dd>
                  </div>
                )}

                {organization.email && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                      Email
                    </dt>
                    <dd className="mt-1 inline-flex items-center gap-2 text-gray-800">
                      <Mail className="h-5 w-5 text-brand-secondary" />
                      <a
                        href={`mailto:${organization.email}`}
                        className="font-medium text-brand-secondary transition hover:text-brand-secondary/80"
                      >
                        {organization.email}
                      </a>
                    </dd>
                  </div>
                )}

                {organization.phone && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                      Contacto telefónico
                    </dt>
                    <dd className="mt-1 inline-flex items-center gap-2 text-gray-800">
                      <Phone className="h-5 w-5 text-brand-secondary" />
                      <a
                        href={`tel:${organization.phone}`}
                        className="font-medium text-brand-secondary transition hover:text-brand-secondary/80"
                      >
                        {organization.phone}
                      </a>
                    </dd>
                  </div>
                )}

                {locationDetails.primaryLocation && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                      Localização principal
                    </dt>
                    <dd className="mt-2 flex items-start gap-2 text-gray-800">
                      <MapPin className="mt-0.5 h-5 w-5 text-brand-secondary" />
                      <span>{locationDetails.primaryLocation}</span>
                    </dd>
                  </div>
                )}
              </dl>

              {(locationDetails.googleMapsUrl ||
                locationDetails.directionsUrl) && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {locationDetails.googleMapsUrl && (
                    <a
                      href={locationDetails.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                    >
                      <MapPin className="h-4 w-4" />
                      Ver no Google Maps
                    </a>
                  )}
                  {locationDetails.directionsUrl && (
                    <a
                      href={locationDetails.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-primary px-4 py-3 text-sm font-semibold text-brand-primary transition hover:border-brand-primaryHover hover:text-brand-primaryHover"
                    >
                      <Navigation className="h-4 w-4" />
                      Como chegar
                    </a>
                  )}
                </div>
              )}
            </div>

            {locationDetails.primaryLocation && (
              <div className="rounded-3xl border border-brand-secondary/10 bg-white shadow-soft">
                {locationDetails.mapEmbedUrl ? (
                  <div className="relative h-80 w-full overflow-hidden rounded-3xl lg:rounded-[inherit]">
                    <iframe
                      src={locationDetails.mapEmbedUrl}
                      title={`Localização da organização ${organization.name}`}
                      width="100%"
                      height="100%"
                      loading="lazy"
                      allowFullScreen
                      style={{ border: 0 }}
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-sm text-gray-600">
                    Não foi possível carregar um mapa para esta localização.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {(impactStats || organization.mission || organization.vision) && (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            {impactStats && (
              <div className="rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Impacto da organização
                </h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                    <dt className="text-sm font-medium text-brand-secondary/80">
                      Eventos realizados
                    </dt>
                    <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                      {impactStats.eventsHeld ?? 0}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                    <dt className="text-sm font-medium text-brand-secondary/80">
                      Voluntários impactados
                    </dt>
                    <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                      {impactStats.volunteersImpacted ?? 0}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                    <dt className="text-sm font-medium text-brand-secondary/80">
                      Horas contribuídas
                    </dt>
                    <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                      {impactStats.hoursContributed ?? 0}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                    <dt className="text-sm font-medium text-brand-secondary/80">
                      Beneficiários apoiados
                    </dt>
                    <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                      {impactStats.beneficiariesServed ?? 0}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {(organization.mission || organization.vision) && (
              <div className="rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Missão e visão
                </h2>
                {organization.mission && (
                  <div className="mb-4">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-neutral/70">
                      <Target className="h-4 w-4" />
                      Missão
                    </h3>
                    <p className="mt-2 text-gray-700 leading-relaxed">
                      {organization.mission}
                    </p>
                  </div>
                )}
                {organization.vision && (
                  <div>
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-neutral/70">
                      <Users className="h-4 w-4" />
                      Visão
                    </h3>
                    <p className="mt-2 text-gray-700 leading-relaxed">
                      {organization.vision}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {organization.history && (
          <section className="mt-8 rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              A nossa história
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {organization.history}
            </p>
          </section>
        )}

        {completedEvents.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900">
              Eventos concluídos
            </h2>
            <p className="mt-2 text-sm text-brand-neutral">
              Resultados e memórias das iniciativas já finalizadas.
            </p>
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-600">
                  {filteredCompletedEvents.length > 0
                    ? `A mostrar ${displayedCompletedEvents.length} de ${
                        filteredCompletedEvents.length
                      } relatos partilhados${
                        selectedCompletedYear !== "all"
                          ? " em " + selectedCompletedYear
                          : ""
                      }.`
                    : "Não foram encontrados eventos concluídos para o filtro selecionado."}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {completedEventYears.length > 0 && (
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                      Filtrar por ano
                      <select
                        id="public-completed-events-year"
                        value={selectedCompletedYear}
                        onChange={(event) =>
                          setSelectedCompletedYear(event.target.value)
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-secondary/30 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20"
                      >
                        <option value="all">Todos</option>
                        {completedEventYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {hasMoreCompletedEvents &&
                    filteredCompletedEvents.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllCompletedEvents((previous) => !previous)
                        }
                        className="inline-flex items-center justify-center rounded-2xl border border-brand-secondary/30 px-4 py-2 text-sm font-semibold text-brand-secondary transition hover:bg-brand-secondary/10"
                      >
                        {showAllCompletedEvents
                          ? "Ver menos"
                          : `Ver todos (${filteredCompletedEvents.length})`}
                      </button>
                    )}
                </div>
              </div>

              {filteredCompletedEvents.length > 0 ? (
                <>
                  <div className="grid gap-6 xl:grid-cols-2">
                    {displayedCompletedEvents.map((event) => {
                      const recapGallery = sanitizeGalleryUrls(
                        event.postEventGalleryUrls
                      );
                      const summary =
                        (event.postEventSummary ?? "").trim() ||
                        "Esta organização ainda não partilhou um resumo para este evento.";

                      return (
                        <article
                          key={event.id}
                          className="flex h-full flex-col rounded-3xl border border-brand-secondary/15 bg-white p-6 shadow-soft"
                        >
                          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-brand-neutral/70">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-gray-900">
                            {event.title}
                          </h3>
                          {event.location?.address && (
                            <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              {event.location.address}
                            </p>
                          )}
                          <p className="mt-4 text-sm text-gray-700 leading-relaxed">
                            {summary}
                          </p>
                          {recapGallery.length > 0 ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {recapGallery.map((url, index) => (
                                <a
                                  key={`${event.id}-recap-${index}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative block overflow-hidden rounded-2xl border border-brand-secondary/10 bg-white"
                                >
                                  <img
                                    src={url}
                                    alt={`Memória fotográfica do evento ${event.title}`}
                                    className="h-40 w-full object-cover transition duration-300 ease-out group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                  <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    Ver maior
                                  </span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-4 text-xs uppercase tracking-wide text-brand-neutral/60">
                              Sem fotografias disponíveis para este evento.
                            </p>
                          )}
                          <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                            <Users className="h-3 w-3" />
                            {event.volunteersRegistered} voluntário(s)
                            participaram
                          </div>
                          <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                              to={`/events/${event.id}`}
                              className="inline-flex items-center justify-center rounded-2xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                            >
                              Ver evento
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {hasMoreCompletedEvents && !showAllCompletedEvents && (
                    <button
                      type="button"
                      onClick={() => setShowAllCompletedEvents(true)}
                      className="w-full rounded-2xl border border-brand-secondary/30 bg-white px-4 py-2 text-sm font-semibold text-brand-secondary transition hover:bg-brand-secondary/10"
                    >
                      Ver mais eventos concluídos
                    </button>
                  )}
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-brand-secondary/30 bg-white p-6 text-sm text-gray-600">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {selectedCompletedYear === "all"
                        ? "Não foram encontrados eventos concluídos."
                        : `Não foram encontrados eventos concluídos em ${selectedCompletedYear}.`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCompletedYear("all")}
                      className="inline-flex items-center justify-center rounded-2xl border border-brand-secondary/30 px-4 py-2 text-sm font-semibold text-brand-secondary transition hover:bg-brand-secondary/10"
                    >
                      Limpar filtro
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {galleryItems.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900">
              Galeria da Organização
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map((url, index) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-2xl border border-brand-secondary/10 bg-white shadow-soft"
                >
                  <img
                    src={url}
                    alt={`Imagem da organização ${organization.name}`}
                    className="h-48 w-full object-cover transition duration-300 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-secondary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Ver maior
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Eventos disponíveis
            </h2>
            {activeEvents.length > 0 && (
              <span className="text-sm font-medium text-brand-secondary">
                {activeEvents.length} evento(s) ativo(s)
              </span>
            )}
          </div>

          {activeEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-secondary/20 bg-white px-6 py-10 text-center text-sm text-gray-600">
              Não existem eventos ativos no momento.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {activeEvents.map((event) => (
                <article
                  key={event.id}
                  className="flex h-full flex-col rounded-3xl border border-brand-secondary/15 bg-white p-6 shadow-soft transition hover:border-brand-secondary/30 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 text-sm text-brand-neutral">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  <p className="mt-2 line-clamp-4 text-sm text-gray-600">
                    {event.description}
                  </p>
                  {event.location?.address && (
                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {event.location.address}
                    </p>
                  )}

                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                    <Users className="h-3 w-3" />
                    {event.volunteersRegistered} / {event.volunteersNeeded}{" "}
                    voluntários
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {pastEvents.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Eventos anteriores
            </h2>
            <div className="rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
              <ul className="space-y-3 text-sm text-gray-600">
                {pastEvents.slice(0, 6).map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <span className="font-semibold text-gray-900">
                      {event.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-brand-neutral/70">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.date)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-brand-neutral/70">
                      <Users className="h-3 w-3" />
                      {event.volunteersRegistered} volunt.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
