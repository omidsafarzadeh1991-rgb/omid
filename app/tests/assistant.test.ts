import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { bookAppointment } from "@/lib/booking";
import { createFaqEntry, saveClinicInfo } from "@/lib/knowledge";
import { createTestClinicWithDoctor } from "./helpers";

const { mockCreate, capturedClientConfigs } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  capturedClientConfigs: [] as Record<string, unknown>[],
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock(config: Record<string, unknown>) {
    capturedClientConfigs.push(config);
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

const { runAssistantTurn } = await import("@/lib/assistant");

function nextMonday9am() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toolCallResponse(name: string, args: Record<string, unknown>) {
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        },
      },
    ],
  };
}

function endTurnResponse(text: string) {
  return { choices: [{ message: { role: "assistant", content: text, tool_calls: undefined } }] };
}

function hasToolResult(messages: { role: string }[]): boolean {
  const last = messages[messages.length - 1];
  return last.role === "tool";
}

describe("runAssistantTurn", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    capturedClientConfigs.length = 0;
  });

  it("books an appointment via the book_appointment tool, through the same atomic booking engine", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    mockCreate.mockImplementationOnce(async () =>
      toolCallResponse("book_appointment", {
        doctorId: doctor.id,
        date: isoDate(startTime),
        time: "09:00",
        patientName: "زهرا احمدی",
        patientPhone: "09121234567",
      })
    );
    mockCreate.mockImplementationOnce(async () =>
      endTurnResponse("نوبت شما برای شنبه ساعت ۹ ثبت شد.")
    );

    const reply = await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "111",
      userText: "سلام، می‌خوام نوبت بگیرم",
    });

    expect(reply).toContain("ثبت شد");

    const appointment = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id, startTime },
    });
    expect(appointment).not.toBeNull();
    expect(appointment?.source).toBe("TELEGRAM");
    expect(appointment?.patientName).toBe("زهرا احمدی");
  });

  it("tags a booking made through the Bale platform with source BALE, not Telegram", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    mockCreate.mockImplementationOnce(async () =>
      toolCallResponse("book_appointment", {
        doctorId: doctor.id,
        date: isoDate(startTime),
        time: "09:00",
        patientName: "رضا کریمی",
        patientPhone: "09129876543",
      })
    );
    mockCreate.mockImplementationOnce(async () =>
      endTurnResponse("نوبت شما برای شنبه ساعت ۹ ثبت شد.")
    );

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "BALE",
      externalChatId: "222",
      userText: "سلام، می‌خوام نوبت بگیرم",
    });

    const appointment = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id, startTime },
    });
    expect(appointment?.source).toBe("BALE");

    const call = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
    expect(call.messages[0].content).toContain("بله");
  });

  it("persists conversation history across separate webhook calls for the same chat", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    void doctor;

    mockCreate.mockImplementation(async () => endTurnResponse("سلام! چطور می‌توانم کمک کنم؟"));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "222",
      userText: "سلام",
    });

    const conversation = await prisma.botConversation.findUnique({
      where: {
        clinicId_platform_externalChatId: {
          clinicId: clinic.id,
          platform: "TELEGRAM",
          externalChatId: "222",
        },
      },
    });
    expect(conversation).not.toBeNull();
    const history = JSON.parse(conversation!.history);
    expect(history.length).toBe(2);
    expect(history[0]).toMatchObject({ role: "user", content: "سلام" });
  });

  it("never lets two concurrent chats double-book the same slot through the AI tool path", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    mockCreate.mockImplementation(
      async ({ messages }: { messages: { role: string }[] }) => {
        if (hasToolResult(messages)) {
          return endTurnResponse("انجام شد.");
        }
        return toolCallResponse("book_appointment", {
          doctorId: doctor.id,
          date: isoDate(startTime),
          time: "09:00",
          patientName: "بیمار همزمان",
          patientPhone: "09120000000",
        });
      }
    );

    await Promise.all([
      runAssistantTurn({
        clinicId: clinic.id,
        clinicName: clinic.name,
        platform: "TELEGRAM",
        externalChatId: "a",
        userText: "می‌خوام شنبه ساعت ۹ نوبت بگیرم",
      }),
      runAssistantTurn({
        clinicId: clinic.id,
        clinicName: clinic.name,
        platform: "TELEGRAM",
        externalChatId: "b",
        userText: "می‌خوام شنبه ساعت ۹ نوبت بگیرم",
      }),
    ]);

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id, startTime },
    });
    expect(appointments).toHaveLength(1);
  });

  it("lets the AI see service prices via list_doctors", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await prisma.service.create({
      data: {
        clinicId: clinic.id,
        name: "ویزیت عمومی",
        price: 250000,
        doctors: { connect: { id: doctor.id } },
      },
    });

    mockCreate.mockImplementationOnce(async () => toolCallResponse("list_doctors", {}));
    mockCreate.mockImplementationOnce(async () => endTurnResponse("پزشکان و قیمت‌ها را نشان دادم."));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "333",
      userText: "قیمت ویزیت چقدره؟",
    });

    const conversation = await prisma.botConversation.findUnique({
      where: {
        clinicId_platform_externalChatId: {
          clinicId: clinic.id,
          platform: "TELEGRAM",
          externalChatId: "333",
        },
      },
    });
    const history = JSON.parse(conversation!.history);
    const toolResultMessage = history.find((m: { role: string }) => m.role === "tool");
    const doctors = JSON.parse(toolResultMessage.content as string);
    expect(doctors[0].services).toEqual([
      { name: "ویزیت عمومی", price: "۲۵۰٬۰۰۰ تومان" },
    ]);
  });

  it("hides a deactivated service from list_doctors", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await prisma.service.create({
      data: {
        clinicId: clinic.id,
        name: "خدمت غیرفعال",
        active: false,
        doctors: { connect: { id: doctor.id } },
      },
    });
    await prisma.service.create({
      data: {
        clinicId: clinic.id,
        name: "خدمت فعال",
        doctors: { connect: { id: doctor.id } },
      },
    });

    mockCreate.mockImplementationOnce(async () => toolCallResponse("list_doctors", {}));
    mockCreate.mockImplementationOnce(async () => endTurnResponse("پزشکان را نشان دادم."));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "334",
      userText: "چه خدماتی دارید؟",
    });

    const conversation = await prisma.botConversation.findUnique({
      where: {
        clinicId_platform_externalChatId: {
          clinicId: clinic.id,
          platform: "TELEGRAM",
          externalChatId: "334",
        },
      },
    });
    const history = JSON.parse(conversation!.history);
    const toolResultMessage = history.find((m: { role: string }) => m.role === "tool");
    const doctors = JSON.parse(toolResultMessage.content as string);
    expect(doctors[0].services.map((s: { name: string }) => s.name)).toEqual(["خدمت فعال"]);
  });

  it("includes the admin's custom instructions in the system prompt but keeps hard rules in force", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    void doctor;

    mockCreate.mockImplementationOnce(async () => endTurnResponse("باشه!"));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      assistantInstructions: "آدرس مطب: خیابان ولیعصر، پلاک ۱۲.",
      platform: "TELEGRAM",
      externalChatId: "444",
      userText: "آدرس مطب کجاست؟",
    });

    const call = mockCreate.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
    };
    const systemContent = call.messages[0].content;
    expect(call.messages[0].role).toBe("system");
    expect(systemContent).toContain("آدرس مطب: خیابان ولیعصر، پلاک ۱۲.");
    expect(systemContent).toContain("هرگز مشاورهٔ پزشکی یا تشخیص نده");
    expect(systemContent).toContain("همیشه قوانین بالا اولویت دارند");
  });

  async function getConversation(clinicId: string, externalChatId: string) {
    return prisma.botConversation.findUnique({
      where: {
        clinicId_platform_externalChatId: {
          clinicId,
          platform: "TELEGRAM",
          externalChatId,
        },
      },
    });
  }

  it("marks the conversation record as BOOKED and remembers the patient's name/phone after a successful booking", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    mockCreate.mockImplementationOnce(async () =>
      toolCallResponse("book_appointment", {
        doctorId: doctor.id,
        date: isoDate(startTime),
        time: "09:00",
        patientName: "سارا محمدی",
        patientPhone: "09121111111",
      })
    );
    mockCreate.mockImplementationOnce(async () => endTurnResponse("نوبت شما ثبت شد."));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "555",
      userText: "می‌خوام نوبت بگیرم",
    });

    const conversation = await getConversation(clinic.id, "555");
    expect(conversation?.status).toBe("BOOKED");
    expect(conversation?.patientName).toBe("سارا محمدی");
    expect(conversation?.patientPhone).toBe("09121111111");
  });

  it("finds and cancels an appointment by phone via find_my_appointments + cancel_appointment", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();
    const booking = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "رضا کریمی",
      patientPhone: "09123334444",
      source: "TELEGRAM",
    });
    if (!booking.ok) throw new Error("setup booking failed");

    mockCreate.mockImplementationOnce(async () =>
      toolCallResponse("find_my_appointments", { patientPhone: "09123334444" })
    );
    mockCreate.mockImplementationOnce(async () =>
      toolCallResponse("cancel_appointment", {
        appointmentId: booking.appointmentId,
        patientPhone: "09123334444",
      })
    );
    mockCreate.mockImplementationOnce(async () => endTurnResponse("نوبت شما لغو شد."));

    const reply = await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "666",
      userText: "می‌خوام نوبتمو لغو کنم",
    });

    expect(reply).toContain("لغو شد");
    const remaining = await prisma.appointment.findFirst({ where: { id: booking.appointmentId } });
    expect(remaining).toBeNull();
  });

  it("refuses to cancel an appointment when the phone number doesn't match", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();
    const booking = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "محمد علوی",
      patientPhone: "09120009999",
      source: "TELEGRAM",
    });
    if (!booking.ok) throw new Error("setup booking failed");

    mockCreate.mockImplementationOnce(async () =>
      toolCallResponse("cancel_appointment", {
        appointmentId: booking.appointmentId,
        patientPhone: "09110000000",
      })
    );
    mockCreate.mockImplementationOnce(async () => endTurnResponse("نوبتی پیدا نشد."));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "777",
      userText: "لغو نوبت با شماره اشتباه",
    });

    const stillBooked = await prisma.appointment.findFirst({ where: { id: booking.appointmentId } });
    expect(stillBooked).not.toBeNull();
  });

  it("sets status to WAITING_CLINIC and logs a note when the AI escalates to staff", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    void doctor;

    mockCreate.mockImplementationOnce(async () =>
      toolCallResponse("escalate_to_staff", { reason: "بیمار شکایت دارد" })
    );
    mockCreate.mockImplementationOnce(async () => endTurnResponse("کارمندان کلینیک با شما تماس می‌گیرند."));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "888",
      userText: "شکایت دارم",
    });

    const conversation = await getConversation(clinic.id, "888");
    expect(conversation?.status).toBe("WAITING_CLINIC");

    const notes = await prisma.conversationNote.findMany({ where: { conversationId: conversation!.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toContain("بیمار شکایت دارد");
  });

  it("always includes a fresh doctor list in the system prompt, even mid-conversation after a new doctor is added", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();

    mockCreate.mockImplementationOnce(async () => endTurnResponse("سلام! چطور می‌توانم کمک کنم؟"));
    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "1010",
      userText: "سلام",
    });

    const secondDoctor = await prisma.doctor.create({
      data: { clinicId: clinic.id, name: "دکتر جدید", slotMinutes: 30 },
    });

    mockCreate.mockImplementationOnce(async () => endTurnResponse("بله، هر دو پزشک را داریم."));
    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "1010",
      userText: "چه پزشکانی دارید؟",
    });

    const secondCall = mockCreate.mock.calls[1][0] as {
      messages: { role: string; content: string }[];
    };
    const systemContent = secondCall.messages[0].content;
    expect(systemContent).toContain(doctor.name);
    expect(systemContent).toContain(secondDoctor.name);
  });

  it("reopens a closed conversation to WAITING_PATIENT when the patient writes again", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    void doctor;

    mockCreate.mockImplementationOnce(async () => endTurnResponse("سلام! چطور کمکتون کنم؟"));
    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "999",
      userText: "سلام",
    });

    const conversation = await getConversation(clinic.id, "999");
    await prisma.botConversation.update({
      where: { id: conversation!.id },
      data: { status: "CLOSED" },
    });

    mockCreate.mockImplementationOnce(async () => endTurnResponse("بله در خدمتم."));
    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "999",
      userText: "دوباره سوال دارم",
    });

    const reopened = await getConversation(clinic.id, "999");
    expect(reopened?.status).toBe("WAITING_PATIENT");
  });

  it("answers from a matching FAQ without ever calling the AI model", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await createFaqEntry(clinic.id, {
      category: "ADDRESS",
      question: "آدرس کجاست؟",
      answer: "خیابان ولیعصر، پلاک ۱۰",
      keywords: "آدرس, نشانی",
      priority: 50,
    });

    const reply = await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "faq-1",
      userText: "سلام آدرستون کجاست؟",
    });

    expect(reply).toBe("خیابان ولیعصر، پلاک ۱۰");
    expect(mockCreate).not.toHaveBeenCalled();

    const conversation = await getConversation(clinic.id, "faq-1");
    expect(conversation?.lastMessageText).toBe("خیابان ولیعصر، پلاک ۱۰");
  });

  it("includes saved clinic info in the system prompt when the AI is called", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await saveClinicInfo(clinic.id, {
      address: "خیابان آزادی، پلاک ۵",
      phone: null,
      whatsapp: null,
      contactEmail: null,
      website: null,
      instagram: null,
      googleMapUrl: null,
      workingHoursNote: null,
      parkingAvailable: false,
      parkingDescription: null,
      insuranceNote: null,
    });

    mockCreate.mockImplementationOnce(async () => endTurnResponse("سلام! چطور کمکتون کنم؟"));
    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "clinic-info-1",
      userText: "سلام",
    });

    const call = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
    expect(call.messages[0].content).toContain("خیابان آزادی، پلاک ۵");
  });

  it("sets a bounded timeout and retry count on the AI client so a hung provider can't stall the webhook forever", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    mockCreate.mockImplementationOnce(async () => endTurnResponse("سلام!"));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "timeout-1",
      userText: "سلام",
    });

    const config = capturedClientConfigs.at(-1);
    expect(config?.timeout).toBe(20_000);
    expect(config?.maxRetries).toBe(1);
  });

  it("keeps only the most recent messages once history grows past the cap, cutting at a user-message boundary", async () => {
    const { clinic } = await createTestClinicWithDoctor();

    const oldHistory = [];
    for (let i = 0; i < 15; i++) {
      oldHistory.push({ role: "user", content: `سوال قدیمی ${i}` });
      oldHistory.push({ role: "assistant", content: `پاسخ قدیمی ${i}` });
    }
    await prisma.botConversation.create({
      data: {
        clinicId: clinic.id,
        platform: "TELEGRAM",
        externalChatId: "long-history",
        history: JSON.stringify(oldHistory),
      },
    });

    mockCreate.mockImplementationOnce(async () => endTurnResponse("سلام دوباره!"));
    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "long-history",
      userText: "یک سوال جدید",
    });

    const conversation = await getConversation(clinic.id, "long-history");
    const history = JSON.parse(conversation!.history) as { role: string; content: string }[];

    expect(history.length).toBeLessThan(oldHistory.length + 1);
    expect(history[0].role).toBe("user");
    expect(history.at(-1)?.content).toBe("سلام دوباره!");
    // The newest question must always survive the trim.
    expect(history.some((m) => m.content === "یک سوال جدید")).toBe(true);
  });

  it("records a FAQ-resolved message log with no token counts", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await createFaqEntry(clinic.id, {
      category: "ADDRESS",
      question: "آدرس کجاست؟",
      answer: "خیابان ولیعصر",
      keywords: "آدرس",
      priority: 50,
    });

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "log-faq-1",
      userText: "آدرس کجاست؟",
    });

    const logs = await prisma.messageLog.findMany({ where: { clinicId: clinic.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].resolution).toBe("FAQ");
    expect(logs[0].promptTokens).toBeNull();
    expect(logs[0].completionTokens).toBeNull();
    expect(logs[0].responseMs).toBeGreaterThanOrEqual(0);
  });

  it("records an AI-resolved message log with tokens summed across every tool-call round-trip", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    mockCreate.mockImplementationOnce(async () => ({
      ...toolCallResponse("book_appointment", {
        doctorId: doctor.id,
        date: isoDate(startTime),
        time: "09:00",
        patientName: "مریم رضایی",
        patientPhone: "09121230000",
      }),
      usage: { prompt_tokens: 100, completion_tokens: 20 },
    }));
    mockCreate.mockImplementationOnce(async () => ({
      ...endTurnResponse("نوبت شما ثبت شد."),
      usage: { prompt_tokens: 150, completion_tokens: 10 },
    }));

    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "log-ai-1",
      userText: "می‌خوام نوبت بگیرم",
    });

    const logs = await prisma.messageLog.findMany({ where: { clinicId: clinic.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].resolution).toBe("AI");
    expect(logs[0].promptTokens).toBe(250);
    expect(logs[0].completionTokens).toBe(30);
  });

  it("returns the polite fallback (never throws) and logs AI_ERROR when the AI call fails", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    mockCreate.mockImplementationOnce(async () => {
      throw new Error("upstream timeout");
    });

    const reply = await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "ai-error-1",
      userText: "سلام",
    });

    expect(reply).toContain("مشکل فنی");

    const conversation = await getConversation(clinic.id, "ai-error-1");
    expect(conversation).not.toBeNull();
    const history = JSON.parse(conversation!.history);
    expect(history.at(-1)).toMatchObject({ role: "assistant", content: reply });

    const logs = await prisma.messageLog.findMany({ where: { clinicId: clinic.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].resolution).toBe("AI_ERROR");
  });

  it("still lets the patient continue the conversation normally after an AI failure on the previous turn", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    mockCreate.mockImplementationOnce(async () => {
      throw new Error("upstream timeout");
    });
    await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "ai-error-2",
      userText: "سلام",
    });

    mockCreate.mockImplementationOnce(async () => endTurnResponse("چطور می‌توانم کمکتان کنم؟"));
    const reply = await runAssistantTurn({
      clinicId: clinic.id,
      clinicName: clinic.name,
      platform: "TELEGRAM",
      externalChatId: "ai-error-2",
      userText: "نوبت می‌خوام",
    });

    expect(reply).toBe("چطور می‌توانم کمکتان کنم؟");
  });
});
