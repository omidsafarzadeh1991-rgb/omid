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

export function formatWorkDays(workDays: string): string {
  const values = workDays.split(",").map(Number);
  return WEEK_DAYS.filter((d) => values.includes(d.value))
    .map((d) => d.label)
    .join("، ");
}
