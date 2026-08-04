import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listWaitlist } from "@/lib/waitlist";
import { getSlotsForDay } from "@/lib/booking";
import { removeFromWaitlistAction } from "@/app/actions/waitlist";
import EmptyState from "../EmptyState";

function dateParam(day: Date): string {
  return day.toISOString().slice(0, 10);
}

export default async function WaitlistPage() {
  const session = await requireSession();
  const entries = await listWaitlist(session.clinicId);

  const freeCounts = await Promise.all(
    entries.map(async (entry) => {
      const slots = await getSlotsForDay(session.clinicId, entry.doctorId, entry.day);
      return slots.filter((s) => s.isFree).length;
    })
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <p className="eyebrow mb-1">لیست انتظار</p>
        <h1 className="text-xl font-bold text-slate-900">بیمارانی که منتظر یک روز پر هستند</h1>
        <p className="mt-1 text-sm text-slate-500">
          این‌جا هیچ پیامکی به‌صورت خودکار ارسال نمی‌شود؛ وقتی می‌بینید ظرفیت آن روز خالی شده،
          خودتان با بیمار تماس بگیرید و نوبت را ثبت کنید.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="لیست انتظار خالی است"
          subtitle="وقتی روزی برای یک پزشک پر باشد، از صفحهٔ ثبت نوبت می‌توانید بیمار را به این لیست اضافه کنید."
        />
      ) : (
        <section className="surface animate-in p-6">
          <ul className="divide-y divide-slate-100">
            {entries.map((entry, i) => {
              const freeCount = freeCounts[i];
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {entry.patientName}{" "}
                      <span className="text-xs text-slate-400" dir="ltr">
                        ({entry.patientPhone})
                      </span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {entry.doctor.name} ·{" "}
                      {new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" }).format(entry.day)}
                      {entry.serviceName && <> · {entry.serviceName}</>}
                    </p>
                    <p className={`mt-1 text-xs ${freeCount > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                      {freeCount > 0 ? `الان ${freeCount} وقت خالی در این روز هست` : "هنوز وقت خالی نیست"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/book/${entry.doctorId}?date=${dateParam(entry.day)}&name=${encodeURIComponent(entry.patientName)}&phone=${encodeURIComponent(entry.patientPhone)}&waitlistId=${entry.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      ثبت نوبت
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await removeFromWaitlistAction(entry.id);
                      }}
                    >
                      <button type="submit" className="btn-ghost">
                        حذف
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
