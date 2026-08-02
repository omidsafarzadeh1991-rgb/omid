import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { cancelManualAppointmentAction } from "@/app/actions/booking";
import SourceBadge from "./SourceBadge";

export default async function DashboardPage() {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";

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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
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
        <section
          className="animate-in rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, #2dd4bf, #0d9488)",
            boxShadow:
              "0 4px 0 #0f766e, 0 20px 40px -16px rgba(13,148,136,0.5)",
          }}
        >
          <h2 className="mb-3 text-lg font-semibold text-white">
            ثبت نوبت جدید
          </h2>
          <div className="flex flex-wrap gap-3">
            {doctors.map((doctor) => (
              <Link key={doctor.id} href={`/book/${doctor.id}`} className="btn btn-light">
                نوبت برای {doctor.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
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
        {upcomingAppointments.length === 0 ? (
          <p className="text-sm text-slate-500">نوبتی ثبت نشده است.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingAppointments.map((appt) => (
              <li
                key={appt.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium text-slate-800">
                      {appt.patientName}{" "}
                      <span className="text-xs text-slate-400">
                        ({appt.patientPhone})
                      </span>
                    </p>
                    <SourceBadge source={appt.source} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {appt.doctor.name} —{" "}
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(appt.startTime)}
                    {appt.serviceName && <> · {appt.serviceName}</>}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await cancelManualAppointmentAction(appt.id);
                  }}
                >
                  <button type="submit" className="btn btn-danger btn-sm">
                    لغو
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
