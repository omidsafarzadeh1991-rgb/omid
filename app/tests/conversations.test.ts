import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addConversationNote,
  countNeedsFollowUp,
  getConversationDashboardStats,
  needsFollowUp,
  setConversationStatus,
  sweepStaleConversations,
} from "@/lib/conversations";
import { createTestClinicWithDoctor } from "./helpers";

let counter = 0;
async function createConversation(
  clinicId: string,
  overrides: Partial<{
    status: "NEW" | "IN_REVIEW" | "WAITING_PATIENT" | "WAITING_CLINIC" | "BOOKED" | "INCOMPLETE" | "CLOSED";
    lastMessageAt: Date;
  }> = {}
) {
  counter += 1;
  return prisma.botConversation.create({
    data: {
      clinicId,
      platform: "TELEGRAM",
      externalChatId: `chat-${counter}`,
      status: overrides.status ?? "NEW",
      lastMessageAt: overrides.lastMessageAt ?? new Date(),
    },
  });
}

describe("needsFollowUp", () => {
  it("flags a NEW conversation older than the threshold", () => {
    const old = { status: "NEW" as const, lastMessageAt: new Date(Date.now() - 40 * 60_000) };
    expect(needsFollowUp(old)).toBe(true);
  });

  it("does not flag a fresh NEW conversation", () => {
    const fresh = { status: "NEW" as const, lastMessageAt: new Date() };
    expect(needsFollowUp(fresh)).toBe(false);
  });

  it("never flags a BOOKED conversation regardless of age", () => {
    const old = { status: "BOOKED" as const, lastMessageAt: new Date(Date.now() - 3 * 60 * 60_000) };
    expect(needsFollowUp(old)).toBe(false);
  });

  it("flags a stale WAITING_CLINIC conversation", () => {
    const old = { status: "WAITING_CLINIC" as const, lastMessageAt: new Date(Date.now() - 45 * 60_000) };
    expect(needsFollowUp(old)).toBe(true);
  });
});

describe("sweepStaleConversations", () => {
  it("flips a long-abandoned WAITING_PATIENT conversation to INCOMPLETE without deleting it", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const stale = await createConversation(clinic.id, {
      status: "WAITING_PATIENT",
      lastMessageAt: new Date(Date.now() - 3 * 60 * 60_000),
    });

    await sweepStaleConversations(clinic.id);

    const reloaded = await prisma.botConversation.findUnique({ where: { id: stale.id } });
    expect(reloaded).not.toBeNull();
    expect(reloaded?.status).toBe("INCOMPLETE");
  });

  it("leaves a recent WAITING_PATIENT conversation untouched", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const recent = await createConversation(clinic.id, {
      status: "WAITING_PATIENT",
      lastMessageAt: new Date(),
    });

    await sweepStaleConversations(clinic.id);

    const reloaded = await prisma.botConversation.findUnique({ where: { id: recent.id } });
    expect(reloaded?.status).toBe("WAITING_PATIENT");
  });

  it("only sweeps conversations belonging to the given clinic", async () => {
    const { clinic: clinicA } = await createTestClinicWithDoctor();
    const { clinic: clinicB } = await createTestClinicWithDoctor();
    const staleInB = await createConversation(clinicB.id, {
      status: "WAITING_PATIENT",
      lastMessageAt: new Date(Date.now() - 3 * 60 * 60_000),
    });

    await sweepStaleConversations(clinicA.id);

    const reloaded = await prisma.botConversation.findUnique({ where: { id: staleInB.id } });
    expect(reloaded?.status).toBe("WAITING_PATIENT");
  });
});

describe("setConversationStatus / addConversationNote", () => {
  it("updates the status and logs an append-only STATUS_CHANGE note", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const conversation = await createConversation(clinic.id, { status: "NEW" });

    await setConversationStatus(clinic.id, conversation.id, "CLOSED");

    const reloaded = await prisma.botConversation.findUnique({ where: { id: conversation.id } });
    expect(reloaded?.status).toBe("CLOSED");

    const notes = await prisma.conversationNote.findMany({ where: { conversationId: conversation.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("STATUS_CHANGE");
  });

  it("records a manual note without touching status", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const conversation = await createConversation(clinic.id, { status: "WAITING_CLINIC" });

    await addConversationNote(clinic.id, conversation.id, "NOTE", "بیمار درخواست تماس مجدد کرد.");

    const reloaded = await prisma.botConversation.findUnique({ where: { id: conversation.id } });
    expect(reloaded?.status).toBe("WAITING_CLINIC");

    const notes = await prisma.conversationNote.findMany({ where: { conversationId: conversation.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toBe("بیمار درخواست تماس مجدد کرد.");
  });
});

describe("getConversationDashboardStats / countNeedsFollowUp", () => {
  it("counts new, incomplete, and needs-follow-up conversations correctly", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await createConversation(clinic.id, { status: "NEW", lastMessageAt: new Date() });
    await createConversation(clinic.id, {
      status: "NEW",
      lastMessageAt: new Date(Date.now() - 45 * 60_000),
    });
    await createConversation(clinic.id, { status: "INCOMPLETE" });

    const stats = await getConversationDashboardStats(clinic.id);
    expect(stats.newCount).toBe(2);
    expect(stats.incompleteCount).toBe(1);
    expect(stats.needsFollowUpCount).toBe(1);

    const count = await countNeedsFollowUp(clinic.id);
    expect(count).toBe(1);
  });

  it("counts today's booked and cancelled appointments from the audit log", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await prisma.appointmentLog.create({
      data: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        startTime: new Date(),
        patientName: "بیمار ۱",
        patientPhone: "09120000010",
        source: "MANUAL",
        action: "BOOKED",
      },
    });
    await prisma.appointmentLog.create({
      data: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        startTime: new Date(),
        patientName: "بیمار ۲",
        patientPhone: "09120000011",
        source: "MANUAL",
        action: "CANCELLED",
      },
    });

    const stats = await getConversationDashboardStats(clinic.id);
    expect(stats.bookedTodayCount).toBe(1);
    expect(stats.cancelledTodayCount).toBe(1);
  });
});
