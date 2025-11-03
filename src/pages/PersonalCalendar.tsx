import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { fetchApplicationsByVolunteer } from "../lib/api";
import { useAuth } from "../context/useAuth";
import type { Application, Event } from "../types";
import AddToCalendarButton from "../components/AddToCalendarButton";
import { formatDurationWithHours } from "../lib/formatters";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const getStartOfWeek = (reference: Date): Date => {
  const date = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  );
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getEndOfWeek = (reference: Date): Date => {
  const start = getStartOfWeek(reference);
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59, 999);
  return start;
};

const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const sortEventsByDate = (events: CalendarEvent[]): CalendarEvent[] =>
  [...events].sort(
    (first, second) => first.startDate.getTime() - second.startDate.getTime()
  );

interface CalendarEvent {
  applicationId: string;
  event: Event;
  startDate: Date;
}

type ViewMode = "month" | "week";

export default function PersonalCalendar() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentFocusDate, setCurrentFocusDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    getDateKey(new Date())
  );
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  useEffect(() => {
    let active = true;

    const loadApplications = async () => {
      if (!user || user.type !== "volunteer") {
        setApplications([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchApplicationsByVolunteer(user.id);
        if (active) {
          const applicationsList = Array.isArray(data) ? data : data.data;
          setApplications(applicationsList);
        }
      } catch (error) {
        console.error("Erro ao carregar candidaturas aprovadas", error);
        if (active) {
          toast.error(
            "Não foi possível carregar o calendário pessoal neste momento."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadApplications();

    return () => {
      active = false;
    };
  }, [user]);

  const approvedEvents = useMemo(() => {
    const entries: CalendarEvent[] = [];

    for (const application of applications) {
      if (application.status !== "approved") continue;
      if (!application.event?.date) continue;

      const startDate = new Date(application.event.date);
      if (!Number.isFinite(startDate.getTime())) continue;

      entries.push({
        applicationId: application.id,
        event: application.event,
        startDate,
      });
    }

    return entries.sort(
      (first, second) => first.startDate.getTime() - second.startDate.getTime()
    );
  }, [applications]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const entry of approvedEvents) {
      const key = getDateKey(entry.startDate);
      const list = map.get(key);
      if (list) {
        list.push(entry);
      } else {
        map.set(key, [entry]);
      }
    }

    for (const [key, list] of map.entries()) {
      map.set(key, sortEventsByDate(list));
    }

    return map;
  }, [approvedEvents]);

  const displayedDays = useMemo(() => {
    if (viewMode === "week") {
      const start = getStartOfWeek(currentFocusDate);
      return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        const key = getDateKey(date);
        return {
          date,
          key,
          events: eventsByDate.get(key) ?? [],
          isCurrentMonth: true,
        };
      });
    }

    const firstDayOfMonth = new Date(
      currentFocusDate.getFullYear(),
      currentFocusDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      currentFocusDate.getFullYear(),
      currentFocusDate.getMonth() + 1,
      0
    );

    const gridStart = getStartOfWeek(firstDayOfMonth);
    const gridEnd = getEndOfWeek(lastDayOfMonth);

    const days: {
      date: Date;
      key: string;
      events: CalendarEvent[];
      isCurrentMonth: boolean;
    }[] = [];

    for (
      let current = new Date(gridStart);
      current <= gridEnd;
      current = addDays(current, 1)
    ) {
      const key = getDateKey(current);
      days.push({
        date: new Date(current),
        key,
        events: eventsByDate.get(key) ?? [],
        isCurrentMonth:
          current.getMonth() === currentFocusDate.getMonth() &&
          current.getFullYear() === currentFocusDate.getFullYear(),
      });
    }

    return days;
  }, [currentFocusDate, eventsByDate, viewMode]);

  useEffect(() => {
    if (!eventsByDate.has(selectedDateKey) && approvedEvents.length > 0) {
      const firstUpcoming = approvedEvents.find(
        (entry) => entry.startDate.getTime() >= Date.now()
      );
      if (firstUpcoming) {
        setSelectedDateKey(getDateKey(firstUpcoming.startDate));
        setCurrentFocusDate(new Date(firstUpcoming.startDate));
      }
    }
  }, [approvedEvents, eventsByDate, selectedDateKey]);

  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];
  const selectedDate = useMemo(() => {
    const parts = selectedDateKey.split("-");
    if (parts.length !== 3) {
      return new Date();
    }
    const [yearString, monthString, dayString] = parts;
    const year = Number.parseInt(yearString, 10);
    const month = Number.parseInt(monthString, 10);
    const day = Number.parseInt(dayString, 10);
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return new Date();
    }
    return new Date(year, month - 1, day);
  }, [selectedDateKey]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return approvedEvents.filter((entry) => entry.startDate.getTime() >= now);
  }, [approvedEvents]);

  const handleNavigate = (direction: "prev" | "next") => {
    if (viewMode === "week") {
      setCurrentFocusDate((current) =>
        addDays(current, direction === "prev" ? -7 : 7)
      );
      return;
    }

    setCurrentFocusDate((current) => {
      const next = new Date(
        current.getFullYear(),
        current.getMonth() + (direction === "prev" ? -1 : 1),
        1
      );
      return next;
    });
  };

  if (!user || user.type !== "volunteer") {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <CalendarIcon className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-6 text-3xl font-semibold text-slate-900">
            Calendário pessoal disponível para voluntários
          </h1>
          <p className="mt-3 text-slate-600">
            Inicie sessão como voluntário para ver a agenda dos seus eventos
            confirmados.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Iniciar sessão
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                Calendário pessoal
              </h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Veja rapidamente quando e onde precisa de estar. Adicione os
                eventos aprovados ao Google Calendar e mantenha-se preparado.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white p-2 shadow-soft">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "month"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "week"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Semanal
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">Período selecionado</p>
              <p className="text-lg font-semibold text-slate-900">
                {currentFocusDate.toLocaleDateString("pt-PT", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigate("prev")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                aria-label="Ver período anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentFocusDate(new Date())}
                className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("next")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                aria-label="Ver próximo período"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-3 text-sm text-slate-600">
              A sincronizar calendário...
            </span>
          </div>
        ) : approvedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-12 text-center shadow-sm">
            <CalendarIcon className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-6 text-2xl font-semibold text-slate-900">
              Sem eventos aprovados por agora
            </h2>
            <p className="mt-3 text-slate-600">
              Quando a sua participação for confirmada, verá os eventos aqui.
              Continue a explorar oportunidades na comunidade!
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ver eventos disponíveis
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {displayedDays.map((day) => {
                  const isSelected = day.key === selectedDateKey;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        setSelectedDateKey(day.key);
                        setCurrentFocusDate(day.date);
                      }}
                      className={`flex h-20 flex-col items-start justify-start rounded-2xl border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-emerald-200"
                      } ${day.isCurrentMonth ? "" : "opacity-60"}`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday(day.date)
                            ? "bg-emerald-500 text-white"
                            : "text-slate-600"
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      <div className="mt-1 flex w-full flex-col gap-1">
                        {day.events.slice(0, 2).map((entry) => (
                          <span
                            key={entry.applicationId}
                            className="truncate rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                          >
                            {entry.event.title}
                          </span>
                        ))}
                        {day.events.length > 2 && (
                          <span className="text-[10px] font-medium text-emerald-700">
                            +{day.events.length - 2} mais
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  {selectedEvents.length > 0
                    ? `${
                        selectedEvents.length
                      } evento(s) a ${selectedDate.toLocaleDateString("pt-PT", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}`
                    : "Sem eventos neste dia"}
                </p>
                <div className="mt-4 space-y-4">
                  {selectedEvents.map((entry) => {
                    const startDate = entry.startDate;
                    const formattedTime = startDate.toLocaleTimeString(
                      "pt-PT",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );

                    return (
                      <div
                        key={entry.applicationId}
                        className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {entry.event.title}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {entry.event.organization?.name ?? "Organização"}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                                <Clock className="h-3.5 w-3.5" />
                                {formattedTime}
                              </span>
                              {entry.event.duration && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                                  {formatDurationWithHours(
                                    entry.event.duration
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <AddToCalendarButton
                            event={entry.event}
                            size="sm"
                            label="Calendário"
                            variant="ghost"
                          />
                        </div>

                        <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
                          {entry.event.location?.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-emerald-500" />
                              <span>{entry.event.location.address}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                          <Link
                            to={`/events/${entry.event.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-emerald-100 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Ver detalhes do evento
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {selectedEvents.length === 0 && (
                    <p className="text-sm text-slate-600">
                      Escolha outro dia para ver eventos aprovados.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Próximos eventos confirmados
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Adicione rapidamente os eventos ao Google Calendar para garantir
                que recebe lembretes atempados.
              </p>

              <div className="mt-4 space-y-4">
                {upcomingEvents.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                    Não existem eventos futuros confirmados. Assim que tiveres
                    uma participação aprovada, ela irá aparecer aqui.
                  </p>
                ) : (
                  upcomingEvents.map((entry) => {
                    const formattedDate = entry.startDate.toLocaleDateString(
                      "pt-PT",
                      {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      }
                    );

                    const formattedTime = entry.startDate.toLocaleTimeString(
                      "pt-PT",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );

                    return (
                      <div
                        key={`upcoming-${entry.applicationId}`}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              {formattedDate}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {entry.event.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formattedTime} ·{" "}
                              {entry.event.organization?.name ?? "Organização"}
                            </p>
                          </div>
                          <AddToCalendarButton
                            event={entry.event}
                            size="sm"
                            variant="ghost"
                            label="Google Calendar"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
