import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  FileText,
  Tag,
  AlertTriangle,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { fetchEventById, updateEvent } from "../lib/events";
import type { Event } from "../types";
import {
  getNowLocalDateTimeInputValue,
  MIN_EVENT_START_LEEWAY_MS,
  formatDurationFromParts,
  normalizeDurationParts,
  splitDurationToParts,
} from "../lib/datetime";
import {
  getImageConstraintsDescription,
  removeStorageFileByUrl,
  uploadEventRecapImage,
  validateImageFile,
} from "../lib/storage";

const categories = [
  "Ambiente",
  "Social",
  "Educação",
  "Saúde",
  "Animais",
  "Cultura",
  "Desporto",
];

const statusOptions: Array<{ value: Event["status"]; label: string }> = [
  { value: "open", label: "Aberto" },
  { value: "closed", label: "Fechado" },
  { value: "completed", label: "Concluído" },
];

type FormState = {
  title: string;
  description: string;
  category: string;
  address: string;
  date: string;
  durationHours: string;
  durationMinutes: string;
  volunteersNeeded: string;
  status: Event["status"];
  postEventSummary: string;
  postEventGalleryUrls: string[];
};

type RecapUpload = {
  file: File;
  previewUrl: string;
};

const MAX_RECAP_IMAGES = 8;

const formatDateForInput = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalDate, setOriginalDate] = useState<Date | null>(null);
  const [minDateTime] = useState<string>(() => getNowLocalDateTimeInputValue());
  const [recapUploads, setRecapUploads] = useState<RecapUpload[]>([]);
  const [removedRecapUrls, setRemovedRecapUrls] = useState<string[]>([]);
  const recapObjectUrlsRef = useRef<string[]>([]);
  const imageConstraintsHint = getImageConstraintsDescription();

  const canEdit = useMemo(() => user && user.type === "organization", [user]);

  const durationHoursValue = formData?.durationHours ?? "";
  const durationMinutesValue = formData?.durationMinutes ?? "";

  const durationPreview = useMemo(() => {
    const parsedHours = Number.parseInt(durationHoursValue, 10);
    const parsedMinutes = Number.parseInt(durationMinutesValue, 10);

    const hoursInput = Number.isFinite(parsedHours) ? parsedHours : 0;
    const minutesInput = Number.isFinite(parsedMinutes) ? parsedMinutes : 0;

    const normalized = normalizeDurationParts(hoursInput, minutesInput);
    const totalMinutes = normalized.hours * 60 + normalized.minutes;

    if (totalMinutes <= 0) {
      return null;
    }

    return `${formatDurationFromParts(
      normalized.hours,
      normalized.minutes
    )} (${totalMinutes} minutos)`;
  }, [durationHoursValue, durationMinutesValue]);

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) {
        toast.error("Evento inválido.");
        navigate("/organization/events");
        return;
      }

      if (!canEdit) {
        toast.error("Acesso não autorizado.");
        navigate("/organization/events");
        return;
      }

      try {
        const event = await fetchEventById(id);
        if (!event) {
          toast.error("Evento não encontrado.");
          navigate("/organization/events");
          return;
        }

        if (event.organizationId !== user?.id) {
          toast.error("Não tem permissão para editar este evento.");
          navigate("/organization/events");
          return;
        }

        const { hours, minutes } = splitDurationToParts(event.duration);

        setFormData({
          title: event.title,
          description: event.description,
          category: event.category,
          address: event.location.address,
          date: formatDateForInput(event.date),
          durationHours: String(hours),
          durationMinutes: String(minutes),
          volunteersNeeded: String(event.volunteersNeeded ?? ""),
          status: event.status,
          postEventSummary: event.postEventSummary ?? "",
          postEventGalleryUrls: event.postEventGalleryUrls ?? [],
        });
        setRecapUploads([]);
        setRemovedRecapUrls([]);
        const parsedDate = new Date(event.date);
        setOriginalDate(Number.isNaN(parsedDate.getTime()) ? null : parsedDate);
      } catch (error) {
        console.error("Erro ao carregar evento:", error);
        toast.error("Não foi possível carregar o evento para edição.");
        navigate("/organization/events");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, navigate, canEdit, user]);

  useEffect(() => {
    return () => {
      recapObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      recapObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const status = formData?.status;
    if (status === "completed") {
      return;
    }
    if (recapUploads.length === 0) {
      return;
    }

    recapObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    recapObjectUrlsRef.current = [];
    setRecapUploads([]);
  }, [formData?.status, recapUploads.length]);

  const handleChange = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key]
  ) => {
    setFormData((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        [key]: value,
      };
    });
  };

  const handleRecapFilesChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || !formData) {
      return;
    }

    const currentCount =
      formData.postEventGalleryUrls.length + recapUploads.length;
    const availableSlots = MAX_RECAP_IMAGES - currentCount;

    if (availableSlots <= 0) {
      toast.error("Limite de imagens atingido para este evento.");
      event.target.value = "";
      return;
    }

    const selectedFiles = Array.from(files).slice(0, availableSlots);
    const uploads: RecapUpload[] = [];

    for (const file of selectedFiles) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      recapObjectUrlsRef.current.push(previewUrl);
      uploads.push({ file, previewUrl });
    }

    if (uploads.length > 0) {
      setRecapUploads((previous) => [...previous, ...uploads]);
    }

    event.target.value = "";
  };

  const handleRemoveExistingRecapImage = (url: string) => {
    setFormData((previous) => {
      if (!previous) return previous;
      if (!previous.postEventGalleryUrls.includes(url)) {
        return previous;
      }
      return {
        ...previous,
        postEventGalleryUrls: previous.postEventGalleryUrls.filter(
          (item) => item !== url
        ),
      };
    });
    setRemovedRecapUrls((previous) =>
      previous.includes(url) ? previous : [...previous, url]
    );
  };

  const handleRemoveNewRecapUpload = (previewUrl: string) => {
    setRecapUploads((previous) =>
      previous.filter((item) => item.previewUrl !== previewUrl)
    );
    recapObjectUrlsRef.current = recapObjectUrlsRef.current.filter((url) => {
      if (url === previewUrl) {
        URL.revokeObjectURL(url);
        return false;
      }
      return true;
    });
  };

  const handleDurationHoursChange = (value: string) => {
    setFormData((previous) => {
      if (!previous) return previous;

      if (value === "") {
        return { ...previous, durationHours: "" };
      }

      const numeric = Number.parseInt(value, 10);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return previous;
      }

      const safeValue = Math.min(numeric, 999);
      return { ...previous, durationHours: String(safeValue) };
    });
  };

  const handleDurationMinutesChange = (value: string) => {
    setFormData((previous) => {
      if (!previous) return previous;

      if (value === "") {
        return { ...previous, durationMinutes: "" };
      }

      const numeric = Number.parseInt(value, 10);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return previous;
      }

      const currentHours = Number.parseInt(previous.durationHours, 10);
      const hoursInput = Number.isFinite(currentHours) ? currentHours : 0;
      const { hours, minutes } = normalizeDurationParts(hoursInput, numeric);

      return {
        ...previous,
        durationHours: String(hours),
        durationMinutes: String(minutes),
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !user || !formData) return;

    const volunteersNeeded = Number.parseInt(formData.volunteersNeeded, 10);
    if (!Number.isFinite(volunteersNeeded) || volunteersNeeded <= 0) {
      toast.error("Indique o número de voluntários necessário (mínimo 1).");
      return;
    }

    let selectedDate: Date;
    try {
      selectedDate = new Date(formData.date);
      if (!Number.isFinite(selectedDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch (error) {
      console.error("Invalid date provided", error);
      toast.error("Data inválida. Verifique o campo e tente novamente.");
      return;
    }

    const now = Date.now();
    const eventTime = selectedDate.getTime();
    const inPastBeyondLeeway = eventTime < now - MIN_EVENT_START_LEEWAY_MS;

    if (inPastBeyondLeeway) {
      const canKeepOriginalDate = (() => {
        if (!originalDate) return false;
        const originalTime = originalDate.getTime();
        if (!Number.isFinite(originalTime)) return false;
        return Math.abs(eventTime - originalTime) <= MIN_EVENT_START_LEEWAY_MS;
      })();

      if (!canKeepOriginalDate) {
        toast.error("A data do evento deve ser no futuro.");
        return;
      }
    }

    const isoDate = selectedDate.toISOString();
    const includeRecap = formData.status === "completed";
    const trimmedRecapSummary = formData.postEventSummary.trim();
    const normalizedRecapSummary =
      trimmedRecapSummary.length > 0 ? trimmedRecapSummary : null;
    const baseRecapGallery = formData.postEventGalleryUrls;
    const uploadedRecapUrls: string[] = [];

    const parsedHours = Number.parseInt(formData.durationHours, 10);
    const parsedMinutes = Number.parseInt(formData.durationMinutes, 10);

    const hoursInput = Number.isFinite(parsedHours) ? parsedHours : 0;
    const minutesInput = Number.isFinite(parsedMinutes) ? parsedMinutes : 0;

    const { hours: normalizedHours, minutes: normalizedMinutes } =
      normalizeDurationParts(hoursInput, minutesInput);

    const totalDurationMinutes = normalizedHours * 60 + normalizedMinutes;

    if (totalDurationMinutes <= 0) {
      toast.error("Indique a duração do evento em horas ou minutos.");
      return;
    }

    const durationLabel = formatDurationFromParts(
      normalizedHours,
      normalizedMinutes
    );

    setSaving(true);
    try {
      if (includeRecap && recapUploads.length > 0) {
        for (const upload of recapUploads) {
          const uploadedUrl = await uploadEventRecapImage({
            organizationId: user.id,
            eventId: id,
            file: upload.file,
          });
          uploadedRecapUrls.push(uploadedUrl);
        }
      }

      const nextRecapGallery = includeRecap
        ? [...baseRecapGallery, ...uploadedRecapUrls]
        : [];

      const shouldClearRecap =
        !includeRecap &&
        (baseRecapGallery.length > 0 ||
          recapUploads.length > 0 ||
          removedRecapUrls.length > 0 ||
          trimmedRecapSummary.length > 0);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        address: formData.address.trim(),
        date: isoDate,
        duration: durationLabel,
        volunteersNeeded,
        status: formData.status,
        ...(includeRecap
          ? {
              postEventSummary: normalizedRecapSummary,
              postEventGalleryUrls: nextRecapGallery,
            }
          : shouldClearRecap
          ? {
              postEventSummary: null,
              postEventGalleryUrls: [],
            }
          : {}),
      };

      await updateEvent(id, user.id, payload);

      const cleanupTargets = new Set<string>();
      removedRecapUrls.forEach((url) => cleanupTargets.add(url));
      if (!includeRecap) {
        baseRecapGallery.forEach((url) => cleanupTargets.add(url));
      }

      if (cleanupTargets.size > 0) {
        void Promise.allSettled(
          Array.from(cleanupTargets).map((url) => removeStorageFileByUrl(url))
        );
      }

      toast.success("Evento atualizado com sucesso.");
      navigate("/organization/events");
    } catch (error) {
      for (const url of uploadedRecapUrls) {
        void removeStorageFileByUrl(url);
      }
      console.error("Erro ao atualizar evento:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o evento.";
      toast.error(message);
    } finally {
      recapObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      recapObjectUrlsRef.current = [];
      setRecapUploads([]);
      setRemovedRecapUrls([]);
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600">
        {loading ? (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
              <span className="h-3 w-3 animate-ping rounded-full bg-emerald-500" />
              <span>A carregar evento...</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-6 py-4 text-amber-600 shadow-sm">
            <AlertTriangle className="h-5 w-5" />
            <span>Não foi possível carregar o evento.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Editar Evento
          </h1>
          <p className="text-gray-600 mb-8">
            Atualize as informações do evento de voluntariado
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título do Evento
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) =>
                    handleChange("title", event.target.value)
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: Limpeza de Praia"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(event) =>
                  handleChange("description", event.target.value)
                }
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Descreva o evento e as atividades que serão realizadas..."
                required
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      handleChange("category", event.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(event) =>
                    handleChange(
                      "status",
                      event.target.value as Event["status"]
                    )
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localização
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) =>
                    handleChange("address", event.target.value)
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Endereço completo"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Evento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={formData.date}
                    min={
                      originalDate && originalDate.getTime() < Date.now()
                        ? undefined
                        : minDateTime
                    }
                    onChange={(event) =>
                      handleChange("date", event.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duração
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-sm font-medium text-gray-600">
                      Horas
                    </span>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={formData.durationHours}
                        onChange={(event) =>
                          handleDurationHoursChange(event.target.value)
                        }
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-sm font-medium text-gray-600">
                      Minutos
                    </span>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={formData.durationMinutes}
                        onChange={(event) =>
                          handleDurationMinutesChange(event.target.value)
                        }
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Use 0 quando não se aplica. Ex.: 1 hora e 30 minutos → horas =
                  1, minutos = 30. Para eventos rápidos pode indicar apenas
                  minutos.
                </p>
                {durationPreview && (
                  <p className="mt-2 text-sm font-semibold text-emerald-700">
                    Duração definida: {durationPreview}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Voluntários Necessários
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={formData.volunteersNeeded}
                  min={1}
                  onChange={(event) =>
                    handleChange("volunteersNeeded", event.target.value)
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="20"
                  required
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Relato pós-evento
              </h2>
              {formData.status === "completed" ? (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600">
                    Partilhe um resumo e fotografias deste evento para que a
                    comunidade acompanhe o impacto gerado pela sua organização.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destaques do evento
                    </label>
                    <textarea
                      value={formData.postEventSummary}
                      onChange={(event) =>
                        handleChange("postEventSummary", event.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Descreva os principais resultados, número de voluntários presentes ou histórias inspiradoras."
                    />
                  </div>

                  <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-4">
                    <label className="flex flex-col gap-3 cursor-pointer sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-white p-3 shadow-sm">
                          <ImagePlus className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">
                            Adicionar fotografias do evento
                          </p>
                          <p className="text-xs text-emerald-600">
                            Até {MAX_RECAP_IMAGES} imagens ·{" "}
                            {imageConstraintsHint}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-600 shadow-sm">
                        Selecionar imagens
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleRecapFilesChange}
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      {formData.postEventGalleryUrls.length +
                        recapUploads.length}{" "}
                      / {MAX_RECAP_IMAGES} imagens adicionadas.
                    </p>
                  </div>

                  {formData.postEventGalleryUrls.length === 0 &&
                  recapUploads.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      Ainda não existem fotografias associadas a este evento.
                      Adicione imagens para partilhar o resultado com a
                      comunidade.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {formData.postEventGalleryUrls.map((url) => (
                        <div
                          key={url}
                          className="relative overflow-hidden rounded-lg shadow-sm"
                        >
                          <img
                            src={url}
                            alt="Fotografia do evento"
                            className="h-44 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingRecapImage(url)}
                            className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-rose-600 shadow-md transition hover:bg-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {recapUploads.map((item) => (
                        <div
                          key={item.previewUrl}
                          className="relative overflow-hidden rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50"
                        >
                          <img
                            src={item.previewUrl}
                            alt="Nova fotografia do evento"
                            className="h-44 w-full object-cover opacity-90"
                          />
                          <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
                            Novo
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveNewRecapUpload(item.previewUrl)
                            }
                            className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-rose-600 shadow-md transition hover:bg-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  Os recursos de relato ficam disponíveis quando o evento está
                  marcado como <strong>concluído</strong>. Atualize o estado
                  para "Concluído" após o término para partilhar fotografias e
                  resultados no seu perfil.
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate("/organization/events")}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "A guardar..." : "Guardar alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
