import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  BotConversation,
  ConversationNoteType,
  ConversationStatus,
} from "@/generated/prisma/client";

export const FOLLOW_UP_THRESHOLD_MINUTES = 30;
export const INCOMPLETE_THRESHOLD_MINUTES = 120;

// Statuses where the ball is in the clinic's court - if one of these sits
// too long without staff action, it needs follow-up.
const STAFF_OWES_ACTION_STATUSES: ConversationStatus[] = ["NEW", "IN_REVIEW", "WAITING_CLINIC"];

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  NEW: "جدید",
  IN_REVIEW: "در حال بررسی",
  WAITING_PATIENT: "منتظر پاسخ بیمار",
  WAITING_CLINIC: "منتظر اقدام کلینیک",
  BOOKED: "نوبت ثبت شد",
  INCOMPLETE: "ناتمام",
  CLOSED: "بسته شده",
};

export function needsFollowUp(conversation: Pick<BotConversation, "status" | "lastMessageAt">): boolean {
  if (!STAFF_OWES_ACTION_STATUSES.includes(conversation.status)) return false;
  const minutesSinceActivity = (Date.now() - conversation.lastMessageAt.getTime()) / 60_000;
  return minutesSinceActivity > FOLLOW_UP_THRESHOLD_MINUTES;
}

/**
 * Lazily flips conversations the patient abandoned mid-flow to "ناتمام".
 * There is no background scheduler in this single-computer install, so this
 * runs on demand whenever staff open the conversations panel - cheap, and
 * always accurate at the moment it's viewed.
 */
export async function sweepStaleConversations(clinicId: string): Promise<void> {
  const threshold = new Date(Date.now() - INCOMPLETE_THRESHOLD_MINUTES * 60_000);
  await prisma.botConversation.updateMany({
    where: { clinicId, status: "WAITING_PATIENT", lastMessageAt: { lt: threshold } },
    data: { status: "INCOMPLETE" },
  });
}

export async function setConversationStatus(
  clinicId: string,
  conversationId: string,
  status: ConversationStatus,
  actorStaffId?: string
): Promise<void> {
  const conversation = await prisma.botConversation.findFirst({
    where: { id: conversationId, clinicId },
  });
  if (!conversation) return;

  await prisma.$transaction([
    prisma.botConversation.update({ where: { id: conversationId }, data: { status } }),
    prisma.conversationNote.create({
      data: {
        clinicId,
        conversationId,
        type: "STATUS_CHANGE",
        text: `${CONVERSATION_STATUS_LABELS[conversation.status]} ← ${CONVERSATION_STATUS_LABELS[status]}`,
        authorStaffId: actorStaffId,
      },
    }),
  ]);
}

export async function addConversationNote(
  clinicId: string,
  conversationId: string,
  type: ConversationNoteType,
  text: string,
  actorStaffId?: string
): Promise<void> {
  const conversation = await prisma.botConversation.findFirst({
    where: { id: conversationId, clinicId },
  });
  if (!conversation) return;

  await prisma.conversationNote.create({
    data: { clinicId, conversationId, type, text, authorStaffId: actorStaffId },
  });
}

export async function assignConversation(
  clinicId: string,
  conversationId: string,
  staffId: string | null
): Promise<void> {
  await prisma.botConversation.updateMany({
    where: { id: conversationId, clinicId },
    data: { assignedStaffId: staffId },
  });
}

export async function countNeedsFollowUp(clinicId: string): Promise<number> {
  const followUpThreshold = new Date(Date.now() - FOLLOW_UP_THRESHOLD_MINUTES * 60_000);
  return prisma.botConversation.count({
    where: {
      clinicId,
      status: { in: STAFF_OWES_ACTION_STATUSES },
      lastMessageAt: { lt: followUpThreshold },
    },
  });
}

export type ConversationDashboardStats = {
  newCount: number;
  incompleteCount: number;
  needsFollowUpCount: number;
  bookedTodayCount: number;
  cancelledTodayCount: number;
};

export async function getConversationDashboardStats(
  clinicId: string
): Promise<ConversationDashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const followUpThreshold = new Date(Date.now() - FOLLOW_UP_THRESHOLD_MINUTES * 60_000);

  const [newCount, incompleteCount, needsFollowUpCount, bookedTodayCount, cancelledTodayCount] =
    await Promise.all([
      prisma.botConversation.count({ where: { clinicId, status: "NEW" } }),
      prisma.botConversation.count({ where: { clinicId, status: "INCOMPLETE" } }),
      prisma.botConversation.count({
        where: {
          clinicId,
          status: { in: STAFF_OWES_ACTION_STATUSES },
          lastMessageAt: { lt: followUpThreshold },
        },
      }),
      prisma.appointmentLog.count({
        where: { clinicId, action: "BOOKED", createdAt: { gte: todayStart } },
      }),
      prisma.appointmentLog.count({
        where: { clinicId, action: "CANCELLED", createdAt: { gte: todayStart } },
      }),
    ]);

  return { newCount, incompleteCount, needsFollowUpCount, bookedTodayCount, cancelledTodayCount };
}
