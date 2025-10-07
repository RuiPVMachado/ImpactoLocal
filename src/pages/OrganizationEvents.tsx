import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import EventCard from "../components/EventCard";
import { useAuth } from "../context/useAuth";
import { deleteEvent, fetchOrganizationEvents } from "../lib/api";
import type { Event } from "../types";

export default function OrganizationEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchOrganizationEvents(user.id);
      setEvents(data);
    } catch (error) {
      console.error("Erro ao carregar eventos da organização:", error);
      toast.error(
        "Não foi possível carregar os seus eventos. Tente novamente mais tarde."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const data = await fetchOrganizationEvents(user.id);
      setEvents(data);
      toast.success("Eventos atualizados");
    } catch (error) {
      console.error("Erro ao atualizar eventos:", error);
      toast.error("Não foi possível atualizar os eventos.");
    } finally {
      setRefreshing(false);
    }
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
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-3 text-sm font-medium text-gray-500">
              A carregar eventos...
            </span>
          </div>
        ) : events.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="relative">
                <EventCard event={event} showApplyButton={false} />
                <div className="absolute top-4 right-4 flex space-x-2">
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
