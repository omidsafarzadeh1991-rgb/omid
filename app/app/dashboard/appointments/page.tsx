import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/format";
import SourceBadge from "../SourceBadge";
import EmptyState from "../EmptyState";

export const dynamic = "force-dynamic";

function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; doctorId?: string; from?: string; to?: string }>;
}) {
  const session = await requireSession();
  const { q, doctorId, from, to } = await searchParams;

  const doctors = await prisma.doctor.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "asc" },
  });

  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);
  const query = q ? toEnglishDigits(q.trim()) : "";

  const logs = await prisma.appointmentLog.findMany({
    where: {
      clinicId: session.clinicId,
      ...(doctorId ? { doctorId } : {}),
      ...(fromDate || toDate
        ? {
            startTime: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lt: new Date(toDate.getTime() + 24 * 60 * 60_000) } : {}),
            },
          }
        : {}),
      ...(query
        ? {
            OR: [
              { patientName: { contains: query } },
              { patientPhone: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const doctorNameById = new Map(doctors.map((d) => [d.id, d.name]));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <p className="eyebrow mb-1">نوبت‌ها</p>
        <h1 className="text-xl font-bold text-slate-900">جست‌وجو و تاریخچهٔ نوبت‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">
          با شمارهٔ تماس جست‌وجو کنید تا کل تاریخچهٔ یک بیمار (نوبت‌های ثبت‌شده و لغوشده) را ببینید.
        </p>
      </div>

      <section className="surface animate-in p-6">
        <form className="mb-5 flex flex-wrap items-end gap-3" dir="rtl">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              جست‌وجو (نام یا شماره تماس)
            </label>
            <input
              name="q"
              defaultValue={q ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
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
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">از تاریخ</label>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">تا تاریخ</label>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            جست‌وجو
          </button>
          {(q || doctorId || from || to) && (
            <Link href="/dashboard/appointments" className="text-xs text-slate-500 hover:underline">
              پاک کردن فیلترها
            </Link>
          )}
        </form>

        {logs.length === 0 ? (
          <EmptyState
            title="نوبتی پیدا نشد"
            subtitle="فیلترها را عوض کنید یا شمارهٔ تماس بیمار را کامل وارد کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-right text-xs text-slate-400">
                  <th className="pb-2 font-medium">بیمار</th>
                  <th className="pb-2 font-medium">پزشک</th>
                  <th className="pb-2 font-medium">ساعت نوبت</th>
                  <th className="pb-2 font-medium">کانال</th>
                  <th className="pb-2 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pl-2">
                      <p className="font-medium text-slate-800">{log.patientName}</p>
                      <p className="text-xs text-slate-400" dir="ltr">
                        {log.patientPhone}
                      </p>
                    </td>
                    <td className="py-3 text-slate-600">
                      {doctorNameById.get(log.doctorId) ?? "—"}
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Intl.DateTimeFormat("fa-IR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(log.startTime)}
                    </td>
                    <td className="py-3">
                      <SourceBadge source={log.source} />
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          log.action === "BOOKED"
                            ? "bg-teal-50 text-teal-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.action === "BOOKED" ? "ثبت شد" : "لغو شد"}
                      </span>
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
