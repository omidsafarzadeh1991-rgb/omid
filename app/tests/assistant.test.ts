import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestClinicWithDoctor } from "./helpers";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mockCreate } };
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

function bookToolUseResponse(input: Record<string, unknown>) {
  return {
    content: [{ type: "tool_use", id: "toolu_1", name: "book_appointment", input }],
    stop_reason: "tool_use",
  };
}

function endTurnResponse(text: string) {
  return { content: [{ type: "text", text }], stop_reason: "end_turn" };
}

function hasToolResult(messages: unknown[]): boolean {
  const last = messages[messages.length - 1] as { role: string; content: unknown };
  return (
    last.role === "user" &&
    Array.isArray(last.content) &&
    (last.content as { type: string }[]).some((b) => b.type === "tool_result")
  );
}

describe("runAssistantTurn", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("books an appointment via the book_appointment tool, through the same atomic booking engine", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    mockCreate.mockImplementationOnce(async () =>
      bookToolUseResponse({
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

    mockCreate.mockImplementation(async ({ messages }: { messages: unknown[] }) => {
      if (hasToolResult(messages)) {
        return endTurnResponse("انجام شد.");
      }
      return bookToolUseResponse({
        doctorId: doctor.id,
        date: isoDate(startTime),
        time: "09:00",
        patientName: "بیمار همزمان",
        patientPhone: "09120000000",
      });
    });

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
});
