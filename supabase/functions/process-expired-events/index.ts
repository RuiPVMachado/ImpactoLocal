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

  const colonMatch = trimmed.match(/^(\d{1,2})[:h](\d{1,2})$/);
  if (colonMatch) {
    const hours = Number.parseInt(colonMatch[1], 10);
    const minutes = Number.parseInt(colonMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Math.max(0, hours * 60 + minutes);
    }
  }

  let totalMinutes = 0;

  const hourMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*h/);
  if (hourMatch) {
    const hours = Number.parseFloat(hourMatch[1].replace(",", "."));
    if (Number.isFinite(hours)) {
      totalMinutes += Math.max(0, hours * 60);
    }
  }

  const minuteMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*m/);
  if (minuteMatch) {
    const minutes = Number.parseFloat(minuteMatch[1].replace(",", "."));
    if (Number.isFinite(minutes)) {
      totalMinutes += Math.max(0, minutes);
    }
  }

  if (totalMinutes > 0) return totalMinutes;

  const numeric = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(numeric) ? Math.max(0, numeric * 60) : 0;
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

  const dryRun = Boolean(payload?.dryRun);

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
    .select("id, date, duration, status")
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
  const skippedEventIds: string[] = [];

  for (const event of candidateEvents) {
    if (hasEventEnded(event, now)) {
      completedEventIds.push(event.id);
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
