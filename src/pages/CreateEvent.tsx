import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Calendar, MapPin, Users, Clock, FileText, Tag } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { createEvent } from "../lib/api";

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
  const [submitting, setSubmitting] = useState(false);

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

    let isoDate: string;
    try {
      isoDate = new Date(formData.date).toISOString();
      if (!isoDate) throw new Error("Invalid date");
    } catch (error) {
      console.error("Invalid date provided", error);
      toast.error("Data inválida. Verifique o campo e tente novamente.");
      return;
    }

    setSubmitting(true);
    try {
      await createEvent({
        organizationId: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        address: formData.address.trim(),
        date: isoDate,
        duration: formData.duration.trim(),
        volunteersNeeded,
      });

      toast.success("Evento criado com sucesso!");
      navigate("/organization/events");
    } catch (error) {
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
