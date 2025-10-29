// deno-lint-ignore-file
// @ts-expect-error Deno runtime import
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error Supabase client import for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type RequestPayload = {
  dryRun?: boolean;
  targetDate?: string;
};

type EventRow = {
  id: string;
  title: string | null;
  description: string | null;
  date: string | null;
  duration: string | null;
  address: string | null;
  organization?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  applications?: Array<{
    id: string;
    status: string;
    volunteer_id: string;
    volunteer?: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
  }>;
};

type ReminderCandidate = {
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  eventDate: Date;
  eventAddress: string;
  organizationName: string;
  volunteerId: string;
  volunteerEmail: string;
  volunteerName: string;
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (date: Date): string =>
  date.toLocaleString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

const buildEmailContent = (candidate: ReminderCandidate) => {
  const subject = `Lembrete: ${candidate.eventTitle} é amanhã`;
  const formattedDate = formatDateTime(candidate.eventDate);
  const greeting = candidate.volunteerName
    ? `Olá ${candidate.volunteerName},`
    : "Olá,";
  const organizationLine = candidate.organizationName
    ? `<p><strong>Organização:</strong> ${candidate.organizationName}</p>`
    : "";
  const addressLine = candidate.eventAddress
    ? `<p><strong>Local:</strong> ${candidate.eventAddress}</p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>${greeting}</p>
      <p>Lembramos que o evento <strong>${candidate.eventTitle}</strong> acontece amanhã.</p>
      <p><strong>Data e hora:</strong> ${formattedDate}</p>
      ${organizationLine}
      ${addressLine}
      <p>${candidate.eventDescription}</p>
      <p>Obrigado por fazer parte da comunidade ImpactoLocal!</p>
    </div>
  `;

  const textLines = [
    greeting,
    `Lembramos que o evento "${candidate.eventTitle}" acontece amanhã.`,
    `Data e hora: ${formattedDate}`,
    candidate.organizationName
      ? `Organização: ${candidate.organizationName}`
      : undefined,
    candidate.eventAddress ? `Local: ${candidate.eventAddress}` : undefined,
    candidate.eventDescription,
    "Obrigado por fazer parte da comunidade ImpactoLocal!",
  ].filter(Boolean) as string[];

  return {
    subject,
    html,
    text: textLines.join("\n\n"),
  };
};

const sendReminderEmail = async (
  candidate: ReminderCandidate,
  resendApiKey: string,
  fromEmail: string,
  fromName: string
): Promise<{ success: boolean; error?: string }> => {
  const { subject, html, text } = buildEmailContent(candidate);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: [candidate.volunteerEmail],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    let reason = `HTTP ${response.status}`;

    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) {
        reason = data.message;
      }
    } catch (error) {
      console.warn("Falha ao analisar resposta do Resend", error);
    }

    return { success: false, error: reason };
  }

  return { success: true };
};

const buildNotificationMessage = (candidate: ReminderCandidate): string => {
  const formattedDate = formatDateTime(candidate.eventDate);
  return `O evento "${candidate.eventTitle}" decorre amanhã (${formattedDate}).`;
};

const computeReminderWindow = (targetDate: Date | null) => {
  const now = new Date();
  const base = targetDate ?? now;
  const tomorrow = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 1)
  );
  const dayAfter = new Date(
    Date.UTC(
      tomorrow.getUTCFullYear(),
      tomorrow.getUTCMonth(),
      tomorrow.getUTCDate() + 1
    )
  );
  return {
    startIso: tomorrow.toISOString(),
    endIso: dayAfter.toISOString(),
    referenceDate: tomorrow,
  };
};

serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  let payload: RequestPayload = {};
  if (request.headers.get("content-length")) {
    try {
      payload = (await request.json()) as RequestPayload;
    } catch (error) {
      console.warn("JSON inválido recebido em send-event-reminders", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "JSON inválido",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const fromName = Deno.env.get("RESEND_FROM_NAME") ?? "ImpactoLocal";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Configuração do Supabase em falta");
    return new Response(
      JSON.stringify({ success: false, error: "Configuração em falta" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const { startIso, endIso, referenceDate } = computeReminderWindow(
    payload.targetDate ? parseDate(payload.targetDate) : null
  );

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await client
    .from("events")
    .select(
      `id,
       title,
       description,
       date,
       duration,
       address,
       organization:profiles!events_organization_id_fkey(
         id,
         name,
         email
       ),
       applications:applications!inner(
         id,
         status,
         volunteer_id,
         volunteer:profiles!applications_volunteer_id_fkey(
           id,
           name,
           email
         )
       )`
    )
    .in("status", ["open", "closed"])
    .gte("date", startIso)
    .lt("date", endIso)
    .eq("applications.status", "approved");

  if (error) {
    console.error("Falha ao obter eventos para lembretes", error);
    return new Response(
      JSON.stringify({ success: false, error: "Falha ao obter eventos" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const events = (data ?? []) as EventRow[];
  const candidates: ReminderCandidate[] = [];

  for (const event of events) {
    const eventDate = parseDate(event.date);
    if (!eventDate) {
      continue;
    }

    const organizationName = event.organization?.name ?? "Organização";
    const eventTitle = event.title?.trim() || "Evento de voluntariado";
    const eventDescription =
      event.description?.trim() ||
      "Estamos ansiosos por contar com a sua participação.";
    const eventAddress = event.address?.trim() || "Local a confirmar";

    for (const application of event.applications ?? []) {
      if (application.status !== "approved") continue;
      const volunteerEmail = application.volunteer?.email?.trim();
      if (!volunteerEmail) continue;

      candidates.push({
        eventId: event.id,
        eventTitle,
        eventDescription,
        eventDate,
        eventAddress,
        organizationName,
        volunteerId: application.volunteer_id,
        volunteerEmail,
        volunteerName: application.volunteer?.name?.trim() || "",
      });
    }
  }

  if (candidates.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        processed: 0,
        notificationsCreated: 0,
        emailsSent: 0,
        skipped: 0,
        windowStart: startIso,
        windowEnd: endIso,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const links = new Set<string>();
  const volunteerIds = new Set<string>();

  for (const candidate of candidates) {
    links.add(`/events/${candidate.eventId}`);
    volunteerIds.add(candidate.volunteerId);
  }

  const existingSet = new Set<string>();

  if (volunteerIds.size > 0 && links.size > 0) {
    const { data: existingNotifications, error: existingError } = await client
      .from("notifications")
      .select("user_id, link")
      .eq("type", "event_reminder")
      .in("user_id", Array.from(volunteerIds))
      .in("link", Array.from(links));

    if (existingError) {
      console.warn(
        "Falha ao verificar notificações existentes para lembretes",
        existingError
      );
    } else {
      for (const record of existingNotifications ?? []) {
        if (record.user_id && record.link) {
          existingSet.add(`${record.user_id}|${record.link}`);
        }
      }
    }
  }

  const filteredCandidates: ReminderCandidate[] = [];

  for (const candidate of candidates) {
    const link = `/events/${candidate.eventId}`;
    const key = `${candidate.volunteerId}|${link}`;
    if (existingSet.has(key)) {
      continue;
    }
    existingSet.add(key);
    filteredCandidates.push(candidate);
  }

  if (filteredCandidates.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        processed: candidates.length,
        notificationsCreated: 0,
        emailsSent: 0,
        skipped: candidates.length,
        windowStart: startIso,
        windowEnd: endIso,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  if (payload.dryRun) {
    return new Response(
      JSON.stringify({
        success: true,
        processed: candidates.length,
        toNotify: filteredCandidates.length,
        skipped: candidates.length - filteredCandidates.length,
        windowStart: startIso,
        windowEnd: endIso,
        sample: filteredCandidates.slice(0, 3).map((candidate) => ({
          eventId: candidate.eventId,
          eventTitle: candidate.eventTitle,
          volunteerEmail: candidate.volunteerEmail,
        })),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const nowIso = new Date().toISOString();

  let notificationsCreated = 0;
  if (filteredCandidates.length > 0) {
    const notificationPayload = filteredCandidates.map((candidate) => ({
      user_id: candidate.volunteerId,
      type: "event_reminder",
      title: "Lembrete de evento",
      message: buildNotificationMessage(candidate),
      link: `/events/${candidate.eventId}`,
      created_at: nowIso,
    }));

    const { error: notificationError } = await client
      .from("notifications")
      .insert(notificationPayload);

    if (notificationError) {
      console.warn(
        "Falha ao gravar notificações de lembrete",
        notificationError
      );
    } else {
      notificationsCreated = notificationPayload.length;
    }
  }

  let emailsSent = 0;
  let emailFailures = 0;

  if (resendApiKey && fromEmail) {
    for (const candidate of filteredCandidates) {
      const emailResult = await sendReminderEmail(
        candidate,
        resendApiKey,
        fromEmail,
        fromName
      );

      if (emailResult.success) {
        emailsSent += 1;
      } else {
        emailFailures += 1;
        console.warn("Falha ao enviar lembrete por email", {
          volunteer: candidate.volunteerEmail,
          error: emailResult.error,
        });
      }
    }
  } else {
    console.warn("Configuração do Resend em falta. Emails não serão enviados.");
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: candidates.length,
      notificationsCreated,
      emailsSent,
      emailFailures,
      skipped: candidates.length - filteredCandidates.length,
      windowStart: startIso,
      windowEnd: endIso,
      referenceDate: referenceDate.toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
});
