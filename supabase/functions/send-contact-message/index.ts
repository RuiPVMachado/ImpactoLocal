// deno-lint-ignore-file
// @ts-expect-error - Deno runtime import
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type ContactPayload = {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const isValidEmail = (email: string): boolean => {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const buildEmailContent = (
  payload: ContactPayload
): { subject: string; html: string; text: string } => {
  const { name, email, subject, message } = payload;

  const finalSubject =
    subject && subject.length > 0
      ? `Contacto: ${subject}`
      : `Nova mensagem de ${name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p style="font-size: 16px;">Olá equipa ImpactoLocal,</p>
      <p style="font-size: 15px;">Recebeu uma nova mensagem de contacto através da plataforma.</p>
      <div style="margin-top: 16px; padding: 16px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0; font-weight: 600; color: #047857;">Detalhes do remetente</p>
        <p style="margin: 4px 0 0 0;"><strong>Nome:</strong> ${name}</p>
        <p style="margin: 4px 0 0 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #047857;">${email}</a></p>
        ${
          subject && subject.length > 0
            ? `<p style="margin: 4px 0 0 0;"><strong>Assunto:</strong> ${subject}</p>`
            : ""
        }
      </div>
      <div style="margin-top: 24px;">
        <p style="font-weight: 600; color: #111827;">Mensagem:</p>
        <blockquote style="margin: 12px 0 0 0; padding-left: 16px; border-left: 4px solid #10b981; color: #4b5563;">${message
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
          .join("<br/>")}</blockquote>
      </div>
    </div>
  `;

  const textLines = [
    "Olá equipa ImpactoLocal,",
    "Recebeu uma nova mensagem de contacto na plataforma.",
    `Nome: ${name}`,
    `Email: ${email}`,
    subject && subject.length > 0 ? `Assunto: ${subject}` : undefined,
    "Mensagem:",
    message,
  ].filter(Boolean) as string[];

  return {
    subject: finalSubject,
    html,
    text: textLines.join("\n\n"),
  };
};

const sendEmail = async (
  payload: ContactPayload,
  resendApiKey: string,
  fromEmail: string,
  fromName: string,
  recipientEmail: string
): Promise<Response> => {
  const { subject, html, text } = buildEmailContent(payload);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: [recipientEmail],
      subject,
      html,
      text,
      reply_to: payload.email,
    }),
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch (error) {
    console.warn("Falha ao analisar resposta do Resend", error);
    responseBody = undefined;
  }

  if (!response.ok) {
    console.error("Resend devolveu erro", response.status, responseBody);
    let errorMessage = "Falha ao enviar email";

    if (
      responseBody &&
      typeof responseBody === "object" &&
      "message" in responseBody &&
      typeof (responseBody as { message?: unknown }).message === "string"
    ) {
      errorMessage = (
        (responseBody as { message: string }).message || errorMessage
      ).trim();
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
    typeof (responseBody as { id?: unknown }).id === "string"
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

serve(async (request: Request) => {
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
    console.error("JSON inválido recebido", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Corpo do pedido inválido",
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

  const name = normalizeString((payload as ContactPayload | undefined)?.name);
  const email = normalizeString((payload as ContactPayload | undefined)?.email);
  const subject = normalizeString(
    (payload as ContactPayload | undefined)?.subject ?? ""
  );
  const message = normalizeString(
    (payload as ContactPayload | undefined)?.message
  );

  if (!name || name.length < 2) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "O nome é obrigatório.",
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

  if (!isValidEmail(email)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Email inválido.",
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

  if (!message || message.length < 10) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "A mensagem deve ter pelo menos 10 caracteres.",
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
  const recipientEmail =
    Deno.env.get("CONTACT_RECIPIENT_EMAIL") ?? "ruipedromachado04@gmail.com";

  if (!resendApiKey || !fromEmail) {
    console.error("Configuração do Resend em falta");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Configuração de email em falta.",
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

  const sanitizedPayload: ContactPayload = {
    name,
    email,
    subject: subject.length > 0 ? subject : null,
    message,
  };

  return sendEmail(
    sanitizedPayload,
    resendApiKey,
    fromEmail,
    fromName,
    recipientEmail
  );
});
