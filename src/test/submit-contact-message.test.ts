import { describe, it, expect, vi, afterEach } from "vitest";

type InvokeResult = {
  data: unknown;
  error: unknown;
};

const defaultSuccessResponse: InvokeResult = {
  data: { success: true, messageId: "msg-1" },
  error: null,
};

async function setupSubmitContactMessage(
  invokeResult: InvokeResult = defaultSuccessResponse
) {
  vi.resetModules();
  const invokeMock = vi.fn(async () => invokeResult);

  vi.doMock("../lib/supabase", () => ({
    supabase: {
      functions: {
        invoke: invokeMock,
      },
    },
  }));

  const { submitContactMessage } = await import("../lib/api");
  vi.doUnmock("../lib/supabase");

  return { submitContactMessage, invokeMock };
}

describe("submitContactMessage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.doUnmock("../lib/supabase");
  });

  it.each([
    {
      name: "",
      email: "user@example.com",
      message: "Mensagem suficientemente longa",
      expectedError: "O nome é obrigatório.",
    },
    {
      name: "Ana",
      email: "",
      message: "Mensagem suficientemente longa",
      expectedError: "O email é obrigatório.",
    },
    {
      name: "Ana",
      email: "invalid-email",
      message: "Mensagem suficientemente longa",
      expectedError: "Introduza um email válido.",
    },
    {
      name: "Ana",
      email: "ana@example.com",
      message: "Curta",
      expectedError: "A mensagem deve ter pelo menos 10 caracteres.",
    },
  ])(
    "valida entradas inválidas (%s)",
    async ({ name, email, message, expectedError }) => {
      const { submitContactMessage } = await setupSubmitContactMessage();

      await expect(
        submitContactMessage({
          name,
          email,
          message,
        })
      ).rejects.toThrow(expectedError);
    }
  );

  it("invoca a função Edge com payload normalizado", async () => {
    const { submitContactMessage, invokeMock } =
      await setupSubmitContactMessage();

    await submitContactMessage({
      name: "  Maria da Silva  ",
      email: "  USER@Example.COM  ",
      subject: "  ",
      message: "   Mensagem com mais de dez caracteres   ",
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("send-contact-message", {
      body: {
        name: "Maria da Silva",
        email: "user@example.com",
        subject: null,
        message: "Mensagem com mais de dez caracteres",
      },
    });
  });

  it("lança erro quando a função responde com falha", async () => {
    const failingResponse: InvokeResult = {
      data: { success: false, error: "Fila cheia" },
      error: null,
    };

    const { submitContactMessage } = await setupSubmitContactMessage(
      failingResponse
    );

    await expect(
      submitContactMessage({
        name: "João",
        email: "joao@example.com",
        message: "Mensagem suficientemente longa",
      })
    ).rejects.toThrow("Fila cheia");
  });

  it("propaga erros devolvidos pelo invoke do Supabase", async () => {
    const errorResponse: InvokeResult = {
      data: null,
      error: { message: "Falha de rede" },
    };

    const { submitContactMessage } = await setupSubmitContactMessage(
      errorResponse
    );

    await expect(
      submitContactMessage({
        name: "Joana",
        email: "joana@example.com",
        message: "Mensagem suficientemente longa",
      })
    ).rejects.toThrow("Falha de rede");
  });
});
