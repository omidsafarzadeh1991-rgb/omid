import Link from "next/link";
import { WEEK_DAYS } from "@/lib/weekdays";

export type CalendarDay = {
  date: Date;
  inMonth: boolean;
  isWorkingDay: boolean;
  isPast: boolean;
  isToday: boolean;
  freeCount: number;
};

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthCalendar({
  doctorId,
  monthDate,
  days,
  selectedDate,
}: {
  doctorId: string;
  monthDate: Date;
  days: CalendarDay[];
  selectedDate: string;
}) {
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

  return (
    <div className="surface animate-in overflow-hidden p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href={`/book/${doctorId}?month=${toMonthParam(prevMonth)}`}
          className="btn-ghost"
        >
          ماه قبل ←
        </Link>
        <h2 className="text-lg font-bold text-slate-900">
          {new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(
            monthDate
          )}
        </h2>
        <Link
          href={`/book/${doctorId}?month=${toMonthParam(nextMonth)}`}
          className="btn-ghost"
        >
          → ماه بعد
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEK_DAYS.map((d) => (
          <div
            key={d.value}
            className="eyebrow pb-2 text-center"
          >
            {d.label}
          </div>
        ))}

        {days.map((day, i) => {
          const dateParam = toDateParam(day.date);
          const isSelected = dateParam === selectedDate;
          const isBookable = day.inMonth && day.isWorkingDay && !day.isPast;
          const isFull = isBookable && day.freeCount === 0;

          const cellClasses = [
            "flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors duration-150",
            !day.inMonth && "text-slate-200",
            day.inMonth && !day.isWorkingDay && "text-slate-300",
            day.inMonth && day.isWorkingDay && day.isPast && "text-slate-300",
            isSelected && "bg-[#0b1220] text-white",
            isBookable && !isSelected && !isFull &&
              "border hairline bg-white text-teal-800 hover:border-teal-300 hover:bg-teal-50/60",
            isFull && !isSelected && "border hairline text-slate-400 line-through",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <>
              <span className="relative font-semibold">
                {new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(day.date)}
                {day.isToday && !isSelected && (
                  <span className="absolute -top-1.5 -left-2.5 h-1.5 w-1.5 rounded-full bg-[var(--amber-quiet)]" />
                )}
              </span>
              {day.inMonth && day.isWorkingDay && !day.isPast && (
                <span className="mt-0.5 text-[10px] leading-none opacity-80">
                  {day.freeCount > 0 ? `${day.freeCount} خالی` : "پر"}
                </span>
              )}
            </>
          );

          if (!isBookable) {
            return (
              <div key={i} className={cellClasses}>
                {content}
              </div>
            );
          }

          return (
            <Link
              key={i}
              href={`/book/${doctorId}?month=${toMonthParam(monthDate)}&date=${dateParam}`}
              className={cellClasses}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
