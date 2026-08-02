import { prisma } from "@/lib/prisma";
import { verifyTelegramWebhook } from "@/lib/settings";
import { runAssistantTurn } from "@/lib/assistant";
import { sendTelegramMessage, type TelegramUpdate } from "@/lib/telegram";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  const { clinicId } = await params;

  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const verified = await verifyTelegramWebhook(clinicId, secretHeader);
  if (!verified) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update: TelegramUpdate = await request.json();
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
      platform: "TELEGRAM",
      externalChatId: String(chatId),
      userText: text,
    });
    await sendTelegramMessage(verified.botToken, chatId, reply);
  } catch (error) {
    console.error("Telegram assistant turn failed:", error);
    await sendTelegramMessage(
      verified.botToken,
      chatId,
      "متاسفانه یک مشکل فنی پیش آمد. لطفاً چند لحظه دیگر دوباره پیام دهید یا مستقیم با مطب تماس بگیرید."
    ).catch(() => undefined);
  }

  return Response.json({ ok: true });
}
