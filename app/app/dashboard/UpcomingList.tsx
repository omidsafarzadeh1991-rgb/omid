import { cancelManualAppointmentAction } from "@/app/actions/booking";
import SourceBadge from "./SourceBadge";

type UpcomingAppointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  serviceName: string | null;
  startTime: Date;
  source: string;
  doctor: { name: string };
};

function dayKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function dayLabel(date: Date, todayKey: string, tomorrowKey: string): string {
  const key = dayKey(date);
  if (key === todayKey) return "امروز";
  if (key === tomorrowKey) return "فردا";
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function groupByDay(appointments: UpcomingAppointment[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dayKey(today);
  const tomorrowKey = dayKey(new Date(today.getTime() + 24 * 60 * 60_000));

  const groups: { key: string; label: string; items: UpcomingAppointment[] }[] = [];
  for (const appt of appointments) {
    const key = dayKey(appt.startTime);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.key === key) {
      lastGroup.items.push(appt);
    } else {
      groups.push({ key, label: dayLabel(appt.startTime, todayKey, tomorrowKey), items: [appt] });
    }
  }
  return groups;
}

export default function UpcomingList({ appointments }: { appointments: UpcomingAppointment[] }) {
  if (appointments.length === 0) {
    return <p className="text-sm text-slate-500">نوبتی ثبت نشده است.</p>;
  }

  const groups = groupByDay(appointments);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-2 text-xs font-semibold text-slate-400">{group.label}</p>
          <ul className="space-y-2">
            {group.items.map((appt) => (
              <li
                key={appt.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(15,23,42,0.25)]"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium text-slate-800">
                      {appt.patientName}{" "}
                      <span className="text-xs text-slate-400">({appt.patientPhone})</span>
                    </p>
                    <SourceBadge source={appt.source} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {appt.doctor.name} —{" "}
                    {new Intl.DateTimeFormat("fa-IR", { timeStyle: "short" }).format(appt.startTime)}
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
        </div>
      ))}
    </div>
  );
}
