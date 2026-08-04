import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveBotToken, getWebhookSecret } from "@/lib/settings";
import { registerClinic } from "@/lib/auth";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

const { POST } = await import("@/app/api/bale/webhook/[clinicId]/[secret]/route");

let counter = 0;
async function createClinicWithBaleBot() {
  counter += 1;
  const result = await registerClinic({
    clinicName: `Bale Webhook Test Clinic ${counter}`,
    adminUsername: `bale-webhook-admin-${counter}`,
    adminFirstName: "مدیر",
    adminPassword: "SuperSecret123",
  });
  if (!result.ok) throw new Error("setup failed");
  await saveBotToken(result.clinicId, "BALE", "123456:fake-bale-token");
  const secret = await getWebhookSecret(result.clinicId, "BALE");
  return { clinicId: result.clinicId, secret: secret! };
}

function makeRequest(clinicId: string, secret: string, body: unknown) {
  return new Request(`http://localhost/api/bale/webhook/${clinicId}/${secret}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("Bale webhook route", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );
  });

  it("rejects requests with a wrong path secret", async () => {
    const { clinicId } = await createClinicWithBaleBot();

    const response = await POST(
      makeRequest(clinicId, "wrong-secret", {
        update_id: 1,
        message: { message_id: 1, chat: { id: 1 }, text: "سلام" },
      }),
      { params: Promise.resolve({ clinicId, secret: "wrong-secret" }) }
    );

    expect(response.status).toBe(401);
  });

  it("rejects an empty path secret", async () => {
    const { clinicId } = await createClinicWithBaleBot();

    const response = await POST(
      makeRequest(clinicId, "", {
        update_id: 1,
        message: { message_id: 1, chat: { id: 1 }, text: "سلام" },
      }),
      { params: Promise.resolve({ clinicId, secret: "" }) }
    );

    expect(response.status).toBe(401);
  });

  it("accepts a correctly-signed request and replies via Bale", async () => {
    const { clinicId, secret } = await createClinicWithBaleBot();
    mockCreate.mockImplementationOnce(async () => ({
      choices: [
        {
          message: {
            role: "assistant",
            content: "سلام! چه کمکی از دستم بر می‌آید؟",
            tool_calls: undefined,
          },
        },
      ],
    }));

    const response = await POST(
      makeRequest(clinicId, secret, {
        update_id: 1,
        message: { message_id: 1, chat: { id: 555 }, text: "سلام" },
      }),
      { params: Promise.resolve({ clinicId, secret }) }
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("fake-bale-token/sendMessage");
    expect(JSON.parse(options.body).chat_id).toBe(555);

    const conversation = await prisma.botConversation.findUnique({
      where: {
        clinicId_platform_externalChatId: {
          clinicId,
          platform: "BALE",
          externalChatId: "555",
        },
      },
    });
    expect(conversation).not.toBeNull();
  });
});
