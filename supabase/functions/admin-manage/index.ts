// deno-lint-ignore-file no-explicit-any
// @ts-expect-error - Deno runtime import
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error - Supabase client import for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.0";

type UserRole = "volunteer" | "organization" | "admin";
type EventStatus = "open" | "closed" | "completed";

type UpdateProfileAction = {
  action: "update_profile";
  id: string;
  name: string;
  type: UserRole;
};

type DeleteProfileAction = {
  action: "delete_profile";
  id: string;
};

type UpdateEventAction = {
  action: "update_event";
  id: string;
  updates: {
    title?: string;
    status?: EventStatus;
    volunteersNeeded?: number;
    date?: string | null;
  };
};

type DeleteEventAction = {
  action: "delete_event";
  id: string;
};

type AdminActionPayload =
  | UpdateProfileAction
  | DeleteProfileAction
  | UpdateEventAction
  | DeleteEventAction;

type JsonResponse = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
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
  body: JsonResponse,
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

async function assertAdmin(
  supabaseUrl: string,
  serviceRoleKey: string,
  jwt: string,
  origin?: string | null
): Promise<{ client: ReturnType<typeof createClient>; adminId: string }> {
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(jwt);

  if (authError || !user) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: "Não autorizado.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...buildCorsHeaders(origin),
        },
      }
    );
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, type")
    .eq("id", user.id)
    .maybeSingle<{ id: string; type: UserRole }>();

  if (profileError) {
    console.error("Erro ao verificar perfil do utilizador", profileError);
    throw new Response(
      JSON.stringify({
        success: false,
        error: "Falha a validar permissões.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...buildCorsHeaders(origin),
        },
      }
    );
  }

  if (!profile || profile.type !== "admin") {
    throw new Response(
      JSON.stringify({
        success: false,
        error: "Não tem permissões para realizar esta ação.",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...buildCorsHeaders(origin),
        },
      }
    );
  }

  return { client, adminId: profile.id };
}

function buildSupabaseErrorResponse(
  error: unknown,
  origin?: string | null
): Response {
  console.error("Admin manage operation failed", error);

  let message = "Ocorreu um erro ao processar o pedido.";

  if (error && typeof error === "object" && "message" in error) {
    const potentialMessage = (error as { message?: unknown }).message;
    if (typeof potentialMessage === "string" && potentialMessage.trim()) {
      message = potentialMessage;
    }
  }

  return jsonResponse(
    400,
    {
      success: false,
      error: message,
    },
    origin
  );
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      405,
      {
        success: false,
        error: "Método não permitido.",
      },
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
      {
        success: false,
        error: "Configuração do Supabase em falta.",
      },
      origin
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(
      401,
      {
        success: false,
        error: "Não autorizado.",
      },
      origin
    );
  }

  const jwt = authHeader.replace("Bearer ", "");

  let payload: AdminActionPayload;
  try {
    payload = (await req.json()) as AdminActionPayload;
  } catch (error) {
    console.warn("JSON inválido recebido", error);
    return jsonResponse(
      400,
      {
        success: false,
        error: "JSON inválido.",
      },
      origin
    );
  }

  if (!payload || typeof payload !== "object" || !("action" in payload)) {
    return jsonResponse(
      400,
      {
        success: false,
        error: "Parâmetros em falta.",
      },
      origin
    );
  }

  let adminClient: ReturnType<typeof createClient>;
  try {
    const { client } = await assertAdmin(
      supabaseUrl,
      serviceRoleKey,
      jwt,
      origin
    );
    adminClient = client;
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Admin verification failed", error);
    return jsonResponse(
      500,
      {
        success: false,
        error: "Falha a validar permissões.",
      },
      origin
    );
  }

  switch (payload.action) {
    case "update_profile": {
      const { id, name, type } = payload;
      if (!id || !name || !type) {
        return jsonResponse(
          400,
          {
            success: false,
            error: "Parâmetros obrigatórios em falta.",
          },
          origin
        );
      }

      try {
        const { data, error } = await adminClient
          .from("profiles")
          .update({
            name,
            type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;
        if (!data) {
          return jsonResponse(
            404,
            {
              success: false,
              error: "Perfil não encontrado.",
            },
            origin
          );
        }

        return jsonResponse(
          200,
          {
            success: true,
            data: { profile: data },
          },
          origin
        );
      } catch (error) {
        return buildSupabaseErrorResponse(error, origin);
      }
    }

    case "delete_profile": {
      const { id } = payload;
      if (!id) {
        return jsonResponse(
          400,
          {
            success: false,
            error: "Parâmetros obrigatórios em falta.",
          },
          origin
        );
      }

      try {
        const { error } = await adminClient
          .from("profiles")
          .delete()
          .eq("id", id);
        if (error) throw error;

        return jsonResponse(
          200,
          {
            success: true,
            data: { profileId: id },
          },
          origin
        );
      } catch (error) {
        return buildSupabaseErrorResponse(error, origin);
      }
    }

    case "update_event": {
      const { id, updates } = payload;
      if (!id || !updates || typeof updates !== "object") {
        return jsonResponse(
          400,
          {
            success: false,
            error: "Parâmetros obrigatórios em falta.",
          },
          origin
        );
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (typeof updates.title === "string") {
        updatePayload.title = updates.title;
      }

      if (updates.status) {
        updatePayload.status = updates.status;
      }

      if (typeof updates.volunteersNeeded === "number") {
        updatePayload.volunteers_needed = updates.volunteersNeeded;
      }

      if (updates.date !== undefined) {
        updatePayload.date = updates.date ?? null;
      }

      try {
        const { data, error } = await adminClient
          .from("events")
          .update(updatePayload)
          .eq("id", id)
          .select(
            `*,
              organization:profiles!events_organization_id_fkey(
                id,
                name,
                email,
                avatar_url,
                bio,
                type
              )`
          )
          .single();

        if (error) throw error;
        if (!data) {
          return jsonResponse(
            404,
            {
              success: false,
              error: "Evento não encontrado.",
            },
            origin
          );
        }

        return jsonResponse(
          200,
          {
            success: true,
            data: { event: data },
          },
          origin
        );
      } catch (error) {
        return buildSupabaseErrorResponse(error, origin);
      }
    }

    case "delete_event": {
      const { id } = payload;
      if (!id) {
        return jsonResponse(
          400,
          {
            success: false,
            error: "Parâmetros obrigatórios em falta.",
          },
          origin
        );
      }

      try {
        const { error } = await adminClient
          .from("events")
          .delete()
          .eq("id", id);
        if (error) throw error;

        return jsonResponse(
          200,
          {
            success: true,
            data: { eventId: id },
          },
          origin
        );
      } catch (error) {
        return buildSupabaseErrorResponse(error, origin);
      }
    }

    default:
      return jsonResponse(
        400,
        {
          success: false,
          error: "Ação não suportada.",
        },
        origin
      );
  }
});
