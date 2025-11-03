import { useEffect, useMemo, useState, useId } from "react";
import { Link } from "react-router-dom";
import { Building2, Calendar, Filter, MapPin, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchOrganizationsDirectory } from "../lib/api";
import type { OrganizationDirectoryEntry } from "../types";

type FilterOption = {
  label: string;
  value: string;
};

const ALL_OPTION: FilterOption = { label: "Todas", value: "all" };

export default function Organizations() {
  const [organizations, setOrganizations] = useState<
    OrganizationDirectoryEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(ALL_OPTION.value);
  const [cityFilter, setCityFilter] = useState(ALL_OPTION.value);
  const categoryFilterId = useId();
  const cityFilterId = useId();

  useEffect(() => {
    let active = true;

    const loadOrganizations = async () => {
      try {
        const data = await fetchOrganizationsDirectory();
        if (active) {
          setOrganizations(data);
        }
      } catch (error: unknown) {
        console.error("Erro ao carregar organizações", error);
        toast.error("Não foi possível carregar as organizações.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOrganizations();

    return () => {
      active = false;
    };
  }, []);

  const refreshOrganizations = async () => {
    setRefreshing(true);
    try {
      const data = await fetchOrganizationsDirectory();
      setOrganizations(data);
      toast.success("Lista atualizada");
    } catch (error: unknown) {
      console.error("Erro ao atualizar organizações", error);
      toast.error("Não foi possível atualizar a lista.");
    } finally {
      setRefreshing(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const categories = new Map<string, string>();

    organizations.forEach((entry) => {
      entry.activeEvents.forEach((event) => {
        const category = event.category?.trim();
        if (category && !categories.has(category.toLowerCase())) {
          categories.set(category.toLowerCase(), category);
        }
      });
    });

    const options = Array.from(categories.values()).sort((first, second) =>
      first.localeCompare(second, "pt", { sensitivity: "base" })
    );

    return [
      ALL_OPTION,
      ...options.map((category) => ({
        label: category,
        value: category,
      })),
    ];
  }, [organizations]);

  const cityOptions = useMemo(() => {
    const cities = new Map<string, string>();

    organizations.forEach(({ organization }) => {
      const city = organization.city?.trim();
      if (city && !cities.has(city.toLowerCase())) {
        cities.set(city.toLowerCase(), city);
      }
    });

    const options = Array.from(cities.values()).sort((first, second) =>
      first.localeCompare(second, "pt", { sensitivity: "base" })
    );

    return [
      ALL_OPTION,
      ...options.map((city) => ({
        label: city,
        value: city,
      })),
    ];
  }, [organizations]);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter(({ organization, activeEvents }) => {
      const matchesCategory =
        categoryFilter === ALL_OPTION.value ||
        activeEvents.some(
          (event) =>
            event.category?.trim().toLowerCase() ===
            categoryFilter.trim().toLowerCase()
        );

      const normalizedCity = organization.city?.trim().toLowerCase();
      const matchesCity =
        cityFilter === ALL_OPTION.value ||
        (normalizedCity !== undefined &&
          normalizedCity.length > 0 &&
          normalizedCity === cityFilter.trim().toLowerCase());

      return matchesCategory && matchesCity;
    });
  }, [organizations, categoryFilter, cityFilter]);

  const shouldShowReset =
    categoryFilter !== ALL_OPTION.value || cityFilter !== ALL_OPTION.value;

  const formatEventCountLabel = (count: number) => {
    if (count === 0) {
      return "Sem eventos ativos";
    }
    if (count === 1) {
      return "1 evento ativo";
    }
    return `${count} eventos ativos`;
  };

  const truncate = (value: string | null | undefined, length = 160) => {
    if (!value) {
      return "";
    }
    if (value.length <= length) {
      return value;
    }
    return `${value.slice(0, length).trimEnd()}…`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Organizações Parceiras
              </h1>
              <p className="text-gray-600">
                Explore as organizações disponíveis e descubra oportunidades de
                voluntariado ativas.
              </p>
            </div>
          </div>
          <p className="text-sm text-brand-neutral">
            Utilize os filtros abaixo para encontrar organizações por área de
            atuação e localização.
          </p>
        </div>

        <div className="bg-white border border-brand-secondary/20 rounded-2xl shadow-soft p-6 mb-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label
              htmlFor={categoryFilterId}
              className="flex items-center gap-3 border border-brand-secondary/20 rounded-2xl px-4 py-3"
            >
              <Filter className="h-5 w-5 text-brand-secondary" />
              <select
                id={categoryFilterId}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-gray-800 focus:outline-none"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === ALL_OPTION.value
                      ? "Todas as categorias"
                      : option.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              htmlFor={cityFilterId}
              className="flex items-center gap-3 border border-brand-secondary/20 rounded-2xl px-4 py-3"
            >
              <MapPin className="h-5 w-5 text-brand-secondary" />
              <select
                id={cityFilterId}
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-gray-800 focus:outline-none"
              >
                {cityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === ALL_OPTION.value
                      ? "Todas as cidades"
                      : option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={refreshOrganizations}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 rounded-2xl border border-brand-secondary bg-brand-background px-4 py-3 text-sm font-semibold text-brand-secondary transition hover:border-brand-secondary/60 hover:text-brand-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "A atualizar…" : "Atualizar lista"}
            </button>

            {shouldShowReset && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter(ALL_OPTION.value);
                  setCityFilter(ALL_OPTION.value);
                }}
                className="rounded-2xl border border-brand-secondary/20 px-4 py-3 text-sm font-semibold text-brand-secondary transition hover:border-brand-secondary/40 hover:text-brand-secondary/80"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">
            A carregar organizações…
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Nenhuma organização encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredOrganizations.map(({ organization, activeEvents }) => {
              const initials = organization.name
                .split(" ")
                .slice(0, 2)
                .map((word) => word.charAt(0).toUpperCase())
                .join("");
              const city = organization.city?.trim();
              const address = organization.location?.trim();

              return (
                <article
                  key={organization.id}
                  className="flex flex-col rounded-2xl border border-brand-secondary/15 bg-white p-6 shadow-soft transition hover:border-brand-secondary/30 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    {organization.avatarUrl ? (
                      <img
                        src={organization.avatarUrl}
                        alt={`Logo da organização ${organization.name}`}
                        className="h-16 w-16 rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-secondary/10 text-lg font-semibold text-brand-secondary">
                        {initials}
                      </div>
                    )}

                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        <Link
                          to={`/organizacoes/${organization.id}`}
                          className="transition hover:text-brand-secondary"
                        >
                          {organization.name}
                        </Link>
                      </h2>
                      <div className="mt-1 flex flex-col gap-1 text-sm text-gray-600">
                        {(city || address) && (
                          <p className="flex items-center gap-1 font-medium">
                            <MapPin className="h-4 w-4" />
                            {city ?? address}
                          </p>
                        )}
                        {city && address && (
                          <p className="text-xs text-gray-500">{address}</p>
                        )}
                        {!city && !address && (
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-4 w-4" />
                            Localização não definida
                          </p>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-neutral">
                        {formatEventCountLabel(activeEvents.length)}
                      </p>
                    </div>
                  </div>

                  {organization.bio && (
                    <p className="mt-4 text-sm leading-relaxed text-gray-600">
                      {truncate(organization.bio)}
                    </p>
                  )}

                  <div className="mt-5">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-neutral">
                      Eventos ativos
                    </h3>
                    {activeEvents.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {activeEvents.slice(0, 3).map((event) => (
                          <li key={event.id}>
                            <Link
                              to={`/events/${event.id}`}
                              className="flex items-center gap-2 rounded-xl border border-brand-secondary/10 px-3 py-2 text-sm font-medium text-brand-secondary transition hover:border-brand-secondary/40 hover:bg-brand-secondary/5"
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="truncate">{event.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Sem eventos ativos no momento.
                      </p>
                    )}

                    {activeEvents.length > 3 && (
                      <p className="mt-3 text-xs text-gray-500">
                        Mais {activeEvents.length - 3} eventos ativos
                        disponíveis.
                      </p>
                    )}
                  </div>

                  <div className="mt-6">
                    <Link
                      to={`/organizacoes/${organization.id}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-brand-secondary/20 px-4 py-2 text-sm font-semibold text-brand-secondary transition hover:border-brand-secondary/40 hover:text-brand-secondary/80"
                    >
                      Ver perfil completo
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
