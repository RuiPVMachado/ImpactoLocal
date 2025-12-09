import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchVolunteerStatistics } from "../lib/api";
import { fetchProfileById } from "../lib/profiles";
import type { Profile, VolunteerStatistics } from "../types";

/**
 * VolunteerProfilePublic page component.
 *
 * Displays the public profile of a volunteer.
 * Shows volunteer statistics and basic information.
 *
 * @returns {JSX.Element} The rendered VolunteerProfilePublic page.
 */
export default function VolunteerProfilePublic() {
  const { volunteerId } = useParams<{ volunteerId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<VolunteerStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!volunteerId) {
        setErrorMessage("Voluntário não encontrado.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const result = await fetchProfileById(volunteerId);
        if (!active) {
          return;
        }

        if (!result || result.type !== "volunteer") {
          setErrorMessage("Voluntário não encontrado.");
          return;
        }

        setProfile(result);
      } catch (error) {
        console.error("Erro ao carregar perfil do voluntário", error);
        if (!active) {
          return;
        }
        setErrorMessage("Não foi possível carregar o perfil do voluntário.");
        toast.error("Não foi possível carregar o perfil do voluntário.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [volunteerId]);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      if (!profile || profile.type !== "volunteer") {
        setStats(null);
        return;
      }

      setStatsLoading(true);

      try {
        const result = await fetchVolunteerStatistics(profile.id);
        if (active) {
          setStats(result);
        }
      } catch (error) {
        console.warn("Falha ao carregar estatísticas do voluntário", error);
        if (active) {
          setStats(null);
        }
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      active = false;
    };
  }, [profile]);

  const participationPercentage = useMemo(() => {
    if (!stats) {
      return "0%";
    }
    return `${Math.round((stats.participationRate ?? 0) * 100)}%`;
  }, [stats]);

  const initials = useMemo(() => {
    if (!profile) {
      return "";
    }
    return profile.name
      .split(" ")
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-secondary" />
          <p className="text-gray-600 font-medium">
            A carregar perfil do voluntário...
          </p>
        </div>
      </div>
    );
  }

  if (!profile || errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
            <User className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Perfil indisponível
          </h1>
          <p className="text-gray-600 mb-6">
            {errorMessage ??
              "Não foi possível encontrar o voluntário que procura."}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/20 px-4 py-2 text-sm font-semibold text-brand-secondary transition hover:border-brand-secondary/40 hover:text-brand-secondary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-secondary transition hover:text-brand-secondary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        <header className="rounded-3xl bg-white shadow-soft p-6 md:p-10 border border-brand-secondary/15">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`Fotografia do voluntário ${profile.name}`}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-secondary/10 text-3xl font-semibold text-brand-secondary">
                {initials || profile.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.name}
              </h1>
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-brand-neutral/70">
                Voluntário ImpactoLocal
              </p>

              <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600">
                {profile.email && (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </span>
                )}
                {profile.phone && (
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </span>
                )}
                {profile.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                )}
              </div>

              {profile.bio && (
                <p className="mt-6 text-gray-700 leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Estatísticas do voluntário
          </h2>
          {statsLoading ? (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />A carregar
              estatísticas...
            </div>
          ) : stats ? (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                <dt className="text-sm font-medium text-brand-secondary/80">
                  Eventos concluídos
                </dt>
                <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                  {stats.eventsCompleted}
                </dd>
              </div>
              <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                <dt className="text-sm font-medium text-brand-secondary/80">
                  Eventos frequentados
                </dt>
                <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                  {stats.eventsAttended}
                </dd>
              </div>
              <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                <dt className="text-sm font-medium text-brand-secondary/80">
                  Horas estimadas
                </dt>
                <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                  {stats.totalVolunteerHours}
                </dd>
              </div>
              <div className="rounded-2xl bg-brand-secondary/5 px-4 py-5">
                <dt className="text-sm font-medium text-brand-secondary/80">
                  Participação
                </dt>
                <dd className="mt-2 text-2xl font-bold text-brand-secondary">
                  {participationPercentage}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-600">
              Ainda não existem dados suficientes para apresentar estatísticas.
            </p>
          )}
        </section>

        {(profile.mission || profile.vision || profile.history) && (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            {profile.mission && (
              <div className="rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-neutral/70">
                  <Users className="h-4 w-4" />
                  Motivação
                </h2>
                <p className="mt-3 text-gray-700 leading-relaxed">
                  {profile.mission}
                </p>
              </div>
            )}

            {profile.vision && (
              <div className="rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-neutral/70">
                  <Award className="h-4 w-4" />
                  Objetivos
                </h2>
                <p className="mt-3 text-gray-700 leading-relaxed">
                  {profile.vision}
                </p>
              </div>
            )}

            {profile.history && (
              <div className="rounded-3xl border border-brand-secondary/10 bg-white p-6 shadow-soft lg:col-span-2">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-neutral/70">
                  <Users className="h-4 w-4" />
                  Experiência
                </h2>
                <p className="mt-3 text-gray-700 leading-relaxed">
                  {profile.history}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
