import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import EventCard from "../components/EventCard";
import Pagination from "../components/Pagination";
import { useAuth } from "../context/useAuth";
import {
  deleteEvent,
  fetchOrganizationEvents,
  type PaginatedResponse,
} from "../lib/events";
import type { Event } from "../types";

const DEFAULT_PAGE_SIZE = 20;

export default function OrganizationEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginatedResponse<Event> | null>(
    null
  );

  const eventsNeedingRecap = useMemo(
    () =>
      events.filter((event) => {
        if (event.status !== "completed") return false;
        const summaryLength = (event.postEventSummary ?? "").trim().length;
        const galleryCount = event.postEventGalleryUrls?.length ?? 0;
        return summaryLength === 0 && galleryCount === 0;
      }),
    [events]
  );

  const loadEvents = useCallback(
    async (page = currentPage) => {
      if (!user) {
        setEvents([]);
        setPagination(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await fetchOrganizationEvents(user.id, {
          page,
          pageSize,
        });

        if (Array.isArray(result)) {
          setEvents(result);
          setPagination(null);
        } else {
          setEvents(result.data);
          setPagination(result);
          setCurrentPage(result.page);
        }
      } catch (error) {
        console.error("Erro ao carregar eventos da organização:", error);
        toast.error(
          "Não foi possível carregar os seus eventos. Tente novamente mais tarde."
        );
        setEvents([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [user, currentPage, pageSize]
  );

  useEffect(() => {
    loadEvents(currentPage);
  }, [loadEvents, currentPage]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await loadEvents(currentPage);
      toast.success("Eventos atualizados");
    } catch (error) {
      console.error("Erro ao atualizar eventos:", error);
      toast.error("Não foi possível atualizar os eventos.");
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleDelete = async (eventId: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      "Tem a certeza que pretende eliminar este evento?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(eventId);
      await deleteEvent(eventId, user.id);
      setEvents((previousEvents) =>
        previousEvents.filter((current) => current.id !== eventId)
      );
      toast.success("Evento eliminado com sucesso.");
    } catch (error) {
      console.error("Erro ao eliminar evento:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível eliminar o evento.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Meus Eventos
            </h1>
            <p className="text-gray-600">Gerir os eventos da sua organização</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>{refreshing ? "A atualizar..." : "Atualizar"}</span>
            </button>
            <button
              onClick={() => navigate("/organization/events/create")}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold"
            >
              <Plus className="h-5 w-5" />
              <span>Criar Evento</span>
            </button>
          </div>
        </div>
        {eventsNeedingRecap.length > 0 && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Tem {eventsNeedingRecap.length} evento(s) concluído(s) sem
                relato partilhado.
              </p>
              <p className="text-xs text-amber-700">
                Use o novo formulário rápido para registar como correu cada
                iniciativa.
              </p>
            </div>
            <button
              onClick={() =>
                navigate(
                  `/organization/events/${eventsNeedingRecap[0].id}/recap`
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              <FileText className="h-4 w-4" />
              Partilhar primeiro relato
            </button>
          </div>
        )}
        {loading && events.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-3 text-sm font-medium text-gray-500">
              A carregar eventos...
            </span>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {events.map((event) => (
                <div key={event.id} className="relative">
                  {event.status === "completed" &&
                    (event.postEventSummary ?? "").trim().length === 0 &&
                    (event.postEventGalleryUrls?.length ?? 0) === 0 && (
                      <button
                        type="button"
                        onClick={(click) => {
                          click.stopPropagation();
                          navigate(`/organization/events/${event.id}/recap`);
                        }}
                        className="absolute left-4 top-4 z-10 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 shadow transition hover:bg-amber-200"
                      >
                        Partilhe o relato
                      </button>
                    )}
                  <EventCard event={event} showApplyButton={false} />
                  <div className="absolute top-4 right-4 flex space-x-2">
                    {event.status === "completed" && (
                      <button
                        type="button"
                        onClick={(click) => {
                          click.stopPropagation();
                          navigate(`/organization/events/${event.id}/recap`);
                        }}
                        className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition"
                        aria-label={
                          (event.postEventSummary ?? "").trim().length > 0
                            ? "Atualizar relato do evento"
                            : "Partilhar relato do evento"
                        }
                      >
                        <FileText className="h-4 w-4 text-amber-600" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        navigate(`/organization/events/${event.id}/edit`)
                      }
                      className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition"
                    >
                      <Pencil className="h-4 w-4 text-emerald-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                      className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
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
            <p className="text-gray-600 text-lg mb-4">
              Ainda não criou nenhum evento.
            </p>
            <button
              onClick={() => navigate("/organization/events/create")}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Criar o Primeiro Evento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
