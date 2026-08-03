"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/dal";
import {
  addConversationNote,
  assignConversation,
  setConversationStatus,
} from "@/lib/conversations";
import type { ConversationStatus } from "@/generated/prisma/client";

const VALID_STATUSES: ConversationStatus[] = [
  "NEW",
  "IN_REVIEW",
  "WAITING_PATIENT",
  "WAITING_CLINIC",
  "BOOKED",
  "INCOMPLETE",
  "CLOSED",
];

export async function changeConversationStatusAction(
  conversationId: string,
  status: string
) {
  const session = await requireSession();
  if (!VALID_STATUSES.includes(status as ConversationStatus)) return;

  await setConversationStatus(
    session.clinicId,
    conversationId,
    status as ConversationStatus,
    session.staffId
  );
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}

export async function addConversationNoteAction(
  conversationId: string,
  formData: FormData
) {
  const session = await requireSession();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  await addConversationNote(session.clinicId, conversationId, "NOTE", text, session.staffId);
  revalidatePath(`/dashboard/conversations/${conversationId}`);
}

export async function logCallOutcomeAction(
  conversationId: string,
  formData: FormData
) {
  const session = await requireSession();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  await addConversationNote(
    session.clinicId,
    conversationId,
    "CALL_OUTCOME",
    text,
    session.staffId
  );

  const nextStatus = formData.get("nextStatus");
  if (typeof nextStatus === "string" && VALID_STATUSES.includes(nextStatus as ConversationStatus)) {
    await setConversationStatus(
      session.clinicId,
      conversationId,
      nextStatus as ConversationStatus,
      session.staffId
    );
  }

  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}

export async function assignConversationAction(
  conversationId: string,
  staffId: string
) {
  const session = await requireSession();
  await assignConversation(session.clinicId, conversationId, staffId || null);
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}
