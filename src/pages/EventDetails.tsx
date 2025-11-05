import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Building,
  ArrowLeft,
  Mail,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import MapPlaceholder from "../components/MapPlaceholder";
import { useAuth } from "../context/useAuth";
import { applyToEvent, checkExistingApplication } from "../lib/api";
import { fetchEventById } from "../lib/events";
import { formatDurationWithHours } from "../lib/formatters";
import { getEventEndDate } from "../lib/datetime";
import {
  getAttachmentConstraintsDescription,
  removeApplicationAttachment,
  uploadApplicationAttachment,
  validateApplicationAttachment,
} from "../lib/storage";
import type { Application, ApplicationStatus, Event } from "../types";
import AddToCalendarButton from "../components/AddToCalendarButton";

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] =
    useState<ApplicationStatus | null>(null);
  const [existingApplication, setExistingApplication] =
    useState<Application | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentConstraintsText = useMemo(
    () => getAttachmentConstraintsDescription(),
    []
  );

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
      if (!event || !user || user.type !== "volunteer") {
        setApplicationStatus(null);
        setExistingApplication(null);
        return;
      }
      try {
        const existing = await checkExistingApplication(event.id, user.id);
        if (existing) {
          setApplicationStatus(existing.status);
          setExistingApplication(existing);
        } else {
          setApplicationStatus(null);
          setExistingApplication(null);
        }
      } catch (error) {
        console.error("Erro ao verificar candidatura existente:", error);
      }
    };

    verifyApplication();
  }, [event, user]);

  const timingInfo = useMemo(() => {
    if (!event) {
      return {
        formattedDate: "Data por confirmar",
        formattedStartTime: null as string | null,
        formattedEndTime: null as string | null,
        timeRangeLabel: null as string | null,
      };
    }

    const startDate = new Date(event.date);
    if (Number.isNaN(startDate.getTime())) {
      return {
        formattedDate: "Data por confirmar",
        formattedStartTime: null,
        formattedEndTime: null,
        timeRangeLabel: null,
      };
    }

    const formattedDate = startDate.toLocaleDateString("pt-PT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedStartTime = startDate.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const endDate = getEventEndDate(startDate, event.duration);
    const formattedEndTime = endDate
      ? endDate.toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    const timeRangeLabel = formattedEndTime
      ? `Das ${formattedStartTime} às ${formattedEndTime}`
      : `Às ${formattedStartTime}`;

    return {
      formattedDate,
      formattedStartTime,
      formattedEndTime,
      timeRangeLabel,
    };
  }, [event]);

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

    if (event.status !== "open") {
      toast("Este evento não está a aceitar candidaturas.");
      return;
    }

    if (applicationStatus === "pending") {
      toast("A sua candidatura já está pendente de aprovação.");
      return;
    }

    if (applicationStatus === "approved") {
      toast.success("A sua participação já foi confirmada para este evento.");
      return;
    }

    if (applicationStatus === "rejected") {
      toast.error("A sua candidatura foi rejeitada para este evento.");
      return;
    }

    const normalizedMessage = message.trim();
    const hasTypedMessage = normalizedMessage.length > 0;
    const existingMessageAvailable = Boolean(
      existingApplication?.message && applicationStatus === "cancelled"
    );
    const hasAttachmentSelected = Boolean(attachmentFile);
    const existingAttachmentAvailable = Boolean(
      existingApplication?.attachmentPath && applicationStatus === "cancelled"
    );

    if (
      !hasTypedMessage &&
      !hasAttachmentSelected &&
      !existingMessageAvailable &&
      !existingAttachmentAvailable
    ) {
      toast.error(
        "Adicione um ficheiro (PDF, DOC, DOCX, JPG ou PNG) ou escreva uma mensagem para apoiar a candidatura."
      );
      return;
    }

    const previousAttachmentPath = existingApplication?.attachmentPath ?? null;
    let uploadedAttachmentPath: string | undefined;
    let attachmentName: string | null | undefined;
    let attachmentMimeType: string | null | undefined;
    let attachmentSizeBytes: number | null | undefined;

    try {
      setApplying(true);
      if (attachmentFile) {
        const validationResult = validateApplicationAttachment(attachmentFile);
        if (validationResult) {
          setAttachmentError(validationResult);
          toast.error(validationResult);
          setApplying(false);
          return;
        }

        const uploadResult = await uploadApplicationAttachment({
          eventId: event.id,
          volunteerId: user.id,
          file: attachmentFile,
        });

        uploadedAttachmentPath = uploadResult.storagePath;
        attachmentName = attachmentFile.name;
        attachmentMimeType = attachmentFile.type || null;
        attachmentSizeBytes = attachmentFile.size;
      }

      const application = await applyToEvent({
        eventId: event.id,
        volunteerId: user.id,
        message: hasTypedMessage ? normalizedMessage : undefined,
        ...(uploadedAttachmentPath !== undefined
          ? {
              attachmentPath: uploadedAttachmentPath,
              attachmentName,
              attachmentMimeType,
              attachmentSizeBytes,
            }
          : {}),
      });
      setApplicationStatus(application.status as ApplicationStatus);
      setMessage("");
      setAttachmentFile(null);
      setAttachmentError(null);
      setExistingApplication(application);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      toast.success(
        "Candidatura enviada! Aguardando aprovação da organização."
      );

      if (
        uploadedAttachmentPath &&
        previousAttachmentPath &&
        uploadedAttachmentPath !== previousAttachmentPath
      ) {
        void removeApplicationAttachment(previousAttachmentPath);
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

      if (
        uploadedAttachmentPath &&
        uploadedAttachmentPath !== previousAttachmentPath
      ) {
        void removeApplicationAttachment(uploadedAttachmentPath);
      }
    } finally {
      setApplying(false);
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setAttachmentFile(null);
      setAttachmentError(null);
      return;
    }

    const validationResult = validateApplicationAttachment(file);
    if (validationResult) {
      setAttachmentFile(null);
      setAttachmentError(validationResult);
      toast.error(validationResult);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      return;
    }

    setAttachmentFile(file);
    setAttachmentError(null);
  };

  const handleAttachmentClear = () => {
    setAttachmentFile(null);
    setAttachmentError(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const applicationState = useMemo(() => {
    if (!event) {
      return {
        hidden: true,
        disabled: true,
        label: "",
        tooltip: undefined as string | undefined,
        className: "",
      };
    }

    if (event.status !== "open") {
      return {
        hidden: false,
        disabled: true,
        label:
          event.status === "completed"
            ? "Evento concluído"
            : "Candidaturas encerradas",
        tooltip: "As candidaturas não estão abertas para este evento.",
        className:
          "flex-1 rounded-lg bg-gray-200 px-8 py-4 text-lg font-semibold text-gray-600 cursor-not-allowed",
      };
    }

    if (applicationStatus === "approved") {
      return {
        hidden: true,
        disabled: true,
        label: "",
        tooltip: undefined,
        className: "",
      };
    }

    if (applicationStatus === "pending") {
      return {
        hidden: false,
        disabled: true,
        label: "Candidatura pendente",
        tooltip: "A candidatura está a aguardar resposta da organização.",
        className:
          "flex-1 rounded-lg bg-amber-500 px-8 py-4 text-lg font-semibold text-white cursor-not-allowed",
      };
    }

    if (applicationStatus === "rejected") {
      return {
        hidden: false,
        disabled: true,
        label: "Candidatura rejeitada",
        tooltip: "Esta candidatura foi rejeitada pela organização.",
        className:
          "flex-1 rounded-lg bg-rose-600 px-8 py-4 text-lg font-semibold text-white cursor-not-allowed",
      };
    }

    const awaitingReapply = applicationStatus === "cancelled";

    return {
      hidden: false,
      disabled: applying,
      label: applying
        ? "A candidatar..."
        : awaitingReapply
        ? "Candidatar novamente"
        : "Candidatar a Este Evento",
      tooltip: undefined,
      className:
        "flex-1 rounded-lg bg-emerald-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
    };
  }, [event, applicationStatus, applying]);

  const showRejectionNotice = applicationStatus === "rejected";
  const showParticipationBadge = applicationStatus === "approved";

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
                  <p className="text-sm text-gray-500">Data e horário</p>
                  <p className="font-semibold">{timingInfo.formattedDate}</p>
                  <p className="text-sm text-gray-500">
                    {timingInfo.timeRangeLabel ?? "Horário por confirmar"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-gray-700">
                <Clock className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-500">Duração</p>
                  <p className="font-semibold">
                    {formatDurationWithHours(event.duration) || "—"}
                  </p>
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

            <div className="space-y-6">
              <div className="space-y-3">
                <label
                  htmlFor="application-attachment"
                  className="text-sm font-medium text-gray-700"
                >
                  Currículo ou ficheiro de apoio (opcional)
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    ref={attachmentInputRef}
                    id="application-attachment"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleAttachmentChange}
                    disabled={applying}
                    className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed"
                  />
                  {attachmentFile && (
                    <button
                      type="button"
                      onClick={handleAttachmentClear}
                      className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Remover ficheiro
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {attachmentConstraintsText}. Recomendamos anexar um CV ou
                  breve apresentação para aumentar as hipóteses de aprovação.
                </p>
                {attachmentFile && (
                  <p className="text-sm text-gray-600">
                    Ficheiro selecionado: <strong>{attachmentFile.name}</strong>
                  </p>
                )}
                {!attachmentFile &&
                  existingApplication?.attachmentName &&
                  applicationStatus === "cancelled" && (
                    <p className="text-sm text-emerald-600">
                      Ficheiro anterior guardado:{" "}
                      <strong>{existingApplication.attachmentName}</strong>
                    </p>
                  )}
                {attachmentError && (
                  <p className="text-sm text-rose-600">{attachmentError}</p>
                )}
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="message"
                  className="text-sm font-medium text-gray-700"
                >
                  Mensagem para a organização (opcional)
                </label>
                <p className="text-sm text-gray-500">
                  Obrigatória apenas se não anexar ficheiro.
                </p>
                <textarea
                  id="message"
                  value={message}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setMessage(event.target.value)
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Partilhe a sua motivação, experiência relevante ou outras informações úteis."
                />
              </div>
            </div>

            <div className="space-y-4">
              {showRejectionNotice && (
                <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Candidatura rejeitada</p>
                    <p className="mt-1">
                      Já submeteu uma candidatura que foi rejeitada. Explore
                      outros eventos ou contacte a organização para mais
                      detalhes.
                    </p>
                  </div>
                </div>
              )}

              {showParticipationBadge && (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Participação confirmada</p>
                    <p className="mt-1">
                      A sua presença foi confirmada pela organização. Consulte o
                      email para mais informações.
                    </p>
                  </div>
                </div>
              )}

              <MapPlaceholder
                address={event.location.address}
                lat={event.location.lat ?? undefined}
                lng={event.location.lng ?? undefined}
              />

              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {!applicationState.hidden && (
                  <button
                    onClick={handleApply}
                    disabled={applicationState.disabled}
                    title={applicationState.tooltip}
                    className={applicationState.className}
                    type="button"
                  >
                    {applicationState.label}
                  </button>
                )}
                <AddToCalendarButton
                  event={event}
                  variant="ghost"
                  label="Adicionar ao calendário"
                  className={applicationState.hidden ? "md:flex-1" : ""}
                />
                <button
                  type="button"
                  onClick={() =>
                    navigator.share?.({
                      title: event.title,
                      text: event.description,
                      url: window.location.href,
                    })
                  }
                  className={`px-8 py-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-lg ${
                    applicationState.hidden ? "md:flex-1" : ""
                  }`}
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
