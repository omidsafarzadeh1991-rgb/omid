import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveBotToken, getWebhookSecret } from "@/lib/settings";
import { registerClinic } from "@/lib/auth";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mockCreate } };
  }),
}));

const { POST } = await import("@/app/api/telegram/webhook/[clinicId]/route");

let counter = 0;
async function createClinicWithTelegramBot() {
  counter += 1;
  const result = await registerClinic({
    clinicName: `Webhook Test Clinic ${counter}`,
    adminName: "مدیر",
    adminEmail: `webhook-admin-${counter}@example.com`,
    adminPassword: "SuperSecret123",
  });
  if (!result.ok) throw new Error("setup failed");
  await saveBotToken(result.clinicId, "TELEGRAM", "123456:fake-telegram-token");
  const secret = await getWebhookSecret(result.clinicId, "TELEGRAM");
  return { clinicId: result.clinicId, secret: secret! };
}

function makeRequest(clinicId: string, secretHeader: string | undefined, body: unknown) {
  const headers: Record<string, string> = {};
  if (secretHeader !== undefined) {
    headers["x-telegram-bot-api-secret-token"] = secretHeader;
  }
  return new Request(`http://localhost/api/telegram/webhook/${clinicId}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Telegram webhook route", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );
  });

  it("rejects requests missing the secret token header", async () => {
    const { clinicId } = await createClinicWithTelegramBot();

    const response = await POST(
      makeRequest(clinicId, undefined, {
        update_id: 1,
        message: { message_id: 1, chat: { id: 1 }, text: "سلام" },
      }),
      { params: Promise.resolve({ clinicId }) }
    );

    expect(response.status).toBe(401);
  });

  it("rejects requests with a wrong secret token", async () => {
    const { clinicId } = await createClinicWithTelegramBot();

    const response = await POST(
      makeRequest(clinicId, "wrong-secret", {
        update_id: 1,
        message: { message_id: 1, chat: { id: 1 }, text: "سلام" },
      }),
      { params: Promise.resolve({ clinicId }) }
    );

    expect(response.status).toBe(401);
  });

  it("accepts a correctly-signed request and replies via Telegram", async () => {
    const { clinicId, secret } = await createClinicWithTelegramBot();
    mockCreate.mockImplementationOnce(async () => ({
      content: [{ type: "text", text: "سلام! چه کمکی از دستم بر می‌آید؟" }],
      stop_reason: "end_turn",
    }));

    const response = await POST(
      makeRequest(clinicId, secret, {
        update_id: 1,
        message: { message_id: 1, chat: { id: 555 }, text: "سلام" },
      }),
      { params: Promise.resolve({ clinicId }) }
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("fake-telegram-token/sendMessage");
    expect(JSON.parse(options.body).chat_id).toBe(555);

    const conversation = await prisma.botConversation.findUnique({
      where: {
        clinicId_platform_externalChatId: {
          clinicId,
          platform: "TELEGRAM",
          externalChatId: "555",
        },
      },
    });
    expect(conversation).not.toBeNull();
  });
});
