import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canManageClinic } from "@/lib/roles";
import NewAppointmentCard from "./NewAppointmentCard";
import ChannelDonut from "./ChannelDonut";
import UpcomingList from "./UpcomingList";
import EmptyState from "./EmptyState";
import ConnectionStatusCard from "./ConnectionStatusCard";
import ConnectionStatusSkeleton from "./ConnectionStatusSkeleton";

function greeting(hour: number): string {
  if (hour < 5) return "شب بخیر";
  if (hour < 12) return "صبح بخیر";
  if (hour < 17) return "ظهر بخیر";
  if (hour < 20) return "عصر بخیر";
  return "شب بخیر";
}

export default async function DashboardPage() {
  const session = await requireSession();
  const isAdmin = canManageClinic(session.role);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60_000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60_000);

  const [
    staff,
    doctors,
    upcomingAppointments,
    todayCount,
    weekCount,
    totalBookedEver,
    bookedBySource,
  ] = await Promise.all([
    prisma.staffUser.findUniqueOrThrow({
      where: { id: session.staffId },
      select: { firstName: true },
    }),
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

  const todayLabel = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-11 px-4 py-12 sm:py-14">
      <div className="animate-in">
        <p className="eyebrow mb-2">{todayLabel}</p>
        <h1 className="title-lg">
          {greeting(now.getHours())}، {staff.firstName}
        </h1>
      </div>

      {doctors.length === 0 ? (
        <section className="surface animate-in p-6 text-sm text-slate-500">
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
              className="surface surface-hover animate-in p-6"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <p className="stat-value">{stat.value}</p>
              <p className="eyebrow mt-2">{stat.label}</p>
            </div>
          ))}
        </section>
      )}

      {isAdmin && bookedBySource.length > 0 && (
        <section className="surface animate-in p-7">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            نوبت‌ها از کدام کانال بیشتر ثبت می‌شود
          </h2>
          <ChannelDonut
            rows={bookedBySource.map((r) => ({ source: r.source, count: r._count._all }))}
          />
        </section>
      )}

      {isAdmin && (
        <Suspense fallback={<ConnectionStatusSkeleton />}>
          <ConnectionStatusCard clinicId={session.clinicId} />
        </Suspense>
      )}

      <section className="surface animate-in p-7">
        <h2 className="mb-5 text-lg font-bold text-slate-900">نوبت‌های پیش رو</h2>
        {upcomingAppointments.length === 0 ? (
          <EmptyState
            title="هنوز نوبتی در پیش رو نیست"
            subtitle="نوبت‌هایی که از پنل یا بات‌ها ثبت شوند، همین‌جا و به‌ترتیب زمان نمایش داده می‌شوند."
          />
        ) : (
          <UpcomingList appointments={upcomingAppointments} />
        )}
      </section>
    </main>
  );
}
