import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  CreditCard as Edit,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { fetchVolunteerStatistics, updateProfile } from "../lib/api";
import type { VolunteerStatistics } from "../types";

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    location: user?.location || "",
    bio: user?.bio || "",
  });
  const [stats, setStats] = useState<VolunteerStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const userId = user?.id ?? null;
  const userType = user?.type ?? null;

  useEffect(() => {
    let active = true;

    const loadStatistics = async () => {
      if (!userId || userType !== "volunteer") {
        if (active) {
          setStats(null);
          setStatsLoading(false);
          setStatsError(null);
        }
        return;
      }

      setStatsLoading(true);
      setStatsError(null);

      try {
        const data = await fetchVolunteerStatistics(userId);
        if (active) {
          setStats(data);
        }
      } catch (error) {
        console.error("Erro ao carregar estatísticas do voluntário:", error);
        if (active) {
          setStatsError("Não foi possível carregar as estatísticas.");
          setStats(null);
        }
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    loadStatistics();

    return () => {
      active = false;
    };
  }, [userId, userType]);

  useEffect(() => {
    if (!user || isEditing) return;

    setFormData({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      location: user.location ?? "",
      bio: user.bio ?? "",
    });
  }, [user, isEditing]);

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        location: user.location ?? "",
        bio: user.bio ?? "",
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("A sessão expirou. Inicie sessão novamente.");
      return;
    }

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedName) {
      toast.error("O nome é obrigatório.");
      return;
    }

    if (!trimmedEmail) {
      toast.error("O email é obrigatório.");
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProfile({
        id: userId,
        name: trimmedName,
        email: trimmedEmail,
        phone: formData.phone.trim() ? formData.phone.trim() : null,
        location: formData.location.trim() ? formData.location.trim() : null,
        bio: formData.bio.trim() ? formData.bio.trim() : null,
      });

      setFormData({
        name: updated.name ?? "",
        email: updated.email ?? "",
        phone: updated.phone ?? "",
        location: updated.location ?? "",
        bio: updated.bio ?? "",
      });

      await refreshProfile();
      toast.success("Perfil atualizado com sucesso.");
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o perfil.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isVolunteer = userType === "volunteer";
  const baseStats: VolunteerStatistics = stats ?? {
    totalVolunteerHours: 0,
    eventsAttended: 0,
    eventsCompleted: 0,
    participationRate: 0,
    totalApplications: 0,
  };

  const formatInteger = (value: number) =>
    value.toLocaleString("pt-PT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const formatHoursDisplay = (hours: number) => {
    const hasFraction = Math.abs(hours % 1) > 0.0001;
    return `${hours.toLocaleString("pt-PT", {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: 1,
    })} h`;
  };

  const participationDisplay = `${Math.round(
    Math.min(1, Math.max(0, baseStats.participationRate)) * 100
  ).toLocaleString("pt-PT")}%`;

  const statCards = [
    {
      label: "Eventos Participados",
      value: formatInteger(baseStats.eventsAttended),
      bgClass: "bg-emerald-50",
      valueClass: "text-emerald-600",
    },
    {
      label: "Horas de Voluntariado",
      value: formatHoursDisplay(baseStats.totalVolunteerHours),
      bgClass: "bg-teal-50",
      valueClass: "text-teal-600",
    },
    {
      label: "Eventos Concluídos",
      value: formatInteger(baseStats.eventsCompleted),
      bgClass: "bg-cyan-50",
      valueClass: "text-cyan-600",
    },
    {
      label: "Taxa de Participação",
      value: participationDisplay,
      bgClass: "bg-indigo-50",
      valueClass: "text-indigo-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>

          <div className="px-8 pb-8">
            <div className="flex items-end justify-between -mt-16 mb-6">
              <div className="bg-white p-2 rounded-full">
                <div className="bg-emerald-100 w-32 h-32 rounded-full flex items-center justify-center">
                  <User className="h-16 w-16 text-emerald-600" />
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar Perfil</span>
                </button>
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>A guardar...</span>
                      </span>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="text-lg">
                      {formData.name || "Adicionar nome"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span>{formData.email || "Adicionar email"}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span>{formData.phone || "Adicionar contacto"}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localização
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span>{formData.location || "Adicionar localização"}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">
                    {formData.bio || "Partilhe um pouco sobre si."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center space-x-2 mb-6">
            <Award className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-gray-900">Estatísticas</h2>
          </div>

          {isVolunteer ? (
            statsLoading ? (
              <div className="space-y-6">
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 rounded-lg bg-gray-100 animate-pulse"
                    ></div>
                  ))}
                </div>
              </div>
            ) : statsError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center text-rose-700">
                {statsError}
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {statCards.map((card) => (
                    <div
                      key={card.label}
                      className={`text-center p-4 rounded-lg ${card.bgClass}`}
                    >
                      <div
                        className={`text-3xl font-bold ${card.valueClass} mb-2`}
                      >
                        {card.value}
                      </div>
                      <div className="text-gray-600">{card.label}</div>
                    </div>
                  ))}
                </div>
                {baseStats.totalApplications > 0 ? (
                  <p className="mt-6 text-sm text-gray-500 text-center md:text-left">
                    Baseado em{` `}
                    <span className="font-semibold text-gray-700">
                      {formatInteger(baseStats.totalApplications)}
                    </span>{" "}
                    candidaturas.
                  </p>
                ) : (
                  <p className="mt-6 text-sm text-gray-500 text-center md:text-left">
                    Ainda não submeteu candidaturas. Candidate-se a eventos para
                    gerar estatísticas.
                  </p>
                )}
              </>
            )
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-gray-600">
              Estatísticas dinâmicas disponíveis apenas para voluntários.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
