import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Calendar,
  Building,
  Shield,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fetchAdminMetrics } from "../lib/api";
import type { AdminMetrics, Event, Profile } from "../types";

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

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [latestUsers, setLatestUsers] = useState<Profile[]>([]);
  const [latestEvents, setLatestEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const latestOrganizations = useMemo(
    () => latestUsers.filter((profile) => profile.type === "organization"),
    [latestUsers]
  );

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const {
          metrics: metricsData,
          latestUsers: users,
          latestEvents: events,
        } = await fetchAdminMetrics();
        setMetrics(metricsData);
        setLatestUsers(users);
        setLatestEvents(events);
      } catch (error) {
        console.error("Erro ao carregar dados de administração:", error);
        toast.error(
          "Não foi possível carregar os dados administrativos. Tente novamente."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

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

        {loading && !metrics ? (
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

              <div className="mb-6 flex space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquisa rápida (brevemente disponível)"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400"
                    disabled
                  />
                </div>
                <button
                  type="button"
                  disabled
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-400"
                >
                  <Filter className="h-5 w-5" />
                  <span>Filtros</span>
                </button>
              </div>

              {activeTab === "users" && (
                <DataTable
                  isLoading={loading && !!metrics}
                  headers={["Nome", "Email", "Tipo", "Data Registo"]}
                  rows={latestUsers.map((user) => [
                    user.name,
                    user.email,
                    user.type,
                    formatDate(user.createdAt),
                  ])}
                  emptyMessage="Ainda não existem registos suficientes de utilizadores."
                />
              )}

              {activeTab === "organizations" && (
                <DataTable
                  isLoading={loading && !!metrics}
                  headers={["Nome", "Email", "Data Registo"]}
                  rows={latestOrganizations.map((org) => [
                    org.name,
                    org.email,
                    formatDate(org.createdAt),
                  ])}
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
                  ]}
                  rows={latestEvents.map((event) => [
                    event.title,
                    event.organization?.name ?? "—",
                    formatDate(event.date),
                    `${event.volunteersRegistered}/${event.volunteersNeeded}`,
                    event.status,
                  ])}
                  emptyMessage="Sem eventos recentes para mostrar."
                />
              )}
            </div>
          </>
        )}
      </div>
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

type DataTableProps = {
  isLoading: boolean;
  headers: string[];
  rows: Array<string | number>[];
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
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 text-sm text-gray-700">
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
