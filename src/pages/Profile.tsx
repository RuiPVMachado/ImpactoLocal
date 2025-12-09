import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Award,
  CreditCard as Edit,
  Loader2,
  Camera,
  CalendarCheck,
  Target,
  Eye,
  BookOpen,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { fetchVolunteerStatistics } from "../lib/api";
import { fetchOrganizationEvents } from "../lib/events";
import { updateProfile } from "../lib/profiles";
import type { Event, Profile, VolunteerStatistics } from "../types";
import {
  getImageConstraintsDescription,
  removeStorageFileByUrl,
  uploadOrganizationGalleryImage,
  uploadUserAvatar,
  validateImageFile,
} from "../lib/storage";

/**
 * State for the profile form.
 */
type ProfileFormState = {
  name: string;
  phone: string;
  city: string;
  location: string;
  bio: string;
  mission: string;
  vision: string;
  history: string;
  statsEventsHeld: string;
  statsVolunteersImpacted: string;
  statsHoursContributed: string;
  statsBeneficiariesServed: string;
};

type GalleryUpload = {
  file: File;
  previewUrl: string;
};

const MAX_GALLERY_IMAGES = 8;
const COMPLETED_EVENTS_PREVIEW_LIMIT = 3;

const formatStatInput = (value: number | null | undefined): string =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "";

const buildFormStateFromProfile = (
  profile: Profile | null
): ProfileFormState => {
  // Safely extract impact stats with proper null handling
  const impactStats = profile?.impactStats;

  return {
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    city: profile?.city ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
    mission: profile?.mission ?? "",
    vision: profile?.vision ?? "",
    history: profile?.history ?? "",
    statsEventsHeld: formatStatInput(impactStats?.eventsHeld),
    statsVolunteersImpacted: formatStatInput(impactStats?.volunteersImpacted),
    statsHoursContributed: formatStatInput(impactStats?.hoursContributed),
    statsBeneficiariesServed: formatStatInput(impactStats?.beneficiariesServed),
  };
};

/**
 * Profile page component.
 *
 * Allows users (volunteers and organizations) to view and edit their profile information.
 * Handles form state, validation, and submission for profile updates.
 * Displays different form fields based on the user's role.
 *
 * @returns {JSX.Element} The rendered Profile page.
 */
export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormState>(() =>
    buildFormStateFromProfile(user)
  );
  const [stats, setStats] = useState<VolunteerStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatarUrl ?? null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<string[]>(
    user?.galleryUrls ?? []
  );
  const [newGalleryItems, setNewGalleryItems] = useState<GalleryUpload[]>([]);
  const [removedGalleryUrls, setRemovedGalleryUrls] = useState<string[]>([]);
  const galleryObjectUrlsRef = useRef<string[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [completedEventsLoading, setCompletedEventsLoading] = useState(false);
  const [completedEventsError, setCompletedEventsError] = useState<
    string | null
  >(null);
  const [selectedCompletedYear, setSelectedCompletedYear] =
    useState<string>("all");
  const [showAllCompletedEvents, setShowAllCompletedEvents] = useState(false);

  const updateFormField = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K]
  ) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
  };
  const imageConstraintsHint = getImageConstraintsDescription();
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
    setShowAllCompletedEvents(false);
    setSelectedCompletedYear("all");
  }, [completedEvents.length]);

  useEffect(() => {
    let active = true;

    const loadCompletedEvents = async () => {
      if (userType !== "organization" || !userId) {
        if (active) {
          setCompletedEvents([]);
          setCompletedEventsLoading(false);
          setCompletedEventsError(null);
        }
        return;
      }

      setCompletedEventsLoading(true);
      setCompletedEventsError(null);

      try {
        const result = await fetchOrganizationEvents(userId);
        if (!active) {
          return;
        }

        // Handle paginated or array response
        const events = Array.isArray(result) ? result : result.data;

        const completed = events.filter(
          (event) => event.status === "completed"
        );
        completed.sort((a, b) => {
          const aTime = new Date(a.date).getTime();
          const bTime = new Date(b.date).getTime();
          return Number.isFinite(bTime) && Number.isFinite(aTime)
            ? bTime - aTime
            : 0;
        });

        setCompletedEvents(completed);
      } catch (error) {
        console.error("Erro ao carregar eventos concluídos:", error);
        if (active) {
          setCompletedEventsError(
            "Não foi possível carregar os eventos concluídos."
          );
          setCompletedEvents([]);
        }
      } finally {
        if (active) {
          setCompletedEventsLoading(false);
        }
      }
    };

    loadCompletedEvents();

    return () => {
      active = false;
    };
  }, [userId, userType]);

  useEffect(() => {
    if (!user || isEditing) return;

    const newFormData = buildFormStateFromProfile(user);
    setFormData(newFormData);
    setGalleryItems(user.galleryUrls ?? []);

    // Debug log to help identify stats loading issue (can be removed later)
    if (user.type === "organization" && user.impactStats) {
      console.log("Profile updated - Organization stats loaded:", {
        impactStats: user.impactStats,
        formDataStats: {
          eventsHeld: newFormData.statsEventsHeld,
          volunteersImpacted: newFormData.statsVolunteersImpacted,
          hoursContributed: newFormData.statsHoursContributed,
          beneficiariesServed: newFormData.statsBeneficiariesServed,
        },
      });
    }
  }, [user, isEditing]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    setAvatarFile(null);
    setAvatarRemoved(false);
    setAvatarPreview(user?.avatarUrl ?? null);
  }, [isEditing, user?.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      galleryObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      galleryObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (userType === "organization" && !isEditing) {
      void refreshProfile();
    }
  }, [refreshProfile, userType, isEditing]);

  const handleStartEdit = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarRemoved(false);
    setAvatarPreview(user?.avatarUrl ?? null);
    if (user) {
      setFormData(buildFormStateFromProfile(user));
      setGalleryItems(user.galleryUrls ?? []);
    }
    setRemovedGalleryUrls([]);
    galleryObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    galleryObjectUrlsRef.current = [];
    setNewGalleryItems([]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarRemoved(false);
    setAvatarPreview(user?.avatarUrl ?? null);

    if (user) {
      setFormData(buildFormStateFromProfile(user));
      setGalleryItems(user.galleryUrls ?? []);
    }
    galleryObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    galleryObjectUrlsRef.current = [];
    setNewGalleryItems([]);
    setRemovedGalleryUrls([]);
    setIsEditing(false);
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      event.target.value = "";
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);
    setAvatarFile(file);
    setAvatarRemoved(false);
    event.target.value = "";
  };

  const handleRemoveAvatar = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  };

  const handleRestoreAvatar = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarRemoved(false);
    setAvatarFile(null);
    setAvatarPreview(user?.avatarUrl ?? null);
  };

  const handleGalleryFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const availableSlots =
      MAX_GALLERY_IMAGES - (galleryItems.length + newGalleryItems.length);

    if (availableSlots <= 0) {
      toast.error(`A galeria já tem ${MAX_GALLERY_IMAGES} imagens.`);
      event.target.value = "";
      return;
    }

    const uploads: GalleryUpload[] = [];
    let slotsRemaining = availableSlots;

    for (const file of files) {
      if (slotsRemaining <= 0) {
        toast.error(
          `Limite de ${MAX_GALLERY_IMAGES} imagens atingido. Remova uma imagem antes de adicionar novas.`
        );
        break;
      }

      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      galleryObjectUrlsRef.current.push(previewUrl);
      uploads.push({ file, previewUrl });
      slotsRemaining -= 1;
    }

    if (uploads.length > 0) {
      setNewGalleryItems((previous) => [...previous, ...uploads]);
    }

    event.target.value = "";
  };

  const handleRemoveExistingGalleryImage = (url: string) => {
    setGalleryItems((previous) => previous.filter((item) => item !== url));
    if (user?.galleryUrls?.includes(url)) {
      setRemovedGalleryUrls((previous) =>
        previous.includes(url) ? previous : [...previous, url]
      );
    }
  };

  const handleRemoveNewGalleryItem = (previewUrl: string) => {
    setNewGalleryItems((previous) =>
      previous.filter((item) => item.previewUrl !== previewUrl)
    );
    galleryObjectUrlsRef.current = galleryObjectUrlsRef.current.filter(
      (url) => url !== previewUrl
    );
    URL.revokeObjectURL(previewUrl);
  };

  const handleGallerySave = async () => {
    if (userType !== "organization") {
      return;
    }

    if (!userId) {
      toast.error("A sessão expirou. Inicie sessão novamente.");
      return;
    }

    if (newGalleryItems.length === 0) {
      toast.error("Selecione pelo menos uma imagem para guardar.");
      return;
    }

    const currentEmail = user?.email?.trim() ?? "";
    if (!currentEmail) {
      toast.error("O email associado à conta é obrigatório.");
      return;
    }

    const currentName = formData.name.trim() || user?.name?.trim() || "";
    if (!currentName) {
      toast.error("O nome é obrigatório para atualizar a galeria.");
      return;
    }

    setGallerySaving(true);
    const uploadedGalleryUrls: string[] = [];

    try {
      for (const item of newGalleryItems) {
        const uploadedUrl = await uploadOrganizationGalleryImage({
          organizationId: userId,
          file: item.file,
        });
        uploadedGalleryUrls.push(uploadedUrl);
      }

      const trimmedPhone = formData.phone.trim();
      const trimmedCity = formData.city.trim();
      const trimmedLocation = formData.location.trim();
      const trimmedBio = formData.bio.trim();
      const trimmedMission = formData.mission.trim();
      const trimmedVision = formData.vision.trim();
      const trimmedHistory = formData.history.trim();

      const updated = await updateProfile({
        id: userId,
        name: currentName,
        email: currentEmail,
        phone: trimmedPhone ? trimmedPhone : null,
        city: trimmedCity ? trimmedCity : null,
        location: trimmedLocation ? trimmedLocation : null,
        bio: trimmedBio ? trimmedBio : null,
        mission: trimmedMission ? trimmedMission : null,
        vision: trimmedVision ? trimmedVision : null,
        history: trimmedHistory ? trimmedHistory : null,
        galleryUrls: [...galleryItems, ...uploadedGalleryUrls],
      });

      await refreshProfile();

      setFormData(buildFormStateFromProfile(updated));
      setGalleryItems(updated.galleryUrls ?? []);
      setNewGalleryItems([]);
      setRemovedGalleryUrls([]);
      galleryObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      galleryObjectUrlsRef.current = [];

      toast.success("Galeria atualizada com sucesso.");
    } catch (error) {
      if (uploadedGalleryUrls.length > 0) {
        uploadedGalleryUrls.forEach((url) => {
          void removeStorageFileByUrl(url).catch((cleanupError) => {
            console.warn(
              "Falha ao remover imagem recém-carregada da galeria",
              cleanupError
            );
          });
        });
      }

      console.error("Erro ao atualizar galeria:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a galeria.";
      toast.error(message);
    } finally {
      setGallerySaving(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("A sessão expirou. Inicie sessão novamente.");
      return;
    }

    const trimmedName = formData.name.trim();
    const currentEmail = user?.email?.trim() ?? "";

    if (!trimmedName) {
      toast.error("O nome é obrigatório.");
      return;
    }

    if (!currentEmail) {
      toast.error("O email associado à conta é obrigatório.");
      return;
    }

    const trimmedMission = formData.mission.trim();
    const trimmedVision = formData.vision.trim();
    const trimmedHistory = formData.history.trim();
    const trimmedCity = formData.city.trim();

    let parsedEventsHeld: number | null = null;
    let parsedVolunteersImpacted: number | null = null;
    let parsedHoursContributed: number | null = null;
    let parsedBeneficiariesServed: number | null = null;

    const parseStatInput = (value: string, label: string): number | null => {
      const normalized = value.trim();
      if (!normalized) return null;
      const parsed = Number.parseFloat(normalized.replace(",", "."));
      if (!Number.isFinite(parsed)) {
        throw new Error(`Introduza um valor numérico válido para ${label}.`);
      }
      const rounded = Math.round(parsed);
      if (rounded < 0) {
        throw new Error(`${label} não pode ser negativo.`);
      }
      // Allow 0 as a valid value (don't return null for 0)
      return rounded;
    };

    if (isOrganization) {
      try {
        parsedEventsHeld = parseStatInput(
          formData.statsEventsHeld,
          "eventos realizados"
        );
        parsedVolunteersImpacted = parseStatInput(
          formData.statsVolunteersImpacted,
          "voluntários impactados"
        );
        parsedHoursContributed = parseStatInput(
          formData.statsHoursContributed,
          "horas de voluntariado"
        );
        parsedBeneficiariesServed = parseStatInput(
          formData.statsBeneficiariesServed,
          "beneficiários apoiados"
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Valor numérico inválido nas estatísticas.";
        toast.error(message);
        return;
      }
    }

    setSaving(true);

    const previousAvatarUrl = user?.avatarUrl ?? null;
    let uploadedAvatarUrl: string | null = null;
    const uploadedGalleryUrls: string[] = [];

    try {
      let avatarUrlToPersist = previousAvatarUrl;

      if (avatarRemoved && !avatarFile) {
        avatarUrlToPersist = null;
      }

      if (avatarFile) {
        uploadedAvatarUrl = await uploadUserAvatar(userId, avatarFile);
        avatarUrlToPersist = uploadedAvatarUrl;
      }

      if (isOrganization && newGalleryItems.length > 0) {
        for (const item of newGalleryItems) {
          const uploadedUrl = await uploadOrganizationGalleryImage({
            organizationId: userId,
            file: item.file,
          });
          uploadedGalleryUrls.push(uploadedUrl);
        }
      }

      const updated = await updateProfile({
        id: userId,
        name: trimmedName,
        email: currentEmail,
        phone: formData.phone.trim() ? formData.phone.trim() : null,
        city: trimmedCity ? trimmedCity : null,
        location: formData.location.trim() ? formData.location.trim() : null,
        bio: formData.bio.trim() ? formData.bio.trim() : null,
        avatarUrl: avatarUrlToPersist,
        ...(isOrganization
          ? {
              mission: trimmedMission || null,
              vision: trimmedVision || null,
              history: trimmedHistory || null,
              galleryUrls: [...galleryItems, ...uploadedGalleryUrls],
              impactStats: {
                eventsHeld: parsedEventsHeld,
                volunteersImpacted: parsedVolunteersImpacted,
                hoursContributed: parsedHoursContributed,
                beneficiariesServed: parsedBeneficiariesServed,
              },
            }
          : {}),
      });

      setFormData(buildFormStateFromProfile(updated));
      setGalleryItems(updated.galleryUrls ?? []);
      setNewGalleryItems([]);
      setRemovedGalleryUrls([]);
      galleryObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      galleryObjectUrlsRef.current = [];

      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarFile(null);
      setAvatarRemoved(false);
      setAvatarPreview(updated.avatarUrl ?? null);

      // Refresh profile to update the user context with latest data including stats
      await refreshProfile();
      // Small delay to ensure database write is complete before refreshing
      await new Promise((resolve) => setTimeout(resolve, 300));
      await refreshProfile();

      toast.success("Perfil atualizado com sucesso.");
      setIsEditing(false);

      const shouldRemovePreviousAvatar =
        previousAvatarUrl &&
        (avatarRemoved ||
          (uploadedAvatarUrl && previousAvatarUrl !== uploadedAvatarUrl));

      if (shouldRemovePreviousAvatar) {
        void removeStorageFileByUrl(previousAvatarUrl).catch((error) => {
          console.warn("Falha ao remover avatar antigo", error);
        });
      }

      if (removedGalleryUrls.length > 0) {
        removedGalleryUrls.forEach((url) => {
          void removeStorageFileByUrl(url).catch((error) => {
            console.warn("Falha ao remover imagem da galeria", error);
          });
        });
      }
    } catch (error) {
      if (uploadedAvatarUrl) {
        void removeStorageFileByUrl(uploadedAvatarUrl).catch((cleanupError) => {
          console.warn("Falha ao remover avatar recém-carregado", cleanupError);
        });
      }

      if (uploadedGalleryUrls.length > 0) {
        uploadedGalleryUrls.forEach((url) => {
          void removeStorageFileByUrl(url).catch((cleanupError) => {
            console.warn(
              "Falha ao remover imagem recém-carregada da galeria",
              cleanupError
            );
          });
        });
      }

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
  const isOrganization = userType === "organization";
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

  const completedEventsShowcase = useMemo(() => {
    return completedEvents.filter((event) => {
      const hasSummary =
        typeof event.postEventSummary === "string" &&
        event.postEventSummary.trim().length > 0;
      const hasGallery = Array.isArray(event.postEventGalleryUrls)
        ? event.postEventGalleryUrls.length > 0
        : false;
      return hasSummary || hasGallery;
    });
  }, [completedEvents]);

  const completedEventYears = useMemo(() => {
    const years = new Set<string>();
    completedEventsShowcase.forEach((event) => {
      const date = new Date(event.date);
      if (!Number.isNaN(date.getTime())) {
        years.add(String(date.getFullYear()));
      }
    });
    return Array.from(years).sort(
      (first, second) => Number(second) - Number(first)
    );
  }, [completedEventsShowcase]);

  useEffect(() => {
    if (
      selectedCompletedYear !== "all" &&
      !completedEventYears.includes(selectedCompletedYear)
    ) {
      setSelectedCompletedYear("all");
    }
  }, [completedEventYears, selectedCompletedYear]);

  useEffect(() => {
    setShowAllCompletedEvents(false);
  }, [selectedCompletedYear]);

  const filteredCompletedEvents = useMemo(() => {
    if (selectedCompletedYear === "all") {
      return completedEventsShowcase;
    }
    return completedEventsShowcase.filter((event) => {
      const date = new Date(event.date);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      return String(date.getFullYear()) === selectedCompletedYear;
    });
  }, [completedEventsShowcase, selectedCompletedYear]);

  const displayedCompletedEvents = useMemo(() => {
    if (showAllCompletedEvents) {
      return filteredCompletedEvents;
    }
    return filteredCompletedEvents.slice(0, COMPLETED_EVENTS_PREVIEW_LIMIT);
  }, [filteredCompletedEvents, showAllCompletedEvents]);

  const hasMoreCompletedEvents = useMemo(
    () => filteredCompletedEvents.length > COMPLETED_EVENTS_PREVIEW_LIMIT,
    [filteredCompletedEvents]
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600 sm:h-32"></div>

          <div className="px-4 pb-6 pt-12 sm:px-8 sm:pb-8 sm:pt-10">
            <div className="mb-6 flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:justify-between md:text-left">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative -mt-16 sm:-mt-18 md:-mt-20">
                  <div className="mx-auto rounded-full bg-white p-1.5 shadow-md sm:mx-0 sm:p-2">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Foto de perfil"
                        loading="lazy"
                        decoding="async"
                        className="h-24 w-24 rounded-full object-cover sm:h-28 sm:w-28 md:h-32 md:w-32"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 sm:h-28 sm:w-28 md:h-32 md:w-32">
                        <User className="h-14 w-14 text-emerald-600 sm:h-16 sm:w-16" />
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-white transition hover:bg-emerald-700 sm:-bottom-1 sm:-right-1">
                      <Camera className="h-5 w-5" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  )}
                </div>
                <div className="space-y-2 pt-4 text-center sm:pt-0 sm:text-left">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {formData.name || "Perfil"}
                  </h2>
                  {isEditing && (
                    <p className="text-sm text-gray-500">
                      {avatarRemoved
                        ? "A foto será removida quando guardar."
                        : imageConstraintsHint}
                    </p>
                  )}
                  {isEditing &&
                    (avatarPreview || user?.avatarUrl) &&
                    !avatarRemoved && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Remover foto
                      </button>
                    )}
                  {isEditing && avatarRemoved && user?.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRestoreAvatar}
                      className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Repor foto atual
                    </button>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar Perfil</span>
                </button>
              ) : (
                <div className="flex flex-wrap justify-center gap-3 md:justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="rounded-lg border border-gray-300 px-4 py-2 transition hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
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
                    onChange={(event) =>
                      updateFormField("name", event.target.value)
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
                <div className="flex items-start space-x-3 text-gray-900">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block">
                      {user?.email || "Sem email disponível"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) =>
                      updateFormField("phone", event.target.value)
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
                    onChange={(event) =>
                      updateFormField("location", event.target.value)
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
                  Cidade
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(event) =>
                      updateFormField("city", event.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <span>{formData.city || "Adicionar cidade"}</span>
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
                    onChange={(event) =>
                      updateFormField("bio", event.target.value)
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

              {isOrganization && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-1">
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Missão
                        </label>
                        <textarea
                          value={formData.mission}
                          onChange={(event) =>
                            updateFormField("mission", event.target.value)
                          }
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </>
                    ) : (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                          <Target className="h-4 w-4" />
                          <span>Missão</span>
                        </div>
                        <p className="mt-2 text-gray-900 whitespace-pre-line">
                          {formData.mission ||
                            "Partilhe a missão da sua organização."}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-1">
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Visão
                        </label>
                        <textarea
                          value={formData.vision}
                          onChange={(event) =>
                            updateFormField("vision", event.target.value)
                          }
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </>
                    ) : (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                          <Eye className="h-4 w-4" />
                          <span>Visão</span>
                        </div>
                        <p className="mt-2 text-gray-900 whitespace-pre-line">
                          {formData.vision ||
                            "Descreva a visão para o impacto futuro."}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          História
                        </label>
                        <textarea
                          value={formData.history}
                          onChange={(event) =>
                            updateFormField("history", event.target.value)
                          }
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </>
                    ) : (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                          <BookOpen className="h-4 w-4" />
                          <span>História</span>
                        </div>
                        <p className="mt-2 text-gray-900 whitespace-pre-line">
                          {formData.history ||
                            "Conte a história e conquistas da organização."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {isVolunteer && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center space-x-2 mb-6">
                <Award className="h-6 w-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Estatísticas
                </h2>
              </div>

              {statsLoading ? (
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
                      Ainda não submeteu candidaturas. Candidate-se a eventos
                      para gerar estatísticas.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {isOrganization && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center space-x-2 mb-6">
                <CalendarCheck className="h-6 w-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Eventos concluídos
                </h2>
              </div>

              {completedEventsLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  <span>A carregar eventos concluídos...</span>
                </div>
              ) : completedEventsError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {completedEventsError}
                </div>
              ) : filteredCompletedEvents.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-gray-600">
                      A mostrar {displayedCompletedEvents.length} de{" "}
                      {filteredCompletedEvents.length} relatos partilhados
                      {selectedCompletedYear !== "all"
                        ? ` em ${selectedCompletedYear}`
                        : ""}
                      .
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {completedEventYears.length > 0 && (
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Filtrar por ano
                          <select
                            id="completed-events-year"
                            value={selectedCompletedYear}
                            onChange={(event) =>
                              setSelectedCompletedYear(event.target.value)
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-emerald-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                          >
                            <option value="all">Todos</option>
                            {completedEventYears.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {hasMoreCompletedEvents && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllCompletedEvents((previous) => !previous)
                          }
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          {showAllCompletedEvents
                            ? "Ver menos"
                            : `Ver todos (${filteredCompletedEvents.length})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {displayedCompletedEvents.map((event) => {
                    const eventDate = new Date(event.date);
                    const hasValidDate = !Number.isNaN(eventDate.getTime());
                    const dateLabel = hasValidDate
                      ? eventDate.toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Data por confirmar";
                    const timeLabel = hasValidDate
                      ? eventDate.toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null;
                    const gallery = Array.isArray(event.postEventGalleryUrls)
                      ? event.postEventGalleryUrls
                      : [];

                    return (
                      <div
                        key={event.id}
                        className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {event.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {dateLabel}
                              {timeLabel ? ` · ${timeLabel}` : ""}
                            </p>
                            <p className="text-sm text-gray-600">
                              Local: {event.location.address}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/organization/events/${event.id}/edit`)
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Atualizar relato
                          </button>
                        </div>

                        {event.postEventSummary &&
                          event.postEventSummary.trim().length > 0 && (
                            <p className="text-gray-700 whitespace-pre-line">
                              {event.postEventSummary.trim()}
                            </p>
                          )}

                        {gallery.length > 0 && (
                          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            {gallery.map((url) => (
                              <div
                                key={url}
                                className="overflow-hidden rounded-lg shadow-sm"
                              >
                                <img
                                  src={url}
                                  alt={`Fotografia do evento ${event.title}`}
                                  className="h-36 w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {hasMoreCompletedEvents && !showAllCompletedEvents && (
                    <button
                      type="button"
                      onClick={() => setShowAllCompletedEvents(true)}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Ver mais eventos concluídos
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                  {selectedCompletedYear === "all" ? (
                    <>
                      Assim que concluir um evento, adicione um resumo e
                      fotografias na página de gestão de eventos para partilhar
                      o impacto aqui no perfil público.
                      <button
                        type="button"
                        onClick={() => navigate("/organization/events")}
                        className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Gerir eventos
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Não foram encontrados eventos concluídos em{" "}
                        {selectedCompletedYear}.
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCompletedYear("all")}
                        className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Limpar filtro
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isOrganization && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center space-x-2 mb-6">
                <ImagePlus className="h-6 w-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Galeria da Organização
                </h2>
              </div>

              <div className="mb-6 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-4">
                <label className="flex flex-col gap-3 cursor-pointer sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white p-3 shadow-sm">
                      <ImagePlus className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        Adicionar imagens à galeria
                      </p>
                      <p className="text-xs text-emerald-600">
                        Até {MAX_GALLERY_IMAGES} imagens · JPG, PNG, WEBP
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-600 shadow-sm">
                    Selecionar imagens
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleGalleryFilesChange}
                  />
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  {galleryItems.length + newGalleryItems.length} /{" "}
                  {MAX_GALLERY_IMAGES} imagens na galeria.
                </p>
                {!isEditing && newGalleryItems.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-emerald-700">
                      {newGalleryItems.length === 1
                        ? "1 nova imagem pronta para guardar."
                        : `${newGalleryItems.length} novas imagens prontas para guardar.`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGallerySave}
                        disabled={gallerySaving}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {gallerySaving ? (
                          <span className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>A guardar...</span>
                          </span>
                        ) : (
                          "Guardar imagens"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {galleryItems.length === 0 && newGalleryItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
                  Ainda não adicionou imagens. Utilize o botão acima para
                  carregar as primeiras fotos.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {galleryItems.map((url) => (
                    <div
                      key={url}
                      className="relative overflow-hidden rounded-lg shadow-sm"
                    >
                      <img
                        src={url}
                        alt="Imagem da galeria"
                        className="h-48 w-full object-cover"
                      />
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingGalleryImage(url)}
                          className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-rose-600 shadow-md transition hover:bg-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {newGalleryItems.map((item) => (
                    <div
                      key={item.previewUrl}
                      className="relative overflow-hidden rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50"
                    >
                      <img
                        src={item.previewUrl}
                        alt="Nova imagem da galeria"
                        className="h-48 w-full object-cover opacity-90"
                      />
                      <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
                        Novo
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveNewGalleryItem(item.previewUrl)
                        }
                        className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-rose-600 shadow-md transition hover:bg-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
