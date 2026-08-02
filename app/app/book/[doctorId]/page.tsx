import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getSlotsForDay } from "@/lib/booking";
import BookingForm from "./BookingForm";

function parseDateParam(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ doctorId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireSession();
  const { doctorId } = await params;
  const { date: dateParam } = await searchParams;

  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, clinicId: session.clinicId },
  });
  if (!doctor) notFound();

  const selectedDay = parseDateParam(dateParam);
  const slots = await getSlotsForDay(session.clinicId, doctor.id, selectedDay);

  const dayOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← بازگشت به پنل
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">
          ثبت نوبت برای {doctor.name}
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {dayOptions.map((day) => {
          const isActive = toDateParam(day) === toDateParam(selectedDay);
          return (
            <Link
              key={day.toISOString()}
              href={`/book/${doctor.id}?date=${toDateParam(day)}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {new Intl.DateTimeFormat("fa-IR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              }).format(day)}
            </Link>
          );
        })}
      </div>

      <BookingForm
        doctorId={doctor.id}
        slots={slots.map((s) => ({
          startTime: s.startTime.toISOString(),
          isFree: s.isFree,
        }))}
      />
    </main>
  );
}
