// deno-lint-ignore-file no-explicit-any
// @ts-expect-error - Deno runtime import
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error - Supabase client import for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ManageAction = "cancel" | "approve" | "reject" | "reapply";
type ApplicationStatus = "pending" | "approved" | "rejected" | "cancelled";

type JsonResponseBody = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

type ApplicationRow = {
  id: string;
  event_id: string;
  volunteer_id: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  message?: string | null;
  event?: Record<string, unknown> | null;
  volunteer?: Record<string, unknown> | null;
};

type NotificationStatus = "sent" | "failed" | "skipped";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const applicationSelect = `*,
    event:events(
      *,
      organization:profiles!events_organization_id_fkey(
        id,
        name,
        email,
        avatar_url,
        bio,
        type
      )
    ),
    volunteer:profiles!applications_volunteer_id_fkey(
      id,
      name,
      email,
      avatar_url,
      bio,
      type
    )`;

function jsonResponse(status: number, body: JsonResponseBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function resolveStatus(action: ManageAction): ApplicationStatus {
  switch (action) {
    case "cancel":
      return "cancelled";
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "reapply":
      return "pending";
    default:
      return "pending";
  }
}

async function triggerNotificationEmail(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey?: string;
  action: ManageAction;
  application: ApplicationRow;
}): Promise<{ status: NotificationStatus; error: string | null }> {
  const { supabaseUrl, serviceRoleKey, anonKey, action, application } = params;

  const volunteer = application.volunteer as
    | { email?: string | null; name?: string | null }
    | null
    | undefined;
  const event = application.event as
    | {
        title?: string | null;
        date?: string | null;
        organization?: {
          name?: string | null;
          email?: string | null;
        } | null;
      }
    | null
    | undefined;

  const volunteerEmail = volunteer?.email ?? null;

  if (!volunteerEmail) {
    console.log("Skipping email notification, volunteer email missing", {
      applicationId: application.id,
    });
    return {
      status: "skipped",
      error: "O voluntário não tem email associado ao perfil.",
    };
  }

  const payload: Record<string, unknown> = {
    type:
      action === "approve" ? "application_approved" : "application_rejected",
    volunteerEmail,
    volunteerName: volunteer?.name ?? undefined,
    eventTitle: event?.title ?? undefined,
    eventDate: event?.date ?? undefined,
    organizationName: event?.organization?.name ?? undefined,
    organizationEmail: event?.organization?.email ?? undefined,
  };

  const endpoint = `${supabaseUrl}/functions/v1/send-notification`;

  console.log("Triggering notification email", {
    endpoint,
    payloadType: payload.type,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        ...(anonKey ? { apikey: anonKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: { success?: boolean; error?: string } | null = null;

    try {
      data = text
        ? (JSON.parse(text) as { success?: boolean; error?: string })
        : null;
    } catch (parseError) {
      console.warn("Failed to parse send-notification response", parseError);
    }

    if (!response.ok) {
      const errorMessage = data?.error ?? `HTTP ${response.status}`;
      console.error("Notification email request failed", {
        status: response.status,
        text,
      });
      return {
        status: "failed",
        error: errorMessage,
      };
    }

    if (data?.success === false) {
      console.error("Notification email reported failure", data);
      return {
        status: "failed",
        error: data.error ?? "Falha ao enviar notificação.",
      };
    }

    console.log("Notification email sent successfully", {
      applicationId: application.id,
      action,
    });
    return { status: "sent", error: null };
  } catch (error) {
    console.error("Notification email request threw", error);
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

async function createStatusNotification(
  supabaseClient: ReturnType<typeof createClient>,
  application: ApplicationRow,
  status: ApplicationStatus
): Promise<void> {
  try {
    const event = application.event as
      | { id?: string; title?: string | null }
      | null
      | undefined;
    const volunteer = application.volunteer as
      | { id?: string; name?: string | null }
      | null
      | undefined;

    const eventTitle = event?.title ?? "Evento";

    let type = "application_updated";
    let title = "Candidatura atualizada";
    let message = `O estado da sua candidatura ao evento "${eventTitle}" foi atualizado.`;

    if (status === "approved") {
      type = "application_approved";
      title = "Candidatura aprovada";
      message = `A sua candidatura ao evento "${eventTitle}" foi aprovada.`;
    } else if (status === "rejected") {
      type = "application_rejected";
      title = "Candidatura rejeitada";
      message = `A sua candidatura ao evento "${eventTitle}" não foi aceite desta vez.`;
    } else if (status === "cancelled") {
      title = "Candidatura cancelada";
      message = `Cancelou a sua candidatura ao evento "${eventTitle}".`;
    }

    await supabaseClient.from("notifications").insert({
      user_id: volunteer?.id ?? application.volunteer_id,
      type,
      title,
      message,
      status,
      link: event?.id ? `/events/${event.id}` : null,
    });
  } catch (notificationError) {
    console.warn("Failed to persist in-app notification", notificationError);
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      error: "Method not allowed",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration", {
      supabaseUrlPresent: Boolean(supabaseUrl),
      serviceRolePresent: Boolean(serviceRoleKey),
    });
    return jsonResponse(500, {
      success: false,
      error: "Configuração do Supabase em falta.",
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (error) {
    console.warn("Invalid JSON received", error);
    return jsonResponse(400, {
      success: false,
      error: "JSON inválido.",
    });
  }

  const action = body.action as ManageAction | undefined;
  const applicationId = body.applicationId as string | undefined;
  const actorId = body.actorId as string | undefined;
  const message = typeof body.message === "string" ? body.message : null;

  if (!action || !applicationId || !actorId) {
    console.warn("Missing required parameters", {
      action,
      applicationId,
      actorId,
    });
    return jsonResponse(400, {
      success: false,
      error: "Parâmetros obrigatórios em falta.",
    });
  }

  if (!["cancel", "approve", "reject", "reapply"].includes(action)) {
    console.warn("Unsupported action", { action });
    return jsonResponse(400, {
      success: false,
      error: "Ação não suportada.",
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  console.log("Fetching application", { applicationId, action, actorId });

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select(applicationSelect)
    .eq("id", applicationId)
    .maybeSingle<ApplicationRow>();

  if (applicationError) {
    console.error("Failed to load application", applicationError);
    return jsonResponse(500, {
      success: false,
      error: "Não foi possível carregar a candidatura.",
    });
  }

  if (!application) {
    console.warn("Application not found", { applicationId });
    return jsonResponse(404, {
      success: false,
      error: "Candidatura não encontrada.",
    });
  }

  const targetStatus = resolveStatus(action);

  if (
    (action === "cancel" || action === "reapply") &&
    application.volunteer_id !== actorId
  ) {
    console.warn("Volunteer attempted to manage another user's application", {
      applicationId,
      actorId,
      ownerId: application.volunteer_id,
      action,
    });
    return jsonResponse(403, {
      success: false,
      error: "Não tem permissão para gerir esta candidatura.",
    });
  }

  if (action === "approve" || action === "reject") {
    const event = application.event as {
      organization_id?: string | null;
    } | null;
    const organizationId = event?.organization_id ?? null;

    if (!organizationId || organizationId !== actorId) {
      console.warn("Organization mismatch", {
        action,
        actorId,
        organizationId,
      });
      return jsonResponse(403, {
        success: false,
        error: "Não tem permissão para atualizar esta candidatura.",
      });
    }
  }

  if (action === "reapply" && application.status !== "cancelled") {
    console.warn("Reapply attempted on non-cancelled application", {
      applicationId,
      currentStatus: application.status,
    });
    return jsonResponse(400, {
      success: false,
      error: "A candidatura não está cancelada.",
    });
  }

  console.log("Updating application status", {
    applicationId,
    from: application.status,
    to: targetStatus,
  });

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: targetStatus,
    updated_at: now,
  };

  if (action === "reapply") {
    updatePayload.applied_at = now;
    updatePayload.message = message ?? null;
  }

  const { data: updated, error: updateError } = await supabase
    .from("applications")
    .update(updatePayload)
    .eq("id", applicationId)
    .select(applicationSelect)
    .maybeSingle<ApplicationRow>();

  if (updateError) {
    console.error("Failed to update application", updateError);
    return jsonResponse(500, {
      success: false,
      error: "Não foi possível atualizar a candidatura.",
    });
  }

  if (!updated) {
    console.error("Application update returned no data", { applicationId });
    return jsonResponse(500, {
      success: false,
      error: "Erro ao atualizar a candidatura.",
    });
  }

  let notificationStatus: NotificationStatus = "skipped";
  let notificationError: string | null = null;

  if (targetStatus === "approved" || targetStatus === "rejected") {
    const emailResult = await triggerNotificationEmail({
      supabaseUrl,
      serviceRoleKey,
      anonKey,
      action,
      application: updated,
    });
    notificationStatus = emailResult.status;
    notificationError = emailResult.error;

    await createStatusNotification(supabase, updated, targetStatus);
  }

  if (targetStatus === "cancelled") {
    await createStatusNotification(supabase, updated, targetStatus);
  }

  console.log("Application managed successfully", {
    applicationId,
    action,
    status: targetStatus,
    notificationStatus,
  });

  return jsonResponse(200, {
    success: true,
    data: {
      application: updated,
      notificationStatus,
      notificationError,
    },
  });
});
