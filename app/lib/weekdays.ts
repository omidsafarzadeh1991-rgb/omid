// JS Date#getDay() numbering: 0=Sunday ... 6=Saturday. Listed in the order
// the Iranian week runs (starts Saturday) so it reads naturally in the UI.
export const WEEK_DAYS = [
  { value: 6, label: "شنبه" },
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
] as const;

function formatHour(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export type DaySchedule = { dayOfWeek: number; startMin: number; endMin: number };

/** e.g. "شنبه ۱۰:۰۰ تا ۱۸:۰۰ · چهارشنبه ۱۲:۰۰ تا ۱۵:۰۰" */
export function formatSchedules(schedules: DaySchedule[]): string {
  const byDay = new Map(schedules.map((s) => [s.dayOfWeek, s]));
  return WEEK_DAYS.filter((d) => byDay.has(d.value))
    .map((d) => {
      const s = byDay.get(d.value)!;
      return `${d.label} ${formatHour(s.startMin)} تا ${formatHour(s.endMin)}`;
    })
    .join(" · ");
}
