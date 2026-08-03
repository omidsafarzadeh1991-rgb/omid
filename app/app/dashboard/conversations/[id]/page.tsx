import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CONVERSATION_STATUS_LABELS } from "@/lib/conversations";
import {
  addConversationNoteAction,
  assignConversationAction,
  changeConversationStatusAction,
  logCallOutcomeAction,
} from "@/app/actions/conversations";
import SourceBadge from "../../SourceBadge";
import StatusBadge from "../StatusBadge";

export const dynamic = "force-dynamic";

const NOTE_TYPE_LABELS: Record<string, string> = {
  NOTE: "یادداشت",
  CALL_OUTCOME: "نتیجهٔ تماس",
  STATUS_CHANGE: "تغییر وضعیت",
};

type HistoryMessage = {
  role: string;
  content?: string | null;
};

function parseHistory(raw: string): HistoryMessage[] {
  try {
    const parsed = JSON.parse(raw) as HistoryMessage[];
    return parsed.filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()
    );
  } catch {
    return [];
  }
}

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const conversation = await prisma.botConversation.findFirst({
    where: { id, clinicId: session.clinicId },
    include: {
      assignedStaff: true,
      notes: { orderBy: { createdAt: "desc" }, include: { authorStaff: true } },
    },
  });
  if (!conversation) notFound();

  const staff = await prisma.staffUser.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "asc" },
  });

  const messages = parseHistory(conversation.history);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/dashboard/conversations" className="text-sm text-teal-700 hover:underline">
          ← بازگشت به فهرست مکالمات
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">
            {conversation.patientName || "بیمار نامشخص"}
          </h1>
          <SourceBadge source={conversation.platform} />
          <StatusBadge status={conversation.status} />
        </div>
        {conversation.patientPhone && (
          <p className="mt-1 text-sm text-slate-500" dir="ltr">
            {conversation.patientPhone}
          </p>
        )}
      </div>

      <section className="card animate-in grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-400">اولین پیام</p>
          <p className="text-sm text-slate-700">
            {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(
              conversation.createdAt
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">آخرین پیام</p>
          <p className="text-sm text-slate-700">
            {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(
              conversation.lastMessageAt
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          {conversation.patientPhone && (
            <a href={`tel:${conversation.patientPhone}`} className="btn btn-primary btn-sm">
              تماس با بیمار
            </a>
          )}

          <form
            action={async (formData: FormData) => {
              "use server";
              await changeConversationStatusAction(conversation.id, String(formData.get("status")));
            }}
            className="flex items-center gap-2"
          >
            <select
              name="status"
              defaultValue={conversation.status}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {Object.entries(CONVERSATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">
              تغییر وضعیت
            </button>
          </form>

          <form
            action={async (formData: FormData) => {
              "use server";
              await assignConversationAction(conversation.id, String(formData.get("staffId")));
            }}
            className="flex items-center gap-2"
          >
            <select
              name="staffId"
              defaultValue={conversation.assignedStaffId ?? ""}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">بدون مسئول</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">
              مسئول پیگیری
            </button>
          </form>
        </div>
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">تاریخچهٔ گفتگو</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">پیامی ثبت نشده است.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  message.role === "user"
                    ? "self-end bg-[#1e3a5f] text-white"
                    : "self-start bg-slate-100 text-slate-700"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card animate-in grid gap-4 p-6 sm:grid-cols-2">
        <form
          action={async (formData: FormData) => {
            "use server";
            await addConversationNoteAction(conversation.id, formData);
          }}
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-slate-700">ثبت یادداشت داخلی</label>
          <textarea
            name="text"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            ثبت یادداشت
          </button>
        </form>

        <form
          action={async (formData: FormData) => {
            "use server";
            await logCallOutcomeAction(conversation.id, formData);
          }}
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-slate-700">ثبت نتیجهٔ تماس</label>
          <textarea
            name="text"
            rows={2}
            placeholder="مثلاً: تماس گرفتم، برای فردا ساعت ۱۰ هماهنگ شد."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <select
            name="nextStatus"
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">بدون تغییر وضعیت</option>
            {Object.entries(CONVERSATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary btn-sm">
            ثبت نتیجهٔ تماس
          </button>
        </form>
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">تاریخچهٔ پیگیری</h2>
        {conversation.notes.length === 0 ? (
          <p className="text-sm text-slate-500">هنوز یادداشتی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-3">
            {conversation.notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {NOTE_TYPE_LABELS[note.type] ?? note.type}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(
                      note.createdAt
                    )}
                    {note.authorStaff && ` · ${note.authorStaff.name}`}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{note.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
