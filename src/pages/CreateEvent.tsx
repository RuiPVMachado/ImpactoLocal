import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  FileText,
  Tag,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { createEvent } from "../lib/api";
import {
  getNowLocalDateTimeInputValue,
  MIN_EVENT_START_LEEWAY_MS,
} from "../lib/datetime";
import {
  getImageConstraintsDescription,
  removeStorageFileByUrl,
  uploadEventImage,
  validateImageFile,
} from "../lib/storage";

type FormState = {
  title: string;
  description: string;
  category: string;
  address: string;
  date: string;
  duration: string;
  volunteersNeeded: string;
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormState>({
    title: "",
    description: "",
    category: "Ambiente",
    address: "",
    date: "",
    duration: "",
    volunteersNeeded: "",
  });
  const [minDateTime] = useState<string>(() => getNowLocalDateTimeInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  const imageConstraintsHint = getImageConstraintsDescription();

  useEffect(() => {
    const objectUrl = imageObjectUrlRef.current;
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imagePreview]);

  const categories = [
    "Ambiente",
    "Social",
    "Educação",
    "Saúde",
    "Animais",
    "Cultura",
    "Desporto",
  ];

  const handleChange = (
    field: keyof FormState,
    value: FormState[keyof FormState]
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      event.target.value = "";
      return;
    }

    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = previewUrl;
    setImagePreview(previewUrl);
    setImageFile(file);
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast.error("Inicie sessão para criar um evento.");
      navigate("/login");
      return;
    }

    if (user.type !== "organization") {
      toast.error("Apenas organizações podem criar eventos.");
      return;
    }

    if (!formData.date) {
      toast.error("Selecione a data e hora do evento.");
      return;
    }

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
    if (selectedDate.getTime() < now - MIN_EVENT_START_LEEWAY_MS) {
      toast.error("A data do evento deve ser no futuro.");
      return;
    }

    const isoDate = selectedDate.toISOString();

    setSubmitting(true);
    let uploadedImageUrl: string | null = null;
    try {
      if (imageFile) {
        uploadedImageUrl = await uploadEventImage({
          organizationId: user.id,
          file: imageFile,
        });
      }

      await createEvent({
        organizationId: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        address: formData.address.trim(),
        date: isoDate,
        duration: formData.duration.trim(),
        volunteersNeeded,
        ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
      });

      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
      setImageFile(null);
      setImagePreview(null);

      toast.success("Evento criado com sucesso!");
      navigate("/organization/events");
    } catch (error) {
      if (uploadedImageUrl) {
        void removeStorageFileByUrl(uploadedImageUrl).catch((cleanupError) => {
          console.warn(
            "Falha ao remover imagem recém-carregada após erro",
            cleanupError
          );
        });
      }
      console.error("Erro ao criar evento:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar o evento.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Criar Novo Evento
          </h1>
          <p className="text-gray-600 mb-8">
            Preencha os detalhes do evento de voluntariado
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
              <p className="mt-2 text-sm text-gray-600">
                A localização será integrada com o Google Maps para facilitar a
                navegação
              </p>
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
                    min={minDateTime}
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
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(event) =>
                      handleChange("duration", event.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: 3 horas"
                    required
                  />
                </div>
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
                  onChange={(event) =>
                    handleChange("volunteersNeeded", event.target.value)
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="20"
                  min="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem do Evento (opcional)
              </label>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative h-40 w-full overflow-hidden rounded-lg border border-dashed border-emerald-300 bg-emerald-50 md:w-64">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Pré-visualização do evento"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-emerald-600">
                      <ImagePlus className="h-8 w-8" />
                      <span className="text-sm font-semibold">
                        Adicione uma imagem chamativa
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-600 hover:text-white">
                    Selecionar imagem
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="text-sm text-gray-500">
                    {imageConstraintsHint}
                  </p>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover imagem
                    </button>
                  )}
                </div>
              </div>
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
                disabled={submitting}
                className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "A criar evento..." : "Criar Evento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
