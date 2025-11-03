// deno-lint-ignore-file no-explicit-any
// @ts-expect-error - Deno runtime import
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error - Supabase client import for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.0";

type EventStatus = "open" | "closed" | "completed";

type EventRow = {
  id: string;
  date: string | null;
  duration: string | null;
  status: EventStatus;
  organization_id: string;
  volunteers_registered: number | null;
  title: string | null;
  post_event_summary: string | null;
  post_event_gallery_urls: string[] | null;
};

type RequestPayload = {
  dryRun?: boolean;
};

type JsonResponseBody = {
  success: boolean;
  error?: string;
  completedEventIds?: string[];
  skippedEventIds?: string[];
  completedCount?: number;
  processedAt?: string;
};

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const baseAllowedHeaders = "authorization, x-client-info, apikey, content-type";

const buildCorsHeaders = (origin?: string | null): Record<string, string> => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Headers": baseAllowedHeaders,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "3600",
});

function jsonResponse(
  status: number,
  body: JsonResponseBody,
  origin?: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(origin),
    },
  });
}

function parseDurationToMinutes(value: string | null | undefined): number {
  if (!value) return 0;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 0;

  const sanitized = trimmed.replace(/,/g, ".");

  const colonMatch = sanitized.match(
    /^(\d{1,3})(?:\s*(?::|h)\s*(\d{1,2}))\s*(?:m(?:in(?:s|utos?)?)?)?$/
  );
  if (colonMatch) {
    const hours = Number.parseInt(colonMatch[1], 10);
    const minutes = Number.parseInt(colonMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Math.max(0, hours * 60 + minutes);
    }
  }

  const normalized = sanitized
    .replace(/(\d)([a-z])/gi, "$1 $2")
    .replace(/([a-z])(\d)/gi, "$1 $2");

  const unitMatches = normalized.matchAll(
    /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hora|horas|hour|hours|m|min|mins|minute|minutes|minuto|minutos)/g
  );

  let totalMinutes = 0;
  for (const match of unitMatches) {
    const [, numericValueString, unit] = match;
    const numericValue = Number.parseFloat(numericValueString);
    if (!Number.isFinite(numericValue)) continue;

    if (/^h|^hr|^hora|^hour/.test(unit)) {
      totalMinutes += numericValue * 60;
    } else {
      totalMinutes += numericValue;
    }
  }

  if (totalMinutes > 0) {
    return Math.max(0, Math.round(totalMinutes));
  }

  const numeric = Number.parseFloat(sanitized);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric * 60)) : 0;
}

function hasEventEnded(event: EventRow, referenceDate: Date): boolean {
  const { date, duration } = event;
  if (!date) return false;

  const start = new Date(date);
  if (Number.isNaN(start.getTime())) {
    return false;
  }

  const durationMinutes = parseDurationToMinutes(duration);
  const endTime =
    durationMinutes > 0
      ? new Date(start.getTime() + durationMinutes * 60_000)
      : start;

  if (Number.isNaN(endTime.getTime())) {
    return false;
  }

  return endTime.getTime() <= referenceDate.getTime();
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      405,
      { success: false, error: "Método não permitido." },
      origin
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase configuration missing", {
      hasUrl: Boolean(supabaseUrl),
      hasServiceKey: Boolean(serviceRoleKey),
    });
    return jsonResponse(
      500,
      { success: false, error: "Configuração do Supabase em falta." },
      origin
    );
  }

  let payload: RequestPayload = {};
  if (req.headers.get("content-length")) {
    try {
      payload = (await req.json()) as RequestPayload;
    } catch (error) {
      console.warn("JSON inválido recebido em process-expired-events", error);
      return jsonResponse(
        400,
        { success: false, error: "JSON inválido." },
        origin
      );
    }
  }

  const dryRun = payload.dryRun ?? false;

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const now = new Date();
  const nowIso = now.toISOString();

  const { data, error } = await client
    .from("events")
    .select(
      "id, date, duration, status, organization_id, volunteers_registered, title, post_event_summary, post_event_gallery_urls"
    )
    .in("status", ["open", "closed"])
    .lte("date", nowIso);

  if (error) {
    console.error("Falha ao obter eventos para atualização automática", error);
    return jsonResponse(
      500,
      { success: false, error: "Falha ao obter eventos." },
      origin
    );
  }

  const candidateEvents = (data ?? []) as EventRow[];

  const completedEventIds: string[] = [];
  const completedEventRows: EventRow[] = [];
  const skippedEventIds: string[] = [];

  for (const event of candidateEvents) {
    if (hasEventEnded(event, now)) {
      completedEventIds.push(event.id);
      completedEventRows.push(event);
    } else {
      skippedEventIds.push(event.id);
    }
  }

  if (dryRun) {
    return jsonResponse(
      200,
      {
        success: true,
        completedEventIds,
        skippedEventIds,
        completedCount: completedEventIds.length,
        processedAt: nowIso,
      },
      origin
    );
  }

  if (completedEventIds.length === 0) {
    return jsonResponse(
      200,
      {
        success: true,
        completedEventIds: [],
        skippedEventIds,
        completedCount: 0,
        processedAt: nowIso,
      },
      origin
    );
  }

  const { error: updateError } = await client
    .from("events")
    .update({
      status: "completed",
      updated_at: nowIso,
    })
    .in("id", completedEventIds);

  if (updateError) {
    console.error(
      "Falha ao atualizar eventos para completed em process-expired-events",
      updateError
    );
    return jsonResponse(
      500,
      { success: false, error: "Falha ao atualizar eventos." },
      origin
    );
  }

  const statsByOrganization = new Map<
    string,
    {
      eventsCompleted: number;
      volunteersImpacted: number;
      volunteerMinutes: number;
      events: { id: string; title: string | null }[];
    }
  >();

  for (const event of completedEventRows) {
    const aggregate = statsByOrganization.get(event.organization_id) ?? {
      eventsCompleted: 0,
      volunteersImpacted: 0,
      volunteerMinutes: 0,
      events: [],
    };

    aggregate.eventsCompleted += 1;
    aggregate.volunteersImpacted += Math.max(
      0,
      event.volunteers_registered ?? 0
    );

    const durationMinutes = parseDurationToMinutes(event.duration);
    if (durationMinutes > 0) {
      aggregate.volunteerMinutes +=
        durationMinutes * Math.max(0, event.volunteers_registered ?? 0);
    }

    aggregate.events.push({ id: event.id, title: event.title });
    statsByOrganization.set(event.organization_id, aggregate);
  }

  for (const [organizationId, aggregate] of statsByOrganization.entries()) {
    try {
      const { data: profileRow, error: profileError } = await client
        .from("profiles")
        .select(
          "stats_events_held, stats_volunteers_impacted, stats_hours_contributed"
        )
        .eq("id", organizationId)
        .maybeSingle<{
          stats_events_held: number | null;
          stats_volunteers_impacted: number | null;
          stats_hours_contributed: number | null;
        }>();

      if (profileError) {
        console.warn(
          "Falha ao obter estatísticas atuais da organização",
          organizationId,
          profileError
        );
        continue;
      }

      const currentEventsHeld = profileRow?.stats_events_held ?? 0;
      const currentVolunteersImpacted =
        profileRow?.stats_volunteers_impacted ?? 0;
      const currentHoursContributed = profileRow?.stats_hours_contributed ?? 0;

      const additionalHours = Math.round(aggregate.volunteerMinutes / 60);

      const { error: statsUpdateError } = await client
        .from("profiles")
        .update({
          stats_events_held: currentEventsHeld + aggregate.eventsCompleted,
          stats_volunteers_impacted:
            currentVolunteersImpacted + aggregate.volunteersImpacted,
          stats_hours_contributed: currentHoursContributed + additionalHours,
          updated_at: nowIso,
        })
        .eq("id", organizationId);

      if (statsUpdateError) {
        console.warn(
          "Falha ao atualizar estatísticas da organização",
          organizationId,
          statsUpdateError
        );
      }
    } catch (error) {
      console.warn(
        "Exceção ao atualizar estatísticas para organização",
        organizationId,
        error
      );
    }
  }

  const notificationsPayload = completedEventRows.map((event) => ({
    user_id: event.organization_id,
    type: "event_reminder" as const,
    title: "Evento concluído",
    message: `O evento "${
      event.title ?? "Sem título"
    }" terminou. Adicione fotografias e um resumo ao seu perfil.`,
    link: `/organization/events/${event.id}/recap`,
    created_at: nowIso,
  }));

  if (notificationsPayload.length > 0) {
    const { error: notificationError } = await client
      .from("notifications")
      .insert(notificationsPayload);

    if (notificationError) {
      console.warn("Falha ao criar notificações pós-evento", notificationError);
    }
  }

  return jsonResponse(
    200,
    {
      success: true,
      completedEventIds,
      skippedEventIds,
      completedCount: completedEventIds.length,
      processedAt: nowIso,
    },
    origin
  );
});
