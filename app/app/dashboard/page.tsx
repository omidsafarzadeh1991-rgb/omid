import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/actions/auth";
import { cancelManualAppointmentAction } from "@/app/actions/booking";
import AddDoctorForm from "./AddDoctorForm";

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "ثبت دستی",
  TELEGRAM: "تلگرام",
  BALE: "بله",
  WHATSAPP: "واتس‌اپ",
  INSTAGRAM: "اینستاگرام",
};

export default async function DashboardPage() {
  const session = await requireSession();

  const [clinic, doctors, upcomingAppointments] = await Promise.all([
    prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } }),
    prisma.doctor.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { clinicId: session.clinicId, startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 30,
      include: { doctor: true },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{clinic.name}</h1>
          <p className="text-sm text-slate-500">پنل مدیریت نوبت‌دهی</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            خروج
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">پزشکان</h2>
        {doctors.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">
            هنوز پزشکی ثبت نشده. برای شروع نوبت‌دهی، اول یک پزشک اضافه کنید.
          </p>
        ) : (
          <ul className="mb-6 grid gap-3 sm:grid-cols-2">
            {doctors.map((doctor) => (
              <li
                key={doctor.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800">{doctor.name}</p>
                  <p className="text-xs text-slate-500">
                    {Math.floor(doctor.workStartMin / 60)}:
                    {String(doctor.workStartMin % 60).padStart(2, "0")} تا{" "}
                    {Math.floor(doctor.workEndMin / 60)}:
                    {String(doctor.workEndMin % 60).padStart(2, "0")} — هر{" "}
                    {doctor.slotMinutes} دقیقه
                  </p>
                </div>
                <Link
                  href={`/book/${doctor.id}`}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
                >
                  ثبت نوبت
                </Link>
              </li>
            ))}
          </ul>
        )}
        <AddDoctorForm />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  <p className="font-medium text-slate-800">
                    {appt.patientName}{" "}
                    <span className="text-xs text-slate-400">
                      ({appt.patientPhone})
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {appt.doctor.name} —{" "}
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(appt.startTime)}{" "}
                    · {SOURCE_LABELS[appt.source] ?? appt.source}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await cancelManualAppointmentAction(appt.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
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
