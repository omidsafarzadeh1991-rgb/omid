import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { buildMonthGrid, getSlotsForDay } from "@/lib/booking";
import { formatToman } from "@/lib/format";
import MonthCalendar from "./MonthCalendar";
import BookingForm from "./BookingForm";

function parseMonthParam(value: string | undefined): Date {
  if (value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, 1);
    }
  }
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ doctorId: string }>;
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const session = await requireSession();
  const { doctorId } = await params;
  const { month: monthParam, date: dateParam } = await searchParams;

  const monthDate = parseMonthParam(monthParam);
  const { doctor, days } = await buildMonthGrid(session.clinicId, doctorId, monthDate).catch(() =>
    notFound()
  );

  const selectedDate = parseDateParam(dateParam);
  const slots = selectedDate
    ? await getSlotsForDay(session.clinicId, doctor.id, selectedDate)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← بازگشت به پنل
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">
          ثبت نوبت برای {doctor.name}
        </h1>
        {doctor.specialties.length > 0 && (
          <p className="mt-1 text-sm text-slate-500">
            {doctor.specialties.map((s) => s.name).join(" · ")}
          </p>
        )}
      </div>

      <MonthCalendar
        doctorId={doctor.id}
        monthDate={monthDate}
        days={days}
        selectedDate={dateParam ?? ""}
      />

      {selectedDate && (
        <div className="card animate-in p-4 sm:p-6">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" }).format(selectedDate)}
          </h2>
          <BookingForm
            doctorId={doctor.id}
            services={doctor.services.map((s) => ({
              name: s.name,
              price: s.price != null ? formatToman(s.price) : null,
            }))}
            slots={slots.map((s) => ({
              startTime: s.startTime.toISOString(),
              isFree: s.isFree,
            }))}
          />
        </div>
      )}
    </main>
  );
}
