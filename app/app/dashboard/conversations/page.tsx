import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/format";
import {
  CONVERSATION_STATUS_LABELS,
  getConversationDashboardStats,
  needsFollowUp,
  sweepStaleConversations,
} from "@/lib/conversations";
import type { ConversationStatus } from "@/generated/prisma/client";
import SourceBadge from "../SourceBadge";
import StatusBadge from "./StatusBadge";

export const dynamic = "force-dynamic";

function snippet(text: string | null, max = 60): string {
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; doctorId?: string }>;
}) {
  const session = await requireSession();
  const { q, status, doctorId } = await searchParams;

  await sweepStaleConversations(session.clinicId);

  const [stats, doctors] = await Promise.all([
    getConversationDashboardStats(session.clinicId),
    prisma.doctor.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  let phoneFilter: string[] | null = null;
  if (doctorId) {
    const matches = await prisma.appointment.findMany({
      where: { clinicId: session.clinicId, doctorId },
      select: { patientPhone: true },
      distinct: ["patientPhone"],
    });
    phoneFilter = matches.map((m) => m.patientPhone);
  }

  const query = q ? toEnglishDigits(q.trim()) : "";

  const conversations = await prisma.botConversation.findMany({
    where: {
      clinicId: session.clinicId,
      ...(status ? { status: status as ConversationStatus } : {}),
      ...(phoneFilter ? { patientPhone: { in: phoneFilter } } : {}),
      ...(query
        ? {
            OR: [
              { patientName: { contains: query } },
              { patientPhone: { contains: query } },
              { externalChatId: { contains: query } },
            ],
          }
        : {}),
    },
    include: { assignedStaff: true },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  const statCards = [
    { label: "پیام‌های جدید", value: stats.newCount },
    { label: "مکالمات ناتمام", value: stats.incompleteCount },
    { label: "نیازمند پیگیری", value: stats.needsFollowUpCount },
    { label: "نوبت ثبت‌شده امروز", value: stats.bookedTodayCount },
    { label: "نوبت لغوشده امروز", value: stats.cancelledTodayCount },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">مدیریت مکالمات و پیگیری بیماران</h1>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="card animate-in p-4 text-center"
            style={{ animationDelay: `${0.05 * i}s` }}
          >
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="card animate-in min-w-0 p-6">
        <form className="mb-5 flex flex-wrap items-end gap-3" dir="rtl">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              جست‌وجو (نام، شماره، شناسهٔ پیام‌رسان)
            </label>
            <input
              name="q"
              defaultValue={q ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">وضعیت</label>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">همه</option>
              {Object.entries(CONVERSATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">پزشک</label>
            <select
              name="doctorId"
              defaultValue={doctorId ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">همه</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            جست‌وجو
          </button>
          {(q || status || doctorId) && (
            <Link href="/dashboard/conversations" className="text-xs text-slate-500 hover:underline">
              پاک کردن فیلترها
            </Link>
          )}
        </form>

        {conversations.length === 0 ? (
          <p className="text-sm text-slate-500">مکالمه‌ای پیدا نشد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-right text-xs text-slate-400">
                  <th className="pb-2 font-medium">بیمار</th>
                  <th className="pb-2 font-medium">کانال</th>
                  <th className="pb-2 font-medium">آخرین پیام</th>
                  <th className="pb-2 font-medium">وضعیت</th>
                  <th className="pb-2 font-medium">مسئول پیگیری</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conversations.map((conversation) => (
                  <tr key={conversation.id}>
                    <td className="py-3 pl-2">
                      <p className="font-medium text-slate-800">
                        {conversation.patientName || "نامشخص"}
                      </p>
                      {conversation.patientPhone && (
                        <p className="text-xs text-slate-400" dir="ltr">
                          {conversation.patientPhone}
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      <SourceBadge source={conversation.platform} />
                    </td>
                    <td className="max-w-[240px] py-3 text-slate-600">
                      <p className="truncate">{snippet(conversation.lastMessageText)}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {new Intl.DateTimeFormat("fa-IR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(conversation.lastMessageAt)}
                      </p>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={conversation.status} />
                        {needsFollowUp(conversation) && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            نیاز به پیگیری
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">
                      {conversation.assignedStaff?.firstName || "—"}
                    </td>
                    <td className="py-3 text-left">
                      <Link
                        href={`/dashboard/conversations/${conversation.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
