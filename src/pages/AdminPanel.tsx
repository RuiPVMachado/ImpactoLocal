import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Users,
  Calendar,
  Building,
  Shield,
  Search,
  Loader2,
  Trash2,
  Pencil,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  adminDeleteEvent,
  adminDeleteProfile,
  adminUpdateEvent,
  adminUpdateProfile,
  fetchAdminEvents,
  fetchAdminMetrics,
  fetchAdminProfiles,
} from "../lib/api";
import type { AdminMetrics, Event, Profile, UserRole } from "../types";

type TabKey = "users" | "organizations" | "events";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateTimeLocalValue = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const translateUserType = (type: UserRole) => {
  switch (type) {
    case "volunteer":
      return "Voluntário";
    case "organization":
      return "Organização";
    case "admin":
      return "Admin";
    default:
      return type;
  }
};

type EditTarget =
  | { type: "profile"; profile: Profile }
  | { type: "event"; event: Event };

type DeleteTarget =
  | { type: "profile"; profile: Profile }
  | { type: "event"; event: Event };

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadAdminData = async () => {
      setLoading(true);
      try {
        const [metricsData, profilesData, eventsData] = await Promise.all([
          fetchAdminMetrics(),
          fetchAdminProfiles({ limit: 100 }),
          fetchAdminEvents({ limit: 100 }),
        ]);

        setMetrics(metricsData.metrics);
        setProfiles(profilesData);
        setEvents(eventsData);
      } catch (error) {
        console.error("Erro ao carregar dados de administração:", error);
        toast.error(
          "Não foi possível carregar os dados administrativos. Tente novamente."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAdminData();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const individualUsers = useMemo(
    () => profiles.filter((profile) => profile.type !== "organization"),
    [profiles]
  );

  const organizations = useMemo(
    () => profiles.filter((profile) => profile.type === "organization"),
    [profiles]
  );

  const filteredUsers = useMemo(() => {
    if (!normalizedSearch) return individualUsers;
    return individualUsers.filter((profile) =>
      [profile.name, profile.email, profile.id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch))
    );
  }, [individualUsers, normalizedSearch]);

  const filteredOrganizations = useMemo(() => {
    if (!normalizedSearch) return organizations;
    return organizations.filter((profile) =>
      [profile.name, profile.email, profile.id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch))
    );
  }, [organizations, normalizedSearch]);

  const filteredEvents = useMemo(() => {
    if (!normalizedSearch) return events;
    return events.filter((event) =>
      [
        event.title,
        event.category,
        event.organization?.name,
        event.organization?.email,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch))
    );
  }, [events, normalizedSearch]);

  const isInitialLoading = loading && metrics === null;

  const handleSaveProfile = async (
    profile: Profile,
    values: { name: string; type: UserRole }
  ) => {
    setSaving(true);
    try {
      const updated = await adminUpdateProfile({
        id: profile.id,
        name: values.name.trim(),
        type: values.type,
      });

      setProfiles((previous) =>
        previous.map((current) =>
          current.id === updated.id ? updated : current
        )
      );

      setMetrics((current) => {
        if (!current) return current;
        if (profile.type === values.type) return current;

        const next = { ...current };

        const decrementType = (type: UserRole) => {
          if (type === "volunteer") {
            next.volunteers = Math.max(0, next.volunteers - 1);
          } else if (type === "organization") {
            next.organizations = Math.max(0, next.organizations - 1);
          } else if (type === "admin") {
            next.admins = Math.max(0, next.admins - 1);
          }
        };

        const incrementType = (type: UserRole) => {
          if (type === "volunteer") {
            next.volunteers += 1;
          } else if (type === "organization") {
            next.organizations += 1;
          } else if (type === "admin") {
            next.admins += 1;
          }
        };

        decrementType(profile.type);
        incrementType(values.type);

        return next;
      });

      toast.success("Perfil atualizado com sucesso.");
      setEditTarget(null);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível atualizar o perfil.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvent = async (
    event: Event,
    values: {
      title: string;
      status: Event["status"];
      volunteersNeeded: number;
      date?: string | null;
    }
  ) => {
    setSaving(true);
    try {
      const updated = await adminUpdateEvent(event.id, {
        title: values.title.trim(),
        status: values.status,
        volunteersNeeded: values.volunteersNeeded,
        date: values.date ?? event.date,
      });

      setEvents((previous) =>
        previous.map((current) =>
          current.id === updated.id ? updated : current
        )
      );

      toast.success("Evento atualizado com sucesso.");
      setEditTarget(null);
    } catch (error) {
      console.error("Erro ao atualizar evento:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível atualizar o evento.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setProcessingId(
      deleteTarget.type === "profile"
        ? deleteTarget.profile.id
        : deleteTarget.event.id
    );

    try {
      if (deleteTarget.type === "profile") {
        const { profile } = deleteTarget;
        await adminDeleteProfile(profile.id);

        setProfiles((previous) =>
          previous.filter((current) => current.id !== profile.id)
        );

        setMetrics((current) => {
          if (!current) return current;
          const next = { ...current };
          next.totalUsers = Math.max(0, next.totalUsers - 1);
          if (profile.type === "volunteer") {
            next.volunteers = Math.max(0, next.volunteers - 1);
          } else if (profile.type === "organization") {
            next.organizations = Math.max(0, next.organizations - 1);
          } else if (profile.type === "admin") {
            next.admins = Math.max(0, next.admins - 1);
          }
          return next;
        });

        toast.success("Perfil eliminado com sucesso.");
      } else {
        const { event: targetEvent } = deleteTarget;
        await adminDeleteEvent(targetEvent.id);

        setEvents((previous) =>
          previous.filter((current) => current.id !== targetEvent.id)
        );

        setMetrics((current) => {
          if (!current) return current;
          return {
            ...current,
            totalEvents: Math.max(0, current.totalEvents - 1),
          };
        });

        toast.success("Evento eliminado com sucesso.");
      }
    } catch (error) {
      console.error("Erro ao eliminar registo:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível concluir a eliminação.";
      toast.error(message);
    } finally {
      setProcessingId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Painel de Administração
          </h1>
          <p className="text-gray-600">
            Gerir utilizadores, organizações e eventos da plataforma
          </p>
        </div>

        {isInitialLoading ? (
          <div className="flex h-72 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            <span className="ml-3 text-sm font-medium text-gray-500">
              A carregar dados administrativos...
            </span>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <SummaryCard
                icon={Users}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
                value={metrics?.totalUsers ?? 0}
                label="Total Utilizadores"
              />
              <SummaryCard
                icon={Building}
                iconBg="bg-teal-100"
                iconColor="text-teal-600"
                value={metrics?.organizations ?? 0}
                label="Organizações"
              />
              <SummaryCard
                icon={Calendar}
                iconBg="bg-cyan-100"
                iconColor="text-cyan-600"
                value={metrics?.totalEvents ?? 0}
                label="Eventos"
              />
              <SummaryCard
                icon={Shield}
                iconBg="bg-yellow-100"
                iconColor="text-yellow-600"
                value={metrics?.pendingApplications ?? 0}
                label="Candidaturas Pendentes"
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex border-b border-gray-200 mb-6">
                <TabButton
                  label="Utilizadores"
                  isActive={activeTab === "users"}
                  onClick={() => setActiveTab("users")}
                />
                <TabButton
                  label="Organizações"
                  isActive={activeTab === "organizations"}
                  onClick={() => setActiveTab("organizations")}
                />
                <TabButton
                  label="Eventos"
                  isActive={activeTab === "events"}
                  onClick={() => setActiveTab("events")}
                />
              </div>

              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Pesquisar por nome, email ou título"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {normalizedSearch
                      ? `Resultados filtrados por "${normalizedSearch}"`
                      : "Sem filtro aplicado"}
                  </span>
                  {normalizedSearch && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {activeTab === "users" && (
                <DataTable
                  isLoading={loading && !!metrics}
                  headers={["Nome", "Email", "Tipo", "Data Registo", "Ações"]}
                  rows={filteredUsers.map((user) => ({
                    key: user.id,
                    cells: [
                      user.name,
                      user.email,
                      translateUserType(user.type),
                      formatDate(user.createdAt),
                      <TableActions
                        key={`actions-${user.id}`}
                        onEdit={() =>
                          setEditTarget({ type: "profile", profile: user })
                        }
                        onDelete={() =>
                          setDeleteTarget({ type: "profile", profile: user })
                        }
                        disableDelete={processingId === user.id}
                      />,
                    ],
                  }))}
                  emptyMessage="Ainda não existem registos suficientes de utilizadores."
                />
              )}

              {activeTab === "organizations" && (
                <DataTable
                  isLoading={loading && !!metrics}
                  headers={["Nome", "Email", "Data Registo", "Ações"]}
                  rows={filteredOrganizations.map((organization) => ({
                    key: organization.id,
                    cells: [
                      organization.name,
                      organization.email,
                      formatDate(organization.createdAt),
                      <TableActions
                        key={`actions-${organization.id}`}
                        onEdit={() =>
                          setEditTarget({
                            type: "profile",
                            profile: organization,
                          })
                        }
                        onDelete={() =>
                          setDeleteTarget({
                            type: "profile",
                            profile: organization,
                          })
                        }
                        disableDelete={processingId === organization.id}
                      />,
                    ],
                  }))}
                  emptyMessage="Sem organizações recentes para mostrar."
                />
              )}

              {activeTab === "events" && (
                <DataTable
                  isLoading={loading && !!metrics}
                  headers={[
                    "Título",
                    "Organização",
                    "Data",
                    "Voluntários",
                    "Estado",
                    "Ações",
                  ]}
                  rows={filteredEvents.map((event) => ({
                    key: event.id,
                    cells: [
                      event.title,
                      event.organization?.name ?? "—",
                      formatDate(event.date),
                      `${event.volunteersRegistered}/${event.volunteersNeeded}`,
                      event.status,
                      <TableActions
                        key={`actions-${event.id}`}
                        onEdit={() => setEditTarget({ type: "event", event })}
                        onDelete={() =>
                          setDeleteTarget({ type: "event", event })
                        }
                        disableDelete={processingId === event.id}
                      />,
                    ],
                  }))}
                  emptyMessage="Sem eventos recentes para mostrar."
                />
              )}
            </div>
          </>
        )}
      </div>

      {editTarget?.type === "profile" && (
        <EditProfileModal
          profile={editTarget.profile}
          saving={saving}
          onClose={() => setEditTarget(null)}
          onSubmit={(values) => handleSaveProfile(editTarget.profile, values)}
        />
      )}

      {editTarget?.type === "event" && (
        <EditEventModal
          event={editTarget.event}
          saving={saving}
          onClose={() => setEditTarget(null)}
          onSubmit={(values) => handleSaveEvent(editTarget.event, values)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          target={deleteTarget}
          processingId={processingId}
          onClose={() => (processingId ? null : setDeleteTarget(null))}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

type SummaryCardProps = {
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  value: number | string;
  label: string;
};

function SummaryCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
}: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-gray-600 text-sm">{label}</div>
    </div>
  );
}

type TabButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-semibold transition ${
        isActive
          ? "border-b-2 border-emerald-600 text-emerald-600"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );
}

type DataTableRow = {
  key: string;
  cells: ReactNode[];
};

type DataTableProps = {
  isLoading: boolean;
  headers: string[];
  rows: DataTableRow[];
  emptyMessage: string;
};

function DataTable({ isLoading, headers, rows, emptyMessage }: DataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-3 text-sm font-medium text-gray-500">
          A atualizar dados...
        </span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {headers.map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-gray-50">
              {row.cells.map((cell, cellIndex) => {
                const content =
                  cell === null || cell === undefined || cell === ""
                    ? "—"
                    : cell;

                return (
                  <td
                    key={`${row.key}-${cellIndex}`}
                    className={`px-6 py-4 text-sm text-gray-700 ${
                      cellIndex === row.cells.length - 1 ? "text-right" : ""
                    }`}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type TableActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  disableEdit?: boolean;
  disableDelete?: boolean;
};

function TableActions({
  onEdit,
  onDelete,
  disableEdit,
  disableDelete,
}: TableActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disableEdit}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={disableDelete}
          className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </button>
      )}
    </div>
  );
}

type EditProfileModalProps = {
  profile: Profile;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; type: UserRole }) => Promise<void>;
};

function EditProfileModal({
  profile,
  saving,
  onClose,
  onSubmit,
}: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [type, setType] = useState<UserRole>(profile.type);

  useEffect(() => {
    setName(profile.name);
    setType(profile.type);
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ name, type });
  };

  const heading =
    profile.type === "organization"
      ? "Editar organização"
      : "Editar utilizador";

  return (
    <Modal title={heading} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tipo de conta
          </label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as UserRole)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="volunteer">Voluntário</option>
            <option value="organization">Organização</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "A guardar..." : "Guardar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type EditEventModalProps = {
  event: Event;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    status: Event["status"];
    volunteersNeeded: number;
    date?: string | null;
  }) => Promise<void>;
};

function EditEventModal({
  event,
  saving,
  onClose,
  onSubmit,
}: EditEventModalProps) {
  const [title, setTitle] = useState(event.title);
  const [status, setStatus] = useState<Event["status"]>(event.status);
  const [volunteersNeeded, setVolunteersNeeded] = useState(
    event.volunteersNeeded.toString()
  );
  const [date, setDate] = useState<string>(toDateTimeLocalValue(event.date));

  useEffect(() => {
    setTitle(event.title);
    setStatus(event.status);
    setVolunteersNeeded(event.volunteersNeeded.toString());
    setDate(toDateTimeLocalValue(event.date));
  }, [event]);

  const handleSubmit = async (eventForm: FormEvent<HTMLFormElement>) => {
    eventForm.preventDefault();

    const volunteers = Number.parseInt(volunteersNeeded, 10);
    if (!Number.isFinite(volunteers) || volunteers <= 0) {
      toast.error("Indique um número válido de voluntários.");
      return;
    }

    const isoDate = date ? fromDateTimeLocalValue(date) : null;
    if (date && !isoDate) {
      toast.error("Data inválida. Tente novamente.");
      return;
    }

    await onSubmit({
      title,
      status,
      volunteersNeeded: volunteers,
      date: isoDate,
    });
  };

  return (
    <Modal title="Editar evento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Título do evento
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as Event["status"])
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="open">Aberto</option>
              <option value="closed">Fechado</option>
              <option value="completed">Concluído</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Voluntários necessários
            </label>
            <input
              type="number"
              min={1}
              value={volunteersNeeded}
              onChange={(event) => setVolunteersNeeded(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Data do evento
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <p className="text-sm text-gray-500">
            Organização: {event.organization?.name ?? "—"}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "A guardar..." : "Guardar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type ConfirmDeleteDialogProps = {
  target: DeleteTarget;
  processingId: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function ConfirmDeleteDialog({
  target,
  processingId,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const isProfile = target.type === "profile";
  const name = isProfile ? target.profile.name : target.event.title;
  const busyId = isProfile ? target.profile.id : target.event.id;

  return (
    <Modal
      title={isProfile ? "Eliminar perfil" : "Eliminar evento"}
      onClose={onClose}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-rose-100 p-2 text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Tem a certeza de que pretende eliminar{" "}
            <span className="font-semibold text-gray-900">{name}</span>?
          </p>
          <p>Esta ação é permanente e não poderá ser desfeita.</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed"
          disabled={processingId === busyId}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={processingId === busyId}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processingId === busyId ? "A eliminar..." : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
