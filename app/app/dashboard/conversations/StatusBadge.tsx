import { CONVERSATION_STATUS_LABELS } from "@/lib/conversations";
import type { ConversationStatus } from "@/generated/prisma/client";

const STATUS_COLORS: Record<ConversationStatus, { bg: string; fg: string }> = {
  NEW: { bg: "#e0f2fe", fg: "#0284c7" },
  IN_REVIEW: { bg: "#fef9c3", fg: "#a16207" },
  WAITING_PATIENT: { bg: "#f1f5f9", fg: "#475569" },
  WAITING_CLINIC: { bg: "#ffedd5", fg: "#c2410c" },
  BOOKED: { bg: "#dcfce7", fg: "#15803d" },
  INCOMPLETE: { bg: "#fee2e2", fg: "#b91c1c" },
  CLOSED: { bg: "#f1f5f9", fg: "#64748b" },
};

export default function StatusBadge({ status }: { status: ConversationStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {CONVERSATION_STATUS_LABELS[status]}
    </span>
  );
}
