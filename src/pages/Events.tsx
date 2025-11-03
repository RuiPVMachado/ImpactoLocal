import {
  useEffect,
  useState,
  type ChangeEvent,
  useCallback,
  useId,
} from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, MapPin, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import EventCard from "../components/EventCard";
import Pagination from "../components/Pagination";
import { fetchEvents, type PaginatedResponse } from "../lib/api";
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

const DEFAULT_PAGE_SIZE = 20;

export default function Events() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginatedResponse<Event> | null>(
    null
  );
  const searchInputId = useId();
  const categorySelectId = useId();

  const loadEvents = useCallback(
    async (page = currentPage, resetPagination = false) => {
      if (resetPagination) {
        setCurrentPage(1);
        setPageSize(DEFAULT_PAGE_SIZE);
        page = 1;
      }

      setLoading(true);
      try {
        // Use server-side search and filtering if searchTerm is provided
        const result = await fetchEvents({
          page,
          pageSize,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          searchTerm: searchTerm.trim() || undefined,
        });

        if (Array.isArray(result)) {
          // Legacy format - no pagination
          setEvents(result);
          setPagination(null);
        } else {
          // Paginated format
          setEvents(result.data);
          setPagination(result);
          setCurrentPage(result.page);
        }
      } catch (error: unknown) {
        console.error("Erro ao carregar eventos:", error);
        toast.error("Não foi possível carregar os eventos.");
        setEvents([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedCategory, pageSize, currentPage]
  );

  useEffect(() => {
    // Debounce search term
    const timer = setTimeout(() => {
      loadEvents(1, true);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    // Load events when page changes
    if (currentPage > 1 || !searchTerm || selectedCategory !== "all") {
      loadEvents(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEvents(currentPage);
      toast.success("Eventos atualizados");
    } catch (error: unknown) {
      console.error("Erro ao atualizar eventos:", error);
      toast.error("Não foi possível atualizar os eventos.");
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
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
              <label htmlFor={searchInputId} className="sr-only">
                Pesquisar eventos
              </label>
              <input
                type="text"
                placeholder="Pesquisar eventos..."
                value={searchTerm}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(event.target.value)
                }
                id={searchInputId}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <label htmlFor={categorySelectId} className="sr-only">
                Filtrar por categoria
              </label>
              <select
                id={categorySelectId}
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
              <button
                type="button"
                onClick={() => navigate("/mapa")}
                className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                <MapPin className="h-5 w-5" />
                <span>Ver Mapa</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {loading && events.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            A carregar eventos...
          </div>
        ) : events.length > 0 ? (
          <>
            <h2 className="sr-only" id="event-list-heading">
              Lista de eventos disponíveis
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event.id)}
                />
              ))}
            </div>
            {pagination && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  pageSize={pagination.pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  showPageSizeSelector
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-lg mb-2">
              Nenhum evento encontrado.
            </p>
            <p className="text-gray-500 text-sm">
              {searchTerm || selectedCategory !== "all"
                ? "Tente ajustar os filtros de pesquisa."
                : "Volte em breve para ver novos eventos."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
