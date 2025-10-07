import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, MapPin, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import EventCard from "../components/EventCard";
import { useAuth } from "../context/useAuth";
import { applyToEvent, fetchEvents } from "../lib/api";
import type { Event } from "../types";

const categories = [
  "all",
  "Ambiente",
  "Social",
  "Educação",
  "Saúde",
  "Animais",
  "Cultura",
  "Desporto",
];

export default function Events() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      try {
        const data = await fetchEvents();
        if (mounted) {
          setEvents(data);
        }
      } catch (error: unknown) {
        console.error("Erro ao carregar eventos:", error);
        toast.error("Não foi possível carregar os eventos.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event: Event) => {
      const matchesCategory =
        selectedCategory === "all" || event.category === selectedCategory;
      const matchesSearch = searchTerm
        ? event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.address
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [events, searchTerm, selectedCategory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchEvents();
      setEvents(data);
      toast.success("Eventos atualizados");
    } catch (error: unknown) {
      console.error("Erro ao atualizar eventos:", error);
      toast.error("Não foi possível atualizar os eventos.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleApply = async (eventId: string) => {
    if (!isAuthenticated || !user) {
      toast.error(
        "É necessário iniciar sessão como voluntário para candidatar."
      );
      navigate("/login");
      return;
    }

    if (user.type !== "volunteer") {
      toast.error("Apenas voluntários podem candidatar-se a eventos.");
      return;
    }

    try {
      await applyToEvent({ eventId, volunteerId: user.id });
      toast.success("Candidatura enviada com sucesso! Aguardando aprovação.");
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const supabaseError = error as { code?: string };
        if (supabaseError.code === "23505") {
          toast.error("Já se candidatou a este evento.");
          return;
        }
      }

      console.error("Erro ao candidatar:", error);
      toast.error("Não foi possível submeter a candidatura.");
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Eventos de Voluntariado
          </h1>
          <p className="text-gray-600">
            Encontre oportunidades para fazer a diferença na sua comunidade
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar eventos..."
                value={searchTerm}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(event.target.value)
                }
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setSelectedCategory(event.target.value)
                }
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "Todas as Categorias" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-3">
              <button className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-semibold">
                <MapPin className="h-5 w-5" />
                <span>Ver Mapa</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span>
                  {refreshing ? "A atualizar..." : "Atualizar eventos"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">
            A carregar eventos...
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onApply={handleApply}
                showApplyButton
                onClick={() => handleEventClick(event.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Nenhum evento encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
