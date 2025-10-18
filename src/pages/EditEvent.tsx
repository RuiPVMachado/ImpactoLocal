import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { fetchEventById, updateEvent } from "../lib/api";
import type { Event } from "../types";
import {
  getNowLocalDateTimeInputValue,
  MIN_EVENT_START_LEEWAY_MS,
} from "../lib/datetime";

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
  duration: string;
  volunteersNeeded: string;
  status: Event["status"];
};

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

  const canEdit = useMemo(() => user && user.type === "organization", [user]);

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

        setFormData({
          title: event.title,
          description: event.description,
          category: event.category,
          address: event.location.address,
          date: formatDateForInput(event.date),
          duration: event.duration,
          volunteersNeeded: String(event.volunteersNeeded ?? ""),
          status: event.status,
        });
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

    setSaving(true);
    try {
      await updateEvent(id, user.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        address: formData.address.trim(),
        date: isoDate,
        duration: formData.duration.trim(),
        volunteersNeeded,
        status: formData.status,
      });

      toast.success("Evento atualizado com sucesso.");
      navigate("/organization/events");
    } catch (error) {
      console.error("Erro ao atualizar evento:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o evento.";
      toast.error(message);
    } finally {
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
