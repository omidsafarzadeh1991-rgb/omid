import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canManageClinic } from "@/lib/roles";
import NewAppointmentCard from "./NewAppointmentCard";
import SourceBadge from "./SourceBadge";
import UpcomingList from "./UpcomingList";

export default async function DashboardPage() {
  const session = await requireSession();
  const isAdmin = canManageClinic(session.role);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60_000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60_000);

  const [
    doctors,
    upcomingAppointments,
    todayCount,
    weekCount,
    totalBookedEver,
    bookedBySource,
  ] = await Promise.all([
    prisma.doctor.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { clinicId: session.clinicId, startTime: { gte: now } },
      orderBy: { startTime: "asc" },
      take: 30,
      include: { doctor: true },
    }),
    isAdmin
      ? prisma.appointment.count({
          where: {
            clinicId: session.clinicId,
            startTime: { gte: todayStart, lt: todayEnd },
          },
        })
      : 0,
    isAdmin
      ? prisma.appointment.count({
          where: {
            clinicId: session.clinicId,
            startTime: { gte: todayStart, lt: weekEnd },
          },
        })
      : 0,
    isAdmin
      ? prisma.appointmentLog.count({
          where: { clinicId: session.clinicId, action: "BOOKED" },
        })
      : 0,
    isAdmin
      ? prisma.appointmentLog.groupBy({
          by: ["source"],
          where: { clinicId: session.clinicId, action: "BOOKED" },
          _count: { _all: true },
        })
      : [],
  ]);

  const stats = [
    { label: "پزشکان", value: doctors.length },
    { label: "نوبت‌های امروز", value: todayCount },
    { label: "نوبت‌های ۷ روز آینده", value: weekCount },
    { label: "مجموع نوبت‌های ثبت‌شده", value: totalBookedEver },
  ];

  const maxSourceCount = Math.max(1, ...bookedBySource.map((s) => s._count._all));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-9 px-4 py-10 sm:py-12">
      {doctors.length === 0 ? (
        <section className="card animate-in p-6 text-sm text-slate-500">
          {isAdmin ? (
            <>
              هنوز پزشکی ثبت نشده.{" "}
              <Link href="/dashboard/doctors" className="text-teal-700 hover:underline">
                از اینجا یک پزشک اضافه کنید
              </Link>{" "}
              تا بتوانید نوبت‌دهی را شروع کنید.
            </>
          ) : (
            "هنوز پزشکی ثبت نشده. از مدیر کلینیک بخواهید یک پزشک اضافه کند."
          )}
        </section>
      ) : (
        <NewAppointmentCard doctors={doctors.map((d) => ({ id: d.id, name: d.name }))} />
      )}

      {isAdmin && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="card card-hover animate-in p-5 text-center"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-1.5 text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </section>
      )}

      {isAdmin && bookedBySource.length > 0 && (
        <section className="card animate-in p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            نوبت‌ها از کدام کانال بیشتر ثبت می‌شود
          </h2>
          <div className="space-y-3">
            {bookedBySource
              .sort((a, b) => b._count._all - a._count._all)
              .map((row) => (
                <div key={row.source} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <SourceBadge source={row.source} />
                  </div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-teal-400 to-teal-600"
                      style={{
                        width: `${(row._count._all / maxSourceCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-left text-sm font-semibold text-slate-700">
                    {row._count._all}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          نوبت‌های پیش رو
        </h2>
        <UpcomingList appointments={upcomingAppointments} />
      </section>
    </main>
  );
}
