import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Hourglass,
  Loader2,
  MapPin,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cancelApplication, fetchApplicationsByVolunteer } from "../lib/api";
import { useAuth } from "../context/useAuth";
import { getApplicationAttachmentSignedUrl } from "../lib/storage";
import type { Application } from "../types";
import AddToCalendarButton from "../components/AddToCalendarButton";

type StatusKey = Application["status"];

const statusConfig: Record<
  StatusKey,
  { label: string; description: string; color: string; icon: LucideIcon }
> = {
  pending: {
    label: "Pendente",
    description: "A organização ainda está a analisar a sua candidatura.",
    color: "bg-amber-100 text-amber-800",
    icon: Hourglass,
  },
  approved: {
    label: "Aprovada",
    description: "Parabéns! Foi selecionado(a) para este evento.",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejeitada",
    description: "A sua candidatura não foi selecionada desta vez.",
    color: "bg-rose-100 text-rose-800",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelada",
    description: "Cancelou a sua participação neste evento.",
    color: "bg-slate-200 text-slate-700",
    icon: X,
  },
};

const formatDate = (iso?: string | null) => {
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

export default function MyApplications() {
  const { user, loading: authInitialising } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        setApplications([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await fetchApplicationsByVolunteer(user.id);
        if (active) {
          setApplications(data);
        }
      } catch (error) {
        console.error("Erro ao carregar candidaturas:", error);
        if (active) {
          toast.error(
            "Não foi possível carregar as candidaturas. Tente novamente mais tarde."
          );
        }
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
  }, [user]);

  const sortedApplications = useMemo(
    () =>
      [...applications].sort(
        (a, b) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      ),
    [applications]
  );

  const handleCancel = async (applicationId: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      "Tem a certeza que pretende cancelar esta candidatura?"
    );
    if (!confirmed) return;

    try {
      setCancellingId(applicationId);
      const updated = await cancelApplication(applicationId, user.id);
      setApplications((prevApplications: Application[]) =>
        prevApplications.map((currentApplication: Application) =>
          currentApplication.id === updated.id
            ? { ...currentApplication, ...updated }
            : currentApplication
        )
      );
      toast.success("Candidatura cancelada com sucesso.");
    } catch (error) {
      console.error("Erro ao cancelar candidatura:", error);
      toast.error("Não foi possível cancelar a candidatura.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadAttachment = async (application: Application) => {
    if (!application.attachmentPath) return;

    try {
      setDownloadingAttachmentId(application.id);
      const signedUrl = await getApplicationAttachmentSignedUrl(
        application.attachmentPath
      );

      if (!signedUrl) {
        toast.error("Não foi possível gerar o link do ficheiro.");
        return;
      }

      window.open(signedUrl, "_blank", "noopener");
    } catch (error) {
      console.error("Erro ao descarregar ficheiro:", error);
      toast.error("Não foi possível descarregar o ficheiro.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const showGlobalLoader =
    authInitialising || (loading && applications.length === 0);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 text-left">
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Minhas candidaturas
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Acompanhe aqui o estado das suas candidaturas a eventos de
            voluntariado e mantenha-se atento(a) às atualizações das
            organizações.
          </p>
        </header>

        {showGlobalLoader && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            <span className="ml-3 text-sm font-medium text-slate-500">
              A carregar candidaturas...
            </span>
          </div>
        )}

        {!showGlobalLoader && (!user || sortedApplications.length === 0) && (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800">
              Ainda não tem candidaturas ativas
            </h2>
            <p className="mt-2 text-slate-600">
              Explore os eventos disponíveis e candidate-se para começar a
              ajudar.
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ver eventos disponíveis
            </Link>
          </div>
        )}

        {!showGlobalLoader && user && sortedApplications.length > 0 && (
          <div className="space-y-6">
            {sortedApplications.map((application) => {
              const status = statusConfig[application.status];
              const StatusIcon = status.icon;
              const event = application.event;

              return (
                <article
                  key={application.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${status.color}`}
                        >
                          <StatusIcon className="h-4 w-4" />
                          {status.label}
                        </span>
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold text-slate-900">
                        {event?.title ?? "Evento de voluntariado"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {event?.organization?.name ??
                          "Organização desconhecida"}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 text-sm text-slate-500 md:items-end">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{formatDate(event?.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>
                          Candidatou-se em {formatDate(application.appliedAt)}
                        </span>
                      </div>
                      {event?.location?.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{event.location.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Resumo do evento
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>
                            {event?.volunteersRegistered ?? 0} de{" "}
                            {event?.volunteersNeeded ?? "—"} voluntários
                            confirmados
                          </span>
                        </li>
                        {event?.category && (
                          <li className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                            <span>{event.category}</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Estado da candidatura
                      </p>
                      <p className="mt-3 text-sm text-slate-600">
                        {status.description}
                      </p>

                      {application.message && (
                        <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
                          "{application.message}"
                        </p>
                      )}

                      {application.attachmentPath && (
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(application)}
                          disabled={downloadingAttachmentId === application.id}
                          className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                          {downloadingAttachmentId === application.id
                            ? "A preparar ficheiro..."
                            : application.attachmentName
                            ? `Visualizar ${application.attachmentName}`
                            : "Visualizar ficheiro"}
                        </button>
                      )}

                      {application.status === "approved" && (
                        <div className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          <p>
                            Será contactado(a) pela organização com mais
                            detalhes brevemente. Exporta o evento para o teu
                            calendário para não esqueceres.
                          </p>
                          {application.event && (
                            <div className="mt-3">
                              <AddToCalendarButton
                                event={application.event}
                                size="sm"
                                variant="ghost"
                                label="Adicionar ao calendário"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {application.status === "pending" && (
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-slate-600">
                            Pode cancelar a candidatura enquanto estiver
                            pendente.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleCancel(application.id)}
                            disabled={cancellingId === application.id}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <X className="h-4 w-4" />
                            {cancellingId === application.id
                              ? "A cancelar..."
                              : "Cancelar candidatura"}
                          </button>
                        </div>
                      )}
                      {application.status === "cancelled" && (
                        <p className="mt-3 rounded-lg bg-slate-200/70 px-4 py-3 text-sm text-slate-700">
                          Cancelou esta candidatura. Se o evento ainda estiver
                          disponível, pode candidatar-se novamente a partir da
                          página do evento.
                        </p>
                      )}
                    </div>
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
