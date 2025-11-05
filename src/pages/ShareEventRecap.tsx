import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { fetchEventById, updateEvent } from "../lib/events";
import {
  getImageConstraintsDescription,
  removeStorageFileByUrl,
  uploadEventRecapImage,
  validateImageFile,
} from "../lib/storage";
import type { Event } from "../types";

const MAX_RECAP_IMAGES = 8;

type RecapUpload = {
  file: File;
  previewUrl: string;
};

export default function ShareEventRecap() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState("");
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [recapUploads, setRecapUploads] = useState<RecapUpload[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const imageConstraintsHint = getImageConstraintsDescription();
  const summaryLength = summary.trim().length;
  const totalImages = existingGallery.length + recapUploads.length;
  const remainingSlots = MAX_RECAP_IMAGES - totalImages;

  useEffect(() => {
    if (!id) {
      toast.error("Evento inválido.");
      navigate("/organization/events");
      return;
    }

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const loadEvent = async () => {
      setLoading(true);
      try {
        const fetched = await fetchEventById(id);
        if (!fetched) {
          toast.error("Evento não encontrado.");
          navigate("/organization/events");
          return;
        }

        if (fetched.organizationId !== user.id) {
          toast.error("Não tem acesso a este evento.");
          navigate("/organization/events");
          return;
        }

        if (fetched.status !== "completed") {
          toast.error("Este evento ainda não está concluído.");
          navigate("/organization/events");
          return;
        }

        setEvent(fetched);
        setSummary(fetched.postEventSummary ?? "");
        setExistingGallery(
          Array.isArray(fetched.postEventGalleryUrls)
            ? fetched.postEventGalleryUrls.filter(
                (url): url is string =>
                  typeof url === "string" && url.trim().length > 0
              )
            : []
        );
      } catch (error) {
        console.error("Erro ao carregar evento para relato:", error);
        toast.error("Não foi possível carregar o evento.");
        navigate("/organization/events");
      } finally {
        setLoading(false);
      }
    };

    void loadEvent();
  }, [id, navigate, user]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const handleAddImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("Já atingiu o número máximo de imagens.");
      event.target.value = "";
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    const uploads: RecapUpload[] = [];

    for (const file of selectedFiles) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);
      uploads.push({ file, previewUrl });
    }

    if (uploads.length > 0) {
      setRecapUploads((previous) => [...previous, ...uploads]);
    }

    event.target.value = "";
  };

  const handleRemoveExisting = (url: string) => {
    setExistingGallery((previous) => previous.filter((item) => item !== url));
    setRemovedUrls((previous) =>
      previous.includes(url) ? previous : [...previous, url]
    );
  };

  const handleRemoveUpload = (previewUrl: string) => {
    setRecapUploads((previous) =>
      previous.filter((item) => item.previewUrl !== previewUrl)
    );
    objectUrlsRef.current = objectUrlsRef.current.filter((url) => {
      if (url === previewUrl) {
        URL.revokeObjectURL(url);
        return false;
      }
      return true;
    });
  };

  const handleSubmit = async (
    submitEvent: React.FormEvent<HTMLFormElement>
  ) => {
    submitEvent.preventDefault();
    if (!user || !id || !event) return;

    const trimmedSummary = summary.trim();
    if (trimmedSummary.length < 10 && totalImages === 0) {
      setValidationMessage(
        "Partilhe pelo menos um pequeno resumo (min. 10 caracteres) ou adicione fotos."
      );
      return;
    }

    setValidationMessage(null);
    setSaving(true);

    const uploadedUrls: string[] = [];
    try {
      for (const upload of recapUploads) {
        const uploadedUrl = await uploadEventRecapImage({
          organizationId: user.id,
          eventId: id,
          file: upload.file,
        });
        uploadedUrls.push(uploadedUrl);
      }

      const nextGallery = [...existingGallery, ...uploadedUrls];

      await updateEvent(id, user.id, {
        postEventSummary: trimmedSummary.length > 0 ? trimmedSummary : null,
        postEventGalleryUrls: nextGallery,
      });

      if (removedUrls.length > 0) {
        void Promise.allSettled(
          removedUrls.map((url) => removeStorageFileByUrl(url))
        );
      }

      toast.success("Relato guardado com sucesso.");
      navigate("/organization/events");
    } catch (error) {
      for (const url of uploadedUrls) {
        void removeStorageFileByUrl(url);
      }
      console.error("Erro ao guardar relato:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o relato. Tente novamente.";
      toast.error(message);
    } finally {
      setSaving(false);
      setRecapUploads([]);
      setRemovedUrls([]);
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          <span>A carregar evento...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-md">
          <div className="mb-8 border-b border-gray-100 pb-6">
            <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <FileText className="h-4 w-4" />
              Relato pós-evento
            </span>
            <h1 className="text-3xl font-bold text-gray-900">
              Partilhar como correu o evento
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              Conte aos voluntários e à comunidade o impacto alcançado em
              <strong className="ml-1 text-gray-800">{event.title}</strong>.
            </p>
            <div className="mt-4 grid gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 md:grid-cols-2">
              <div>
                <p className="font-semibold text-gray-700">Data</p>
                <p>
                  {new Date(event.date).toLocaleString("pt-PT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">
                  Voluntários presentes
                </p>
                <p>
                  {event.volunteersRegistered} / {event.volunteersNeeded}
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Destaques do evento
              </label>
              <textarea
                value={summary}
                onChange={(eventChange) => setSummary(eventChange.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Resuma o que aconteceu, mencione resultados alcançados, número de voluntários envolvidos ou histórias que merecem destaque."
                disabled={saving}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{summaryLength} caracteres</span>
                <span>Minímo recomendado: 150 caracteres</span>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Galeria de fotografias
                </label>
                <span className="text-xs text-gray-500">
                  Pode carregar até {MAX_RECAP_IMAGES} imagens (restam{" "}
                  {Math.max(remainingSlots, 0)}).
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {existingGallery.map((url) => (
                  <div
                    key={url}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
                  >
                    <img
                      src={url}
                      alt="Imagem do evento"
                      className="h-36 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(url)}
                      disabled={saving}
                      className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-white/90 p-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-white"
                      aria-label="Remover imagem existente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {recapUploads.map((upload) => (
                  <div
                    key={upload.previewUrl}
                    className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50"
                  >
                    <img
                      src={upload.previewUrl}
                      alt="Pré-visualização da nova imagem"
                      className="h-36 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveUpload(upload.previewUrl)}
                      disabled={saving}
                      className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-white/90 p-1 text-xs font-semibold text-emerald-600 shadow-sm transition hover:bg-white"
                      aria-label="Remover imagem selecionada"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-4">
                <label className="flex cursor-pointer flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        Adicionar fotografias
                      </p>
                      <p className="text-xs text-emerald-600">
                        {imageConstraintsHint}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-600 shadow-sm">
                    Selecionar ficheiros
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddImages}
                    className="hidden"
                    disabled={saving || remainingSlots <= 0}
                  />
                </label>
                {remainingSlots <= 0 && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Limite máximo atingido. Remova alguma imagem para adicionar
                    novas.
                  </p>
                )}
              </div>
            </div>

            {validationMessage && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {validationMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                O relato ficará visível no perfil público da organização e na
                página do evento.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/organization/events")}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />A guardar...
                    </>
                  ) : (
                    "Guardar relato"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
