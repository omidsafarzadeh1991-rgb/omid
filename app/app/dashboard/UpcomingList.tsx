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
    <div className="space-y-7">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="eyebrow mb-3">{group.label}</p>
          <ul className="timeline space-y-3">
            {group.items.map((appt) => (
              <li key={appt.id} className="relative">
                <span className="timeline-dot" />
                <div className="surface flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="stat-value text-base">
                        {new Intl.DateTimeFormat("fa-IR", { timeStyle: "short" }).format(
                          appt.startTime
                        )}
                      </span>
                      <p className="truncate font-medium text-slate-800">
                        {appt.patientName}{" "}
                        <span className="text-xs text-slate-400">({appt.patientPhone})</span>
                      </p>
                      <SourceBadge source={appt.source} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {appt.doctor.name}
                      {appt.serviceName && <> · {appt.serviceName}</>}
                    </p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await cancelManualAppointmentAction(appt.id);
                    }}
                  >
                    <button type="submit" className="btn-ghost">
                      لغو
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
