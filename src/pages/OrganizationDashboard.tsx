import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Loader2,
  MapPin,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import {
  fetchOrganizationDashboard,
  updateApplicationStatus,
} from "../lib/api";
import type {
  ApplicationStats,
  Event,
  OrganizationDashboardSummary,
  VolunteerApplication,
} from "../types";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "Data por confirmar";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data por confirmar";
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "Data por confirmar";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data por confirmar";
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
  bgClass: string;
  iconClass: string;
  valueClass: string;
};

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OrganizationDashboardSummary | null>(
    null
  );
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pendingApplications, setPendingApplications] = useState<
    VolunteerApplication[]
  >([]);
  const [applicationStats, setApplicationStats] =
    useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<
    string | null
  >(null);

  const statCards: StatCard[] = useMemo(
    () => [
      {
        label: "Eventos Ativos",
        value: summary?.openEvents ?? 0,
        icon: Calendar,
        bgClass: "bg-emerald-100",
        iconClass: "text-emerald-600",
        valueClass: "text-emerald-600",
      },
      {
        label: "Total de Eventos",
        value: summary?.totalEvents ?? 0,
        icon: TrendingUp,
        bgClass: "bg-teal-100",
        iconClass: "text-teal-600",
        valueClass: "text-teal-600",
      },
      {
        label: "Candidaturas Pendentes",
        value: summary?.pendingApplications ?? 0,
        icon: Clock,
        bgClass: "bg-amber-100",
        iconClass: "text-amber-600",
        valueClass: "text-amber-600",
      },
      {
        label: "Voluntários Aprovados",
        value: summary?.approvedVolunteers ?? 0,
        icon: Users,
        bgClass: "bg-cyan-100",
        iconClass: "text-cyan-600",
        valueClass: "text-cyan-600",
      },
    ],
    [summary]
  );

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setSummary(null);
      setUpcomingEvents([]);
      setPendingApplications([]);
      setApplicationStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const {
        summary: summaryData,
        upcomingEvents: upcoming,
        pendingApplications: pending,
        applicationStats: stats,
      } = await fetchOrganizationDashboard(user.id);

      setSummary(summaryData);
      setUpcomingEvents(upcoming);
      setPendingApplications(pending);
      setApplicationStats(stats);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error(
        "Não foi possível carregar os dados da organização. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleUpdateApplication = async (
    applicationId: string,
    status: "approved" | "rejected"
  ) => {
    if (!user) return;

    try {
      setUpdatingApplicationId(applicationId);
      const { notificationStatus, notificationError } =
        await updateApplicationStatus(applicationId, user.id, status);
      toast.success(
        status === "approved"
          ? "Candidatura aprovada com sucesso."
          : "Candidatura rejeitada."
      );

      if (status === "approved") {
        if (notificationStatus === "sent") {
          toast.success("Email de confirmação enviado ao voluntário.");
        } else if (notificationStatus === "failed") {
          toast.error(
            notificationError ??
              "A candidatura foi aprovada, mas o email não pôde ser enviado."
          );
        } else if (notificationStatus === "skipped" && notificationError) {
          toast(notificationError, { icon: "ℹ️" });
        }
      }
      await loadDashboard();
    } catch (error) {
      console.error("Erro ao atualizar candidatura:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a candidatura.";
      toast.error(message);
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard da Organização
          </h1>
          <p className="text-gray-600">
            Visão geral das suas atividades e eventos
          </p>
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-sm font-medium text-gray-500">
              A carregar dados...
            </span>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-white rounded-lg shadow-md p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${stat.bgClass}`}>
                        <Icon className={`h-6 w-6 ${stat.iconClass}`} />
                      </div>
                    </div>
                    <div
                      className={`text-3xl font-bold ${stat.valueClass} mb-1`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-gray-600 text-sm">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Candidaturas Pendentes
                  </h2>
                  {applicationStats && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                      {applicationStats.pending} pendentes
                    </span>
                  )}
                </div>

                {pendingApplications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-600">
                      Sem candidaturas pendentes no momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications.map((application) => (
                      <div
                        key={application.id}
                        className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {application.volunteer?.name ?? "Voluntário"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {application.event?.title ?? "Evento"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span>
                              Candidatou-se em{" "}
                              {formatDateTime(application.appliedAt)}
                            </span>
                            {application.volunteer?.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {application.volunteer.email}
                              </span>
                            )}
                          </div>
                          {application.message && (
                            <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
                              "{application.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateApplication(
                                application.id,
                                "approved"
                              )
                            }
                            disabled={updatingApplicationId === application.id}
                            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingApplicationId === application.id
                              ? "A aprovar..."
                              : "Aprovar"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateApplication(
                                application.id,
                                "rejected"
                              )
                            }
                            disabled={updatingApplicationId === application.id}
                            className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingApplicationId === application.id
                              ? "A rejeitar..."
                              : "Rejeitar"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Próximos Eventos
                </h2>
                {upcomingEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-600">
                      Ainda não tem eventos futuros agendados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition"
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {event.title}
                        </h3>
                        <div className="mb-2 flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="mb-2 flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          <span>
                            {event.volunteersRegistered} /{" "}
                            {event.volunteersNeeded} voluntários
                          </span>
                        </div>
                        {event.location?.address && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{event.location.address}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
