import "server-only";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { bookAppointment, cancelAppointment, getSlotsForDay } from "@/lib/booking";
import { formatSchedules } from "@/lib/weekdays";
import { formatToman } from "@/lib/format";
import type { BotPlatform, ConversationStatus } from "@/generated/prisma/client";

const MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini";
const BASE_URL = process.env.AI_BASE_URL || "https://openrouter.ai/api/v1";
const MAX_TOOL_ITERATIONS = 6;

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.AI_API_KEY, baseURL: BASE_URL });
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_doctors",
      description:
        "لیست پزشکان این کلینیک را برمی‌گرداند، همراه با تخصص‌ها، روزها/ساعات کاری و خدماتشان.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "ساعت‌های خالیِ یک پزشک در یک روز مشخص را برمی‌گرداند. همیشه قبل از پیشنهاد ساعت به بیمار از این ابزار استفاده کن، هرگز حدس نزن.",
      parameters: {
        type: "object",
        properties: {
          doctorId: { type: "string", description: "شناسهٔ پزشک از list_doctors" },
          date: { type: "string", description: "تاریخ میلادی به شکل YYYY-MM-DD" },
        },
        required: ["doctorId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "نوبت را نهایی و ثبت می‌کند. فقط وقتی پزشک، تاریخ، ساعت، نام و شمارهٔ تماس بیمار مشخص است این ابزار را صدا بزن؛ همان لحظه که این‌ها مشخص شد، بدون تاخیر ثبت کن.",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "find_my_appointments",
      description:
        "نوبت‌های آیندهٔ یک بیمار را با شمارهٔ تماسش پیدا می‌کند. برای «نوبتم چه ساعتیه» یا قبل از لغو نوبت از این ابزار استفاده کن؛ هرگز حدس نزن.",
      parameters: {
        type: "object",
        properties: {
          patientPhone: { type: "string", description: "شمارهٔ موبایل بیمار" },
        },
        required: ["patientPhone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description:
        "یک نوبت مشخص را لغو می‌کند. فقط روی appointmentId ای استفاده کن که از find_my_appointments برای همان شمارهٔ تماس گرفته‌ای.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: { type: "string" },
          patientPhone: { type: "string", description: "همان شمارهٔ تماسی که نوبت را با آن پیدا کردی" },
        },
        required: ["appointmentId", "patientPhone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_staff",
      description:
        "وقتی درخواست بیمار خارج از توان تو است یا نیاز به تماس مستقیم کارمندان کلینیک دارد (شکایت، درخواست خاص، سوال نامطمئن)، این ابزار را با یک دلیل کوتاه صدا بزن تا کارمندان کلینیک پیگیری کنند.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "خلاصهٔ کوتاه دلیل ارجاع به کارمندان" },
        },
        required: ["reason"],
      },
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
      include: { schedules: true, services: true, specialties: true },
    });
    return JSON.stringify(
      doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        specialties: doctor.specialties.map((s) => s.name),
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

  if (name === "find_my_appointments") {
    const patientPhone = String(input.patientPhone ?? "").trim();
    if (!patientPhone) return JSON.stringify({ error: "شمارهٔ تماس نامعتبر است." });

    const appointments = await prisma.appointment.findMany({
      where: { clinicId, patientPhone, startTime: { gt: new Date() } },
      orderBy: { startTime: "asc" },
      include: { doctor: true },
    });

    return JSON.stringify(
      appointments.map((a) => ({
        appointmentId: a.id,
        doctorName: a.doctor.name,
        date: a.startTime.toLocaleDateString("fa-IR-u-ca-gregory"),
        time: a.startTime.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }),
        serviceName: a.serviceName ?? undefined,
      }))
    );
  }

  if (name === "cancel_appointment") {
    const appointmentId = String(input.appointmentId ?? "");
    const patientPhone = String(input.patientPhone ?? "").trim();

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
    });
    if (!appointment || appointment.patientPhone !== patientPhone) {
      return JSON.stringify({
        ok: false,
        error: "نوبتی با این مشخصات پیدا نشد. دوباره از find_my_appointments استفاده کن.",
      });
    }

    const result = await cancelAppointment(clinicId, appointmentId);
    if (!result.ok) {
      return JSON.stringify({ ok: false, error: "این نوبت قبلاً لغو یا حذف شده است." });
    }
    return JSON.stringify({ ok: true });
  }

  if (name === "escalate_to_staff") {
    return JSON.stringify({ ok: true });
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
    "اول نیت پیام بیمار را تشخیص بده - رزرو نوبت جدید، سوال دربارهٔ پزشکان/تخصص‌ها/خدمات/قیمت‌ها/ساعات کاری، لغو نوبت، یا پیگیری نوبت خودش - و مستقیم مسیر همان نیت را دنبال کن؛ در ابتدای مکالمه یک فرم یا سوالات ثابت (مثل نام و شماره) نپرس.",
    "فقط دربارهٔ نوبت‌دهی، پزشکان، تخصص‌ها، خدمات، قیمت‌ها و ساعات کاری این کلینیک صحبت کن. هرگز مشاورهٔ پزشکی یا تشخیص نده؛ اگر سوال پزشکی پرسیدند مودبانه بگو باید مستقیم با مطب تماس بگیرند.",
    "برای دیدن پزشکان، تخصص‌ها، خدمات و قیمت‌ها از list_doctors و برای دیدن ساعت خالی از check_availability استفاده کن؛ هرگز دربارهٔ خالی یا پر بودن یک ساعت یا قیمت یک خدمت حدس نزن.",
    "هرگز در همان پیام اول و بدون نیاز واقعی نام یا شمارهٔ تماس بیمار را نخواه. شمارهٔ تماس را فقط درست قبل از ثبت نهایی نوبت (اگر نداری) با دقیقاً همین جمله بپرس: «برای اینکه در صورت نیاز بتونیم تماس بگیریم، لطفاً شماره‌تون رو وارد کنید.»",
    "به محض این‌که پزشک، تاریخ، ساعت، نام و شمارهٔ تماس بیمار مشخص شد، بلافاصله با book_appointment نوبت را ثبت کن؛ منتظر تاییدِ اضافی نمان.",
    "برای «نوبتم چه ساعتیه» یا «نوبتم رو لغو کن»، اول با find_my_appointments (با شمارهٔ تماس بیمار) نوبت او را پیدا کن - اگر شماره را نداری مودبانه بپرس: «برای پیدا کردن نوبت شما، شماره تماسی که با آن نوبت گرفته‌اید را بفرمایید.» - سپس در صورت لغو، از cancel_appointment روی همان appointmentId استفاده کن؛ هرگز حدس نزن.",
    "اگر درخواست بیمار خارج از توان توست یا نیاز به تماس مستقیم کارمندان کلینیک دارد (شکایت، درخواست خاص، سوال نامطمئن)، مودبانه بگو کارمندان کلینیک پیگیری می‌کنند و از escalate_to_staff با یک دلیل کوتاه استفاده کن.",
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

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Runs one full assistant turn for an incoming chat message: loads this
 * chat's history, lets the model use tools (all reads/writes go through
 * lib/booking.ts, so the AI never decides availability itself), and
 * persists the updated history for the next incoming message. Talks to
 * any OpenAI-compatible provider (OpenRouter by default, or OpenAI, or a
 * self-hosted endpoint) via AI_BASE_URL/AI_API_KEY/AI_MODEL - not tied to
 * one specific AI company.
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

  const history: ChatMessage[] = JSON.parse(conversation.history);
  history.push({ role: "user", content: input.userText });

  const client = getClient();
  const system = buildSystemPrompt(input.clinicName, input.assistantInstructions ?? "");
  let replyText = "";

  // Every successful turn ends the conversation resting in one of these
  // states, which also naturally reopens anything staff had marked closed/
  // booked/incomplete if the patient writes again.
  let outcomeStatus: ConversationStatus = "WAITING_PATIENT";
  let capturedName: string | undefined;
  let capturedPhone: string | undefined;
  let escalationReason: string | undefined;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...history],
      tools: TOOLS,
    });

    const message = response.choices[0].message;
    history.push({
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls,
    } as ChatMessage);
    replyText = (message.content ?? "").trim();

    if (!message.tool_calls || message.tool_calls.length === 0) {
      break;
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;
      const toolInput = JSON.parse(toolCall.function.arguments || "{}") as Record<
        string,
        unknown
      >;

      if (toolCall.function.name === "book_appointment") {
        if (typeof toolInput.patientName === "string" && toolInput.patientName.trim()) {
          capturedName = toolInput.patientName.trim();
        }
        if (typeof toolInput.patientPhone === "string" && toolInput.patientPhone.trim()) {
          capturedPhone = toolInput.patientPhone.trim();
        }
      }
      if (
        (toolCall.function.name === "find_my_appointments" ||
          toolCall.function.name === "cancel_appointment") &&
        typeof toolInput.patientPhone === "string" &&
        toolInput.patientPhone.trim()
      ) {
        capturedPhone = toolInput.patientPhone.trim();
      }

      const result = await executeTool(input.clinicId, toolCall.function.name, toolInput);
      history.push({ role: "tool", tool_call_id: toolCall.id, content: result });

      if (toolCall.function.name === "book_appointment") {
        const parsed = JSON.parse(result) as { ok: boolean };
        if (parsed.ok) outcomeStatus = "BOOKED";
      }
      if (toolCall.function.name === "escalate_to_staff") {
        outcomeStatus = "WAITING_CLINIC";
        escalationReason = typeof toolInput.reason === "string" ? toolInput.reason : undefined;
      }
    }
  }

  await prisma.botConversation.update({
    where: { id: conversation.id },
    data: {
      history: JSON.stringify(history),
      status: outcomeStatus,
      lastMessageAt: new Date(),
      lastMessageText: replyText || undefined,
      ...(capturedName ? { patientName: capturedName } : {}),
      ...(capturedPhone ? { patientPhone: capturedPhone } : {}),
    },
  });

  if (escalationReason) {
    await prisma.conversationNote.create({
      data: {
        clinicId: input.clinicId,
        conversationId: conversation.id,
        type: "NOTE",
        text: `ارجاع خودکار توسط بات: ${escalationReason}`,
      },
    });
  }

  return replyText || "متوجه نشدم، می‌شود دوباره توضیح دهید؟";
}
