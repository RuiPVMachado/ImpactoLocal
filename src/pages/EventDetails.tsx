import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Building,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { toast } from "react-hot-toast";
import MapPlaceholder from "../components/MapPlaceholder";
import { useAuth } from "../context/useAuth";
import {
  applyToEvent,
  checkExistingApplication,
  fetchEventById,
} from "../lib/api";
import { sendNotification } from "../lib/notifications";
import type { Event } from "../types";

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadEvent = async () => {
      if (!id) return;
      try {
        const data = await fetchEventById(id);
        if (!data) {
          toast.error("Evento não encontrado.");
          navigate("/events");
          return;
        }
        if (mounted) {
          setEvent(data);
        }
      } catch (error: unknown) {
        console.error("Erro ao carregar evento:", error);
        toast.error("Não foi possível carregar o evento.");
        navigate("/events");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    const verifyApplication = async () => {
      if (!event || !user || user.type !== "volunteer") return;
      try {
        const existing = await checkExistingApplication(event.id, user.id);
        if (existing) {
          setHasApplied(true);
        }
      } catch (error) {
        console.error("Erro ao verificar candidatura existente:", error);
      }
    };

    verifyApplication();
  }, [event, user]);

  const handleApply = async () => {
    if (!event) return;

    if (!isAuthenticated || !user) {
      toast.error("Inicie sessão como voluntário para se candidatar.");
      navigate("/login");
      return;
    }

    if (user.type !== "volunteer") {
      toast.error("Apenas voluntários podem candidatar-se a eventos.");
      return;
    }

    if (hasApplied) {
      toast("Já tem uma candidatura pendente para este evento.");
      return;
    }

    try {
      setApplying(true);
      await applyToEvent({
        eventId: event.id,
        volunteerId: user.id,
        message: message.trim() ? message.trim() : undefined,
      });
      setHasApplied(true);
      toast.success(
        "Candidatura enviada! Aguardando aprovação da organização."
      );

      if (event.organization?.email) {
        await sendNotification({
          type: "application_submitted",
          title: `Nova candidatura: ${event.title}`,
          message: `${user.name} submeteu uma candidatura ao evento ${event.title}.`,
          recipients: [event.organization.email],
          metadata: {
            eventId: event.id,
            volunteerId: user.id,
          },
        });
      }
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const supabaseError = error as { code?: string; message?: string };
        if (supabaseError.code === "23505") {
          toast.error("Já existe uma candidatura para este evento.");
          return;
        }
      }

      if (error instanceof Error) {
        console.error("Erro ao enviar candidatura:", error);
        toast.error(error.message ?? "Não foi possível enviar a candidatura.");
      } else {
        console.error("Erro ao enviar candidatura:", error);
        toast.error("Não foi possível enviar a candidatura.");
      }
    } finally {
      setApplying(false);
    }
  };

  const applicationDisabled = useMemo(() => {
    if (!event) return true;
    if (event.status !== "open") return true;
    return hasApplied;
  }, [event, hasApplied]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        A carregar evento...
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Voltar</span>
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-64 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Calendar className="h-24 w-24 text-white" />
          </div>

          <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-sm px-4 py-2 rounded-full font-semibold w-max">
                {event.category}
              </span>
              <span
                className={`inline-flex items-center text-sm px-4 py-2 rounded-full font-semibold w-max ${
                  event.status === "open"
                    ? "bg-green-100 text-green-800"
                    : event.status === "closed"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {event.status === "open"
                  ? "Aberto"
                  : event.status === "closed"
                  ? "Fechado"
                  : "Concluído"}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">
                {event.title}
              </h1>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3 text-gray-700">
                <Building className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-500">Organização</p>
                  <p className="font-semibold">
                    {event.organization?.name ?? "Organização"}
                  </p>
                  {event.organization?.email && (
                    <div className="flex items-center text-sm text-gray-500 space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>{event.organization.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-700">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-semibold">
                    {new Date(event.date).toLocaleDateString("pt-PT", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-700">
                <Clock className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-500">Duração</p>
                  <p className="font-semibold">{event.duration}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-700">
                <Users className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-500">
                    Voluntários necessários
                  </p>
                  <p className="font-semibold">
                    {event.volunteersRegistered} / {event.volunteersNeeded}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-gray-700 md:col-span-2">
                <MapPin className="h-5 w-5 text-emerald-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Localização</p>
                  <p className="font-semibold">{event.location.address}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="message"
                className="text-sm font-medium text-gray-700"
              >
                Mensagem para a organização (opcional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setMessage(event.target.value)
                }
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Partilhe a sua motivação ou experiência relevante."
              />
            </div>

            <div className="space-y-4">
              <MapPlaceholder
                address={event.location.address}
                lat={event.location.lat ?? undefined}
                lng={event.location.lng ?? undefined}
              />

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={handleApply}
                  disabled={applicationDisabled || applying}
                  className="flex-1 bg-emerald-600 text-white px-8 py-4 rounded-lg hover:bg-emerald-700 transition font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {hasApplied
                    ? "Candidatura enviada"
                    : applying
                    ? "A candidatar..."
                    : "Candidatar a Este Evento"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigator.share?.({
                      title: event.title,
                      text: event.description,
                      url: window.location.href,
                    })
                  }
                  className="px-8 py-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-lg"
                >
                  Partilhar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
