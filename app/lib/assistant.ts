import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { bookAppointment, getSlotsForDay } from "@/lib/booking";
import { formatSchedules } from "@/lib/weekdays";
import { formatToman } from "@/lib/format";
import type { BotPlatform } from "@/generated/prisma/client";

const MODEL = process.env.ASSISTANT_MODEL || "claude-haiku-4-5";
const MAX_TOOL_ITERATIONS = 6;

function getClient(): Anthropic {
  return new Anthropic();
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_doctors",
    description:
      "لیست پزشکان این کلینیک را برمی‌گرداند، همراه با روزها/ساعات کاری و خدماتشان.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_availability",
    description:
      "ساعت‌های خالیِ یک پزشک در یک روز مشخص را برمی‌گرداند. همیشه قبل از پیشنهاد ساعت به بیمار از این ابزار استفاده کن، هرگز حدس نزن.",
    input_schema: {
      type: "object",
      properties: {
        doctorId: { type: "string", description: "شناسهٔ پزشک از list_doctors" },
        date: { type: "string", description: "تاریخ میلادی به شکل YYYY-MM-DD" },
      },
      required: ["doctorId", "date"],
    },
  },
  {
    name: "book_appointment",
    description:
      "نوبت را نهایی و ثبت می‌کند. فقط وقتی پزشک، تاریخ، ساعت، نام و شمارهٔ تماس بیمار مشخص است این ابزار را صدا بزن؛ همان لحظه که این‌ها مشخص شد، بدون تاخیر ثبت کن.",
    input_schema: {
      type: "object",
      properties: {
        doctorId: { type: "string" },
        date: { type: "string", description: "تاریخ میلادی به شکل YYYY-MM-DD" },
        time: { type: "string", description: "ساعت به شکل HH:MM (۲۴ ساعته)" },
        patientName: { type: "string" },
        patientPhone: { type: "string", description: "شمارهٔ موبایل بیمار" },
        serviceName: { type: "string", description: "نام خدمت، در صورت وجود" },
      },
      required: ["doctorId", "date", "time", "patientName", "patientPhone"],
    },
  },
];

function parseDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  const result = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
  return Number.isNaN(result.getTime()) ? null : result;
}

async function executeTool(
  clinicId: string,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === "list_doctors") {
    const doctors = await prisma.doctor.findMany({
      where: { clinicId },
      include: { schedules: true, services: true },
    });
    return JSON.stringify(
      doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        workSchedule: formatSchedules(doctor.schedules) || "بدون برنامهٔ کاری تعریف‌شده",
        services: doctor.services.map((service) => ({
          name: service.name,
          price: service.price != null ? formatToman(service.price) : "قیمت تعیین نشده",
        })),
      }))
    );
  }

  if (name === "check_availability") {
    const doctorId = String(input.doctorId ?? "");
    const date = String(input.date ?? "");
    const day = parseDateTime(date, "00:00");
    if (!day) return JSON.stringify({ error: "فرمت تاریخ نامعتبر است." });

    try {
      const slots = await getSlotsForDay(clinicId, doctorId, day);
      const free = slots
        .filter((slot) => slot.isFree)
        .map((slot) =>
          slot.startTime.toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        );
      return JSON.stringify({
        freeTimes: free,
        note: free.length === 0 ? "هیچ ساعت خالی‌ای در این روز نیست." : undefined,
      });
    } catch {
      return JSON.stringify({ error: "پزشک پیدا نشد." });
    }
  }

  if (name === "book_appointment") {
    const doctorId = String(input.doctorId ?? "");
    const date = String(input.date ?? "");
    const time = String(input.time ?? "");
    const patientName = String(input.patientName ?? "").trim();
    const patientPhone = String(input.patientPhone ?? "").trim();
    const serviceName = input.serviceName ? String(input.serviceName) : undefined;

    const startTime = parseDateTime(date, time);
    if (!startTime) return JSON.stringify({ ok: false, error: "فرمت تاریخ/ساعت نامعتبر است." });
    if (patientName.length < 2 || !patientPhone) {
      return JSON.stringify({ ok: false, error: "نام و شمارهٔ تماس بیمار لازم است." });
    }

    const result = await bookAppointment({
      clinicId,
      doctorId,
      startTime,
      patientName,
      patientPhone,
      serviceName,
      source: "TELEGRAM",
    });

    if (result.ok) {
      return JSON.stringify({ ok: true, appointmentId: result.appointmentId });
    }

    const messages: Record<typeof result.reason, string> = {
      SLOT_TAKEN: "این ساعت همین الان توسط یک نفر دیگر رزرو شد. لطفاً با check_availability ساعت خالی دیگری پیدا کن.",
      OUTSIDE_WORKING_HOURS: "این ساعت خارج از برنامهٔ کاری پزشک است.",
      PAST_TIME: "این زمان گذشته و قابل رزرو نیست.",
    };
    return JSON.stringify({ ok: false, error: messages[result.reason] });
  }

  return JSON.stringify({ error: "ابزار ناشناخته." });
}

function buildSystemPrompt(clinicName: string, adminInstructions: string): string {
  const now = new Date();
  const todayLabel = now.toLocaleDateString("fa-IR-u-ca-gregory", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const isoToday = now.toISOString().slice(0, 10);

  const fixedRules = [
    `تو منشی هوش مصنوعی «${clinicName}» هستی و با بیماران در تلگرام گفتگو می‌کنی.`,
    `امروز ${todayLabel} (${isoToday}) است؛ تاریخ‌های نسبی مثل «فردا» یا «چهارشنبه» را بر این اساس به فرمت YYYY-MM-DD تبدیل کن.`,
    "فقط دربارهٔ نوبت‌دهی، پزشکان، خدمات، قیمت‌ها و ساعات کاری این کلینیک صحبت کن. هرگز مشاورهٔ پزشکی یا تشخیص نده؛ اگر سوال پزشکی پرسیدند مودبانه بگو باید مستقیم با مطب تماس بگیرند.",
    "برای دیدن پزشکان، خدمات و قیمت‌ها از list_doctors و برای دیدن ساعت خالی از check_availability استفاده کن؛ هرگز دربارهٔ خالی یا پر بودن یک ساعت یا قیمت یک خدمت حدس نزن.",
    "به محض این‌که پزشک، تاریخ، ساعت، نام و شمارهٔ تماس بیمار مشخص شد، بلافاصله با book_appointment نوبت را ثبت کن؛ منتظر تاییدِ اضافی نمان.",
    "پاسخ‌هایت کوتاه، مودبانه، و کاملاً فارسی باشد.",
  ].join("\n");

  if (!adminInstructions.trim()) {
    return fixedRules;
  }

  return [
    fixedRules,
    "",
    "علاوه بر این‌ها، مدیر این کلینیک دستورالعمل زیر را نوشته؛ آن را رعایت کن:",
    adminInstructions.trim(),
    "",
    "اگر بین این دستورالعمل و قوانین بالا (به‌خصوص ندادن مشاورهٔ پزشکی و ثبت نوبت فقط از طریق ابزارها) تناقضی بود، همیشه قوانین بالا اولویت دارند.",
  ].join("\n");
}

export type AssistantTurnInput = {
  clinicId: string;
  clinicName: string;
  assistantInstructions?: string;
  platform: BotPlatform;
  externalChatId: string;
  userText: string;
};

/**
 * Runs one full assistant turn for an incoming chat message: loads this
 * chat's history, lets Claude use tools (all reads/writes go through
 * lib/booking.ts, so the AI never decides availability itself), and
 * persists the updated history for the next incoming message.
 */
export async function runAssistantTurn(input: AssistantTurnInput): Promise<string> {
  const conversation = await prisma.botConversation.upsert({
    where: {
      clinicId_platform_externalChatId: {
        clinicId: input.clinicId,
        platform: input.platform,
        externalChatId: input.externalChatId,
      },
    },
    create: {
      clinicId: input.clinicId,
      platform: input.platform,
      externalChatId: input.externalChatId,
      history: "[]",
    },
    update: {},
  });

  const messages: Anthropic.MessageParam[] = JSON.parse(conversation.history);
  messages.push({ role: "user", content: input.userText });

  const client = getClient();
  const system = buildSystemPrompt(input.clinicName, input.assistantInstructions ?? "");
  let replyText = "";

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    replyText = textBlocks.map((block) => block.text).join("\n").trim();

    if (response.stop_reason !== "tool_use") {
      break;
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tool of toolUseBlocks) {
      const result = await executeTool(
        input.clinicId,
        tool.name,
        (tool.input ?? {}) as Record<string, unknown>
      );
      toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result });
    }
    messages.push({ role: "user", content: toolResults });
  }

  await prisma.botConversation.update({
    where: { id: conversation.id },
    data: { history: JSON.stringify(messages) },
  });

  return replyText || "متوجه نشدم، می‌شود دوباره توضیح دهید؟";
}
