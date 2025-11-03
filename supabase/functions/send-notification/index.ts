// deno-lint-ignore-file
// @ts-expect-error - Deno runtime import
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error - Supabase client import for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type ApplicationApprovedPayload = {
  type: "application_approved";
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  eventDate?: string;
  organizationName?: string;
  organizationEmail?: string;
};

type ApplicationRejectedPayload = {
  type: "application_rejected";
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  organizationName?: string;
  organizationEmail?: string;
};

type ApplicationSubmittedPayload = {
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
};

type NotificationPayload =
  | ApplicationApprovedPayload
  | ApplicationRejectedPayload
  | ApplicationSubmittedPayload;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isNotificationPayload(
  payload: unknown
): payload is NotificationPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const type = (payload as { type?: unknown }).type;
  if (
    type !== "application_approved" &&
    type !== "application_rejected" &&
    type !== "application_submitted"
  ) {
    return false;
  }

  return true;
}
// ========== Email Templates ==========
const buildApprovedEmail = (
  payload: ApplicationApprovedPayload,
  fromName: string
) => {
  const {
    volunteerName,
    eventTitle,
    eventDate,
    organizationName,
    organizationEmail,
  } = payload;

  const subject = eventTitle
    ? `Candidatura aprovada: ${eventTitle}`
    : "A sua candidatura foi aprovada";

  const greeting = volunteerName ? `Olá ${volunteerName},` : "Olá,";

  const eventLine = eventTitle
    ? `<p>Temos o prazer de informar que a sua candidatura ao evento <strong>${eventTitle}</strong> foi aprovada.</p>`
    : "<p>A sua candidatura foi aprovada.</p>";

  const dateLine = eventDate
    ? `<p><strong>Data e hora:</strong> ${new Date(eventDate).toLocaleString(
        "pt-PT",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )}</p>`
    : "";

  const organizationLine = organizationName
    ? `<p><strong>Organização:</strong> ${organizationName}</p>`
    : "";

  const contactLine = organizationEmail
    ? `<p>Para qualquer questão, pode contactar a organização através de <a href="mailto:${organizationEmail}">${organizationEmail}</a>.</p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>${greeting}</p>
      ${eventLine}
      ${dateLine}
      ${organizationLine}
  <p>A organização irá contactá-lo em breve com mais detalhes. Obrigado por fazer parte da comunidade ImpactoLocal!</p>
      ${contactLine}
      <p>Com os melhores cumprimentos,<br/>${fromName}</p>
    </div>
  `;

  const text = [
    volunteerName ? `Olá ${volunteerName},` : "Olá,",
    eventTitle
      ? `A sua candidatura ao evento "${eventTitle}" foi aprovada.`
      : "A sua candidatura foi aprovada.",
    eventDate
      ? `Data e hora: ${new Date(eventDate).toLocaleString("pt-PT")}`
      : "",
    organizationName ? `Organização: ${organizationName}` : "",
    organizationEmail
      ? `Pode contactar a organização através de ${organizationEmail}.`
      : "",
    "Obrigado por fazer parte da comunidade ImpactoLocal!",
    `Com os melhores cumprimentos,\n${fromName}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject,
    html,
    text,
  };
};

const persistApplicationSubmittedNotification = async (
  payload: ApplicationSubmittedPayload
) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "Missing Supabase configuration, skipping in-app notification creation"
    );
    return;
  }

  try {
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const summaryMessage = payload.volunteerName
      ? `Recebeu uma nova candidatura de ${payload.volunteerName} para "${payload.eventTitle}".`
      : `Recebeu uma nova candidatura para "${payload.eventTitle}".`;

    await client.from("notifications").insert({
      user_id: payload.organizationId,
      type: "application_updated",
      title: "Nova candidatura recebida",
      message: summaryMessage,
      status: "pending",
      link: "/organization/dashboard",
    });
  } catch (error) {
    console.error("Failed to persist in-app notification", error);
  }
};

const buildRejectedEmail = (
  payload: ApplicationRejectedPayload,
  fromName: string
) => {
  const { volunteerName, eventTitle, organizationName, organizationEmail } =
    payload;

  const subject = eventTitle
    ? `Candidatura não aprovada: ${eventTitle}`
    : "Atualização sobre a sua candidatura";

  const greeting = volunteerName ? `Olá ${volunteerName},` : "Olá,";

  const eventLine = eventTitle
    ? `<p>Informamos que a sua candidatura ao evento <strong>${eventTitle}</strong> não foi aprovada neste momento.</p>`
    : "<p>Informamos que a sua candidatura não foi aprovada neste momento.</p>";

  const organizationLine = organizationName
    ? `<p><strong>Organização:</strong> ${organizationName}</p>`
    : "";

  const contactLine = organizationEmail
    ? `<p>Para mais informações, pode contactar a organização através de <a href="mailto:${organizationEmail}">${organizationEmail}</a>.</p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>${greeting}</p>
      ${eventLine}
      ${organizationLine}
  <p>Agradecemos o seu interesse e encorajamos a candidatar-se a outros eventos na plataforma ImpactoLocal.</p>
      ${contactLine}
      <p>Com os melhores cumprimentos,<br/>${fromName}</p>
    </div>
  `;

  const text = [
    volunteerName ? `Olá ${volunteerName},` : "Olá,",
    eventTitle
      ? `A sua candidatura ao evento "${eventTitle}" não foi aprovada neste momento.`
      : "A sua candidatura não foi aprovada neste momento.",
    organizationName ? `Organização: ${organizationName}` : "",
    "Agradecemos o seu interesse e encorajamos a candidatar-se a outros eventos na plataforma ImpactoLocal.",
    organizationEmail ? `Para mais informações: ${organizationEmail}` : "",
    `Com os melhores cumprimentos,\n${fromName}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject,
    html,
    text,
  };
};

const buildApplicationSubmittedEmail = (
  payload: ApplicationSubmittedPayload,
  fromName: string
) => {
  const { volunteerName, volunteerEmail, eventTitle, eventDate, message } =
    payload;

  const subject = eventTitle
    ? `Nova candidatura: ${eventTitle}`
    : "Nova candidatura recebida";

  const dateLine = eventDate
    ? `<p><strong>Data do evento:</strong> ${new Date(eventDate).toLocaleString(
        "pt-PT",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )}</p>`
    : "";

  const messageLine = message
    ? `<p><strong>Mensagem do voluntário:</strong><br/><em>${message}</em></p>`
    : "";

  const attachmentLine = payload.hasAttachment
    ? `<p><strong>Anexo enviado:</strong> ${
        payload.attachmentName ?? "Ficheiro submetido pelo voluntário"
      }</p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Olá,</p>
      <p>Recebeu uma nova candidatura para o evento <strong>${eventTitle}</strong>.</p>
      <p><strong>Voluntário:</strong> ${volunteerName}<br/>
      <strong>Email:</strong> <a href="mailto:${volunteerEmail}">${volunteerEmail}</a></p>
      ${dateLine}
      ${messageLine}
      ${attachmentLine}
      <p>Aceda à sua dashboard para gerir esta candidatura.</p>
      <p>Com os melhores cumprimentos,<br/>${fromName}</p>
    </div>
  `;

  const text = [
    "Olá,",
    `Recebeu uma nova candidatura para o evento "${eventTitle}".`,
    `Voluntário: ${volunteerName}`,
    `Email: ${volunteerEmail}`,
    eventDate
      ? `Data do evento: ${new Date(eventDate).toLocaleString("pt-PT")}`
      : "",
    message ? `Mensagem: ${message}` : "",
    payload.hasAttachment
      ? `Anexo enviado: ${payload.attachmentName ?? "Ficheiro submetido"}`
      : "",
    "Aceda à sua dashboard para gerir esta candidatura.",
    `Com os melhores cumprimentos,\n${fromName}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject,
    html,
    text,
  };
};

// ========== Email Sender ==========
const sendEmail = async (
  payload: NotificationPayload,
  resendApiKey: string,
  fromEmail: string,
  fromName: string
): Promise<Response> => {
  let emailContent;
  let toEmail;

  switch (payload.type) {
    case "application_approved":
      if (!payload.volunteerEmail) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing volunteer email",
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
      emailContent = buildApprovedEmail(payload, fromName);
      toEmail = payload.volunteerEmail;
      break;
    case "application_rejected":
      if (!payload.volunteerEmail) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing volunteer email",
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
      emailContent = buildRejectedEmail(payload, fromName);
      toEmail = payload.volunteerEmail;
      break;
    case "application_submitted":
      if (!payload.organizationEmail) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing organization email",
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
      emailContent = buildApplicationSubmittedEmail(payload, fromName);
      toEmail = payload.organizationEmail;
      break;
    default:
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unsupported notification type",
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

  const { subject, html, text } = emailContent;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch (error) {
    console.warn("Failed to parse Resend response", error);
    responseBody = undefined;
  }

  if (!response.ok) {
    console.error("Resend error", response.status, responseBody);
    let errorMessage = "Failed to send email via Resend";

    if (
      responseBody &&
      typeof responseBody === "object" &&
      "message" in responseBody &&
      typeof (responseBody as { message: unknown }).message === "string"
    ) {
      errorMessage = (responseBody as { message: string }).message;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const messageId =
    responseBody &&
    typeof responseBody === "object" &&
    "id" in responseBody &&
    typeof (responseBody as { id: unknown }).id === "string"
      ? (responseBody as { id: string }).id
      : undefined;

  return new Response(
    JSON.stringify({
      success: true,
      messageId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
};

// ========== Main Handler ==========
serve(async (request: Request) => {
  // Handle CORS preflight
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Invalid JSON payload", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid JSON body",
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

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const fromName = Deno.env.get("RESEND_FROM_NAME") ?? "ImpactoLocal";

  if (!resendApiKey || !fromEmail) {
    console.error("Missing Resend configuration");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Resend configuration is missing",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  if (!isNotificationPayload(payload)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid payload",
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

  if (payload.type === "application_submitted") {
    await persistApplicationSubmittedNotification(payload);
  }

  return sendEmail(payload, resendApiKey, fromEmail, fromName);
});
