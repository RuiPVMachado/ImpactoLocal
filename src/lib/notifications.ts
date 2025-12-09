import { supabase } from "./supabase";

/**
 * Wrapper around the send-notification edge function with typed payloads per scenario.
 */

export type NotificationResult = {
  success: boolean;
  error?: string;
};

// ========== Notification Payloads ==========

/**
 * Payload for application approved notification.
 */
interface ApplicationApprovedPayload {
  type: "application_approved";
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  eventDate?: string;
  organizationName?: string;
  organizationEmail?: string;
}

/**
 * Payload for application rejected notification.
 */
interface ApplicationRejectedPayload {
  type: "application_rejected";
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  organizationName?: string;
  organizationEmail?: string;
}

/**
 * Payload for application submitted notification.
 */
interface ApplicationSubmittedPayload {
  type: "application_submitted";
  organizationId: string;
  organizationEmail: string;
  volunteerName: string;
  volunteerEmail: string;
  eventTitle: string;
  eventId?: string;
  applicationId?: string;
  eventDate?: string;
  message?: string;
  hasAttachment?: boolean;
  attachmentName?: string;
}

type NotificationPayload =
  | ApplicationApprovedPayload
  | ApplicationRejectedPayload
  | ApplicationSubmittedPayload;

// ========== Main Function ==========

/**
 * Sends a notification using the Supabase Edge Function.
 * @param payload The notification payload containing type and data.
 * @returns A promise resolving to the notification result.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    // Obter configurações do ambiente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration");
      return {
        success: false,
        error: "Configuração do Supabase em falta",
      };
    }

    // Obter token de autenticação se disponível
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // URL da função
    const functionUrl = `${supabaseUrl}/functions/v1/send-notification`;
    console.log("Sending notification:", {
      type: payload.type,
      url: functionUrl,
    });

    // Fazer o request com fetch direto
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Ler a resposta
      const responseText = await response.text();
      console.log("Function response:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });

      // Parse da resposta
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        return {
          success: false,
          error: `Resposta inválida do servidor: ${responseText.substring(
            0,
            100
          )}`,
        };
      }

      // Verificar se houve erro
      if (!response.ok) {
        console.error("Function returned error:", data);
        return {
          success: false,
          error:
            data.error ||
            `Erro HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Verificar sucesso no payload
      if (data && !data.success) {
        console.error("Notification failed:", data.error);
        return {
          success: false,
          error: data.error || "Falha ao enviar notificação",
        };
      }

      console.log("Notification sent successfully:", data);
      return { success: true };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          console.error("Request timeout");
          return {
            success: false,
            error:
              "A notificação demorou demasiado tempo. Por favor, tente novamente.",
          };
        }

        console.error("Fetch error:", fetchError);
        return {
          success: false,
          error: `Erro de rede: ${fetchError.message}`,
        };
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("Unexpected error sending notification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar notificação",
    };
  }
}

// ========== Helper Functions ==========

export async function notifyApplicationApproved(params: {
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  eventDate?: string;
  organizationName?: string;
  organizationEmail?: string;
}): Promise<NotificationResult> {
  console.log("Notifying approval to:", params.volunteerEmail);

  const result = await sendNotification({
    type: "application_approved",
    ...params,
  });

  if (!result.success) {
    console.warn("Failed to send approval notification:", result.error);
  } else {
    console.log("Approval notification sent successfully");
  }

  return result;
}

export async function notifyApplicationRejected(params: {
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  organizationName?: string;
  organizationEmail?: string;
}): Promise<NotificationResult> {
  console.log("Notifying rejection to:", params.volunteerEmail);

  const result = await sendNotification({
    type: "application_rejected",
    ...params,
  });

  if (!result.success) {
    console.warn("Failed to send rejection notification:", result.error);
  } else {
    console.log("Rejection notification sent successfully");
  }

  return result;
}

export async function notifyApplicationSubmitted(params: {
  organizationId: string;
  organizationEmail: string;
  volunteerName: string;
  volunteerEmail: string;
  eventTitle: string;
  eventId?: string;
  applicationId?: string;
  eventDate?: string;
  message?: string;
  hasAttachment?: boolean;
  attachmentName?: string;
}): Promise<NotificationResult> {
  console.log("Notifying organization:", params.organizationEmail);

  const result = await sendNotification({
    type: "application_submitted",
    ...params,
  });

  if (!result.success) {
    console.warn("Failed to send application notification:", result.error);
  } else {
    console.log("Application notification sent successfully");
  }

  return result;
}
