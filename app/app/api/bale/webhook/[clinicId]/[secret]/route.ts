import { prisma } from "@/lib/prisma";
import { verifyBaleWebhook } from "@/lib/settings";
import { runAssistantTurn } from "@/lib/assistant";
import { sendBaleMessage, type BaleUpdate } from "@/lib/bale";
import { isRateLimited } from "@/lib/rate-limit";

// Same budget as the Telegram webhook: generous for real traffic bursts,
// still a hard stop against a flood driving up AI-API cost or DB load.
const WEBHOOK_LIMIT = 20;
const WEBHOOK_WINDOW_MS = 10_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clinicId: string; secret: string }> }
) {
  const { clinicId, secret } = await params;

  const verified = await verifyBaleWebhook(clinicId, secret);
  if (!verified) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (isRateLimited(`bale-webhook:${clinicId}`, WEBHOOK_LIMIT, WEBHOOK_WINDOW_MS)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const update: BaleUpdate = await request.json();
  const chatId = update.message?.chat.id;
  const text = update.message?.text;

  if (!chatId || !text) {
    return Response.json({ ok: true });
  }

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const reply = await runAssistantTurn({
      clinicId,
      clinicName: clinic.name,
      assistantInstructions: clinic.assistantInstructions ?? undefined,
      platform: "BALE",
      externalChatId: String(chatId),
      userText: text,
    });
    await sendBaleMessage(verified.botToken, chatId, reply);
  } catch (error) {
    console.error("Bale assistant turn failed:", error);
    await sendBaleMessage(
      verified.botToken,
      chatId,
      "متاسفانه یک مشکل فنی پیش آمد. لطفاً چند لحظه دیگر دوباره پیام دهید یا مستقیم با مطب تماس بگیرید."
    ).catch(() => undefined);
  }

  return Response.json({ ok: true });
}
